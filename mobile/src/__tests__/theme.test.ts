// Copyright (C) 2025 Entrevoix, Inc.
// SPDX-License-Identifier: AGPL-3.0-only

import { getTheme, getSemanticColors, getEventTypeColors, getStatusColors, lightTheme, darkTheme } from '../theme';

describe('getTheme', () => {
  it('returns light theme when mode is light', () => {
    expect(getTheme('light', true)).toBe(lightTheme);
    expect(getTheme('light', false)).toBe(lightTheme);
  });

  it('returns dark theme when mode is dark', () => {
    expect(getTheme('dark', true)).toBe(darkTheme);
    expect(getTheme('dark', false)).toBe(darkTheme);
  });

  it('follows system preference when mode is system', () => {
    expect(getTheme('system', true)).toBe(darkTheme);
    expect(getTheme('system', false)).toBe(lightTheme);
  });
});

describe('getSemanticColors', () => {
  it('returns all required keys for light mode', () => {
    const colors = getSemanticColors(false);
    expect(colors).toHaveProperty('success');
    expect(colors).toHaveProperty('successContainer');
    expect(colors).toHaveProperty('onSuccessContainer');
    expect(colors).toHaveProperty('warning');
    expect(colors).toHaveProperty('warningContainer');
    expect(colors).toHaveProperty('onWarningContainer');
    expect(colors).toHaveProperty('info');
    expect(colors).toHaveProperty('infoContainer');
    expect(colors).toHaveProperty('onInfoContainer');
  });

  it('returns all required keys for dark mode', () => {
    const colors = getSemanticColors(true);
    expect(colors).toHaveProperty('success');
    expect(colors).toHaveProperty('successContainer');
    expect(colors).toHaveProperty('onSuccessContainer');
  });

  it('returns different values for light vs dark', () => {
    const light = getSemanticColors(false);
    const dark = getSemanticColors(true);
    expect(light.success).not.toBe(dark.success);
    expect(light.successContainer).not.toBe(dark.successContainer);
    expect(light.warning).not.toBe(dark.warning);
  });
});

describe('getEventTypeColors', () => {
  it('returns all event type keys', () => {
    const colors = getEventTypeColors(false);
    expect(colors).toHaveProperty('toolCall');
    expect(colors).toHaveProperty('assistant');
    expect(colors).toHaveProperty('result');
    expect(colors).toHaveProperty('system');
    expect(colors).toHaveProperty('done');
  });

  it('returns different values for light vs dark', () => {
    const light = getEventTypeColors(false);
    const dark = getEventTypeColors(true);
    expect(light.toolCall).not.toBe(dark.toolCall);
    expect(light.done).not.toBe(dark.done);
  });
});

describe('getStatusColors', () => {
  it('uses theme.colors.primary for connected', () => {
    const colors = getStatusColors(lightTheme, false);
    expect(colors.connected).toBe(lightTheme.colors.primary);
  });

  it('uses theme.colors.error for error', () => {
    const colors = getStatusColors(darkTheme, true);
    expect(colors.error).toBe(darkTheme.colors.error);
  });

  it('returns different connecting color for light vs dark', () => {
    const light = getStatusColors(lightTheme, false);
    const dark = getStatusColors(darkTheme, true);
    expect(light.connecting).not.toBe(dark.connecting);
  });
});

describe('theme objects', () => {
  it('lightTheme has expected background', () => {
    expect(lightTheme.colors.background).toBe('#FBF8FF');
  });

  it('darkTheme has expected background', () => {
    expect(darkTheme.colors.background).toBe('#121318');
  });

  it('both themes have elevation levels', () => {
    for (const theme of [lightTheme, darkTheme]) {
      expect(theme.colors.elevation.level0).toBe('transparent');
      expect(theme.colors.elevation.level1).toBeTruthy();
      expect(theme.colors.elevation.level5).toBeTruthy();
    }
  });
});
