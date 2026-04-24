// Copyright (C) 2025 Entrevoix, Inc.
// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback, useEffect, useRef, useState } from 'react';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
}

interface UseTokenPollingResult extends TokenUsage {
  update: (input: number, output: number, cache: number) => void;
}

const POLL_INTERVAL_MS = 5_000;
const EMPTY: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheTokens: 0 };

export function useTokenPolling(
  sendGetTokenUsage: (() => void) | null,
  sessionRunning: boolean,
): UseTokenPollingResult {
  const [usage, setUsage] = useState<TokenUsage>(EMPTY);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    clear();
    if (!sessionRunning || !sendGetTokenUsage) {
      setUsage(EMPTY);
      return clear;
    }

    sendGetTokenUsage();
    intervalRef.current = setInterval(sendGetTokenUsage, POLL_INTERVAL_MS);
    return clear;
  }, [sessionRunning, sendGetTokenUsage, clear]);

  const update = useCallback((input: number, output: number, cache: number) => {
    setUsage({ inputTokens: input, outputTokens: output, cacheTokens: cache });
  }, []);

  return { ...usage, update };
}
