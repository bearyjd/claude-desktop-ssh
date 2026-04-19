import * as Haptics from 'expo-haptics';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionResultEvent,
  type ExpoSpeechRecognitionErrorEvent,
} from 'expo-speech-recognition';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

interface VoiceButtonProps {
  onTranscript: (text: string, isFinal: boolean) => void;
  disabled?: boolean;
}

export function VoiceButton({ onTranscript, disabled }: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const started = useRef(false);

  const startPulse = () => {
    pulseAnim.setValue(1);
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  };

  const stopPulse = () => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  };

  const stopListening = useCallback(async () => {
    if (!started.current) return;
    started.current = false;
    try { ExpoSpeechRecognitionModule.stop(); } catch {}
    setIsListening(false);
    stopPulse();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  // stable refs and setters only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useSpeechRecognitionEvent('result', (event: ExpoSpeechRecognitionResultEvent) => {
    const transcript = event.results[0]?.transcript;
    if (transcript) onTranscript(transcript, event.isFinal);
    if (event.isFinal) stopListening();
  });

  useSpeechRecognitionEvent('error', (event: ExpoSpeechRecognitionErrorEvent) => {
    setErrMsg(event.error);
    setTimeout(() => setErrMsg(''), 3000);
    stopListening();
  });

  useSpeechRecognitionEvent('end', () => {
    stopListening();
  });

  useEffect(() => {
    return () => {
      if (started.current) ExpoSpeechRecognitionModule.stop();
    };
  }, []);

  const startListening = async () => {
    setErrMsg('');
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      setErrMsg('mic denied');
      setTimeout(() => setErrMsg(''), 3000);
      return;
    }
    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        maxAlternatives: 1,
      });
      started.current = true;
      setIsListening(true);
      startPulse();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrMsg(msg.slice(0, 30));
      setTimeout(() => setErrMsg(''), 3000);
    }
  };

  return (
    <View>
      <Pressable
        onPressIn={startListening}
        onPressOut={stopListening}
        disabled={disabled}
        style={({ pressed }: { pressed: boolean }) => [
          styles.btn,
          pressed && styles.btnPressed,
          isListening && styles.btnActive,
          disabled && styles.btnDisabled,
        ]}
        hitSlop={8}
      >
        <Animated.View style={[
          styles.ripple,
          isListening && styles.rippleActive,
          { transform: [{ scale: pulseAnim }] },
        ]} />
        <Text style={[styles.icon, isListening && styles.iconActive]}>
          {isListening ? '⏹' : '⏺'}
        </Text>
      </Pressable>
      {errMsg.length > 0 && <Text style={styles.err}>{errMsg}</Text>}
    </View>
  );
}

// Claude coral: #DA7756  Claude tan: #C4A882
const styles = StyleSheet.create({
  btn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: '#C4A882',
    backgroundColor: '#0d0d0d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: { backgroundColor: '#1a1008' },
  btnActive: { borderColor: '#DA7756' },
  btnDisabled: { opacity: 0.35 },
  ripple: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'transparent',
  },
  rippleActive: { backgroundColor: 'rgba(218, 119, 86, 0.15)' },
  icon: { fontSize: 26, color: '#C4A882' },
  iconActive: { color: '#DA7756' },
  err: { color: '#DA7756', fontSize: 10, textAlign: 'center', marginTop: 2 },
});
