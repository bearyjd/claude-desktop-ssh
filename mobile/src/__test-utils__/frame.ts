// Copyright (C) 2025 Entrevoix, Inc.
// SPDX-License-Identifier: AGPL-3.0-only

import { EventFrame } from '../types';

export function frame(seq: number, event: EventFrame['event']): EventFrame {
  return { seq, ts: 1000 + seq, event };
}
