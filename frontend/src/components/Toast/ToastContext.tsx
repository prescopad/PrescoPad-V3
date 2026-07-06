import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

type ToastType = 'success' | 'error' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
}

const DURATIONS: Record<ToastType, number> = {
  success: 3000,
  warning: 3500,
  error: 4500,
};

const ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  warning: 'warning',
};

const COLOR_MAP: Record<ToastType, { bg: string; fg: string }> = {
  success: { bg: COLORS.successLight, fg: COLORS.success },
  error: { bg: COLORS.errorLight, fg: COLORS.error },
  warning: { bg: COLORS.warningLight, fg: COLORS.warning },
};

const ToastContext = createContext<ToastContextValue | null>(null);

function ToastEntry({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const colors = COLOR_MAP[item.type];

  React.useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(onDismiss);
    }, DURATIONS[item.type]);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.toast, { backgroundColor: colors.bg, opacity, borderLeftColor: colors.fg }]}>
      <Ionicons name={ICONS[item.type]} size={20} color={colors.fg} />
      <Text style={styles.message} numberOfLines={3}>{item.message}</Text>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type: ToastType, message: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const value: ToastContextValue = {
    success: (message) => push('success', message),
    error: (message) => push('error', message),
    warning: (message) => push('warning', message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <SafeAreaView style={styles.viewport} pointerEvents="box-none">
        {toasts.map((t) => (
          <ToastEntry key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </SafeAreaView>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderLeftWidth: 4,
    marginTop: SPACING.sm,
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
});
