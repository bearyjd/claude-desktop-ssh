mod claude;
mod config;
mod db;
mod hook;
mod ws;

use std::{collections::HashMap, sync::Arc};
use std::sync::atomic::{AtomicBool, Ordering};

use anyhow::Result;
use tokio::sync::{broadcast, mpsc, oneshot, Mutex};

/// Shared map: tool_use_id → oneshot sender waiting for a user decision.
pub type PendingApprovals = Arc<Mutex<HashMap<String, oneshot::Sender<Decision>>>>;

/// Decisions that arrived from a WS client before the hook registered its slot.
/// The hook checks this map first so early approvals aren't lost.
pub type BufferedDecisions = Arc<Mutex<HashMap<String, Decision>>>;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Decision {
    Allow,
    Deny,
}

/// Sent from a WS client to start a claude session.
pub struct RunRequest {
    pub prompt: String,
    /// If set, runs inside `distrobox-enter --name <container> --`.
    pub container: Option<String>,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let cfg = config::load_or_create()?;
    tracing::info!(ws_port = cfg.ws_port, "config loaded");

    let db = Arc::new(std::sync::Mutex::new(db::open()?));
    let pending: PendingApprovals = Arc::new(Mutex::new(HashMap::new()));
    let buffered: BufferedDecisions = Arc::new(Mutex::new(HashMap::new()));
    let session_running = Arc::new(AtomicBool::new(false));

    // Broadcast channel: (seq, unix_ts, raw_json) — 4096 slot buffer per subscriber
    let (events_tx, _) = broadcast::channel::<(i64, f64, String)>(4096);

    // Channel for run requests from WS clients (buffer=1: only one session at a time)
    let (run_tx, mut run_rx) = mpsc::channel::<RunRequest>(1);

    // Hook socket — must be running before Claude is spawned
    tokio::spawn(hook::serve(pending.clone(), buffered.clone()));

    // WebSocket server
    tokio::spawn(ws::serve(
        cfg.ws_port,
        cfg.token.clone(),
        db.clone(),
        pending.clone(),
        buffered.clone(),
        events_tx.clone(),
        run_tx,
        session_running.clone(),
    ));

    // Stdin fallback approvals (useful for debugging without a WS client)
    tokio::spawn(read_stdin_approvals(pending.clone()));

    tracing::info!("clauded ready — waiting for run requests");

    // Session loop: one session at a time
    while let Some(req) = run_rx.recv().await {
        session_running.store(true, Ordering::SeqCst);

        let ts = unix_ts();
        let started_json = serde_json::to_string(&serde_json::json!({
            "type": "session_started",
            "container": req.container,
        }))?;
        let seq = {
            let conn = db.lock().unwrap();
            db::insert_event(&conn, ts, &started_json)?
        };
        let _ = events_tx.send((seq, ts, started_json));

        let result = claude::spawn_and_process(
            &req.prompt,
            req.container.as_deref(),
            db.clone(),
            pending.clone(),
            events_tx.clone(),
        )
        .await;

        if let Err(e) = &result {
            tracing::error!("session error: {e:#}");
        }

        session_running.store(false, Ordering::SeqCst);

        let ts = unix_ts();
        let ended_json = serde_json::to_string(&serde_json::json!({
            "type": "session_ended",
            "ok": result.is_ok(),
        }))?;
        let seq = {
            let conn = db.lock().unwrap();
            db::insert_event(&conn, ts, &ended_json)?
        };
        let _ = events_tx.send((seq, ts, ended_json));
    }

    Ok(())
}

/// Fallback: type "y <tool_use_id>" or "n <tool_use_id>" directly in the terminal.
async fn read_stdin_approvals(pending: PendingApprovals) {
    use tokio::io::{AsyncBufReadExt, BufReader};
    let mut lines = BufReader::new(tokio::io::stdin()).lines();

    while let Ok(Some(line)) = lines.next_line().await {
        let line = line.trim().to_string();
        let mut parts = line.splitn(2, ' ');
        let (cmd, id) = match (parts.next(), parts.next()) {
            (Some(c), Some(i)) => (c, i.trim()),
            _ => {
                eprintln!("usage: y <tool_use_id> | n <tool_use_id>");
                continue;
            }
        };
        let decision = if cmd == "y" {
            Decision::Allow
        } else {
            Decision::Deny
        };
        if let Some(tx) = pending.lock().await.remove(id) {
            let _ = tx.send(decision);
            tracing::info!("stdin approval: {} {}", cmd, id);
        } else {
            tracing::warn!("no pending approval for stdin input: {}", id);
        }
    }
}

fn unix_ts() -> f64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs_f64()
}
