#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="${PROJECT_ROOT}/flatpak-build"

echo "[navetted-build] Starting Flatpak build process..."
echo "[navetted-build] Project root: $PROJECT_ROOT"
echo "[navetted-build] Build directory: $BUILD_DIR"

# Step 1: Vendor crates if not already vendored
if [ ! -d "$PROJECT_ROOT/vendor" ]; then
    echo "[navetted-build] Vendoring crates..."
    cd "$PROJECT_ROOT"
    cargo vendor vendor/
    echo "[navetted-build] Crates vendored successfully"
else
    echo "[navetted-build] Vendor directory already exists, skipping vendor step"
fi

# Step 2: Create .cargo/config.toml for offline builds
echo "[navetted-build] Creating .cargo/config.toml for offline builds..."
mkdir -p "$PROJECT_ROOT/.cargo-home"
cat > "$PROJECT_ROOT/.cargo-home/config.toml" << 'EOF'
[source.crates-io]
replace-with = "vendored-sources"

[source.vendored-sources]
directory = "vendor"
EOF

# Step 3: Build with offline mode
echo "[navetted-build] Building with cargo (offline mode)..."
cd "$PROJECT_ROOT"
CARGO_HOME="$(pwd)/.cargo-home" cargo build --release --offline

# Step 4: Create build output directory
mkdir -p "$BUILD_DIR"

# Step 5: Copy binaries
echo "[navetted-build] Copying binaries to $BUILD_DIR..."
install -Dm755 target/release/navetted "$BUILD_DIR/navetted"
install -Dm755 target/release/navetted-hook "$BUILD_DIR/navetted-hook"

echo "[navetted-build] Build complete!"
echo "[navetted-build] Binaries available at:"
echo "[navetted-build]   - $BUILD_DIR/navetted"
echo "[navetted-build]   - $BUILD_DIR/navetted-hook"
