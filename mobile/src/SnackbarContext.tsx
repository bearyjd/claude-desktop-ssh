// Copyright (C) 2025 Entrevoix, Inc.
// SPDX-License-Identifier: AGPL-3.0-only

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Snackbar } from 'react-native-paper';

interface SnackbarContextValue {
  showSnackbar: (message: string) => void;
}

const SnackbarContext = createContext<SnackbarContextValue>({ showSnackbar: () => {} });

export function useSnackbar(): SnackbarContextValue {
  return useContext(SnackbarContext);
}

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const queue = useRef<string[]>([]);

  const showNext = useCallback(() => {
    if (queue.current.length > 0) {
      setMessage(queue.current.shift()!);
      setVisible(true);
    }
  }, []);

  const showSnackbar = useCallback((msg: string) => {
    if (visible) {
      queue.current.push(msg);
    } else {
      setMessage(msg);
      setVisible(true);
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setTimeout(showNext, 150);
  }, [showNext]);

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <Snackbar
        visible={visible}
        onDismiss={handleDismiss}
        duration={3000}
        action={{ label: 'OK', onPress: handleDismiss }}
      >
        {message}
      </Snackbar>
    </SnackbarContext.Provider>
  );
}
