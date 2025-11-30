import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// ============================================
// TYPES
// ============================================

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastState extends ToastConfig {
  id: string;
}

// ============================================
// TOAST CONTEXT
// ============================================

type ToastFn = (config: ToastConfig | string) => void;

let toastHandler: ToastFn | null = null;

export const toast = {
  show: (config: ToastConfig | string) => {
    if (toastHandler) {
      toastHandler(config);
    }
  },
  success: (message: string) => {
    toast.show({ message, type: 'success' });
  },
  error: (message: string) => {
    toast.show({ message, type: 'error' });
  },
  warning: (message: string) => {
    toast.show({ message, type: 'warning' });
  },
  info: (message: string) => {
    toast.show({ message, type: 'info' });
  },
};

// ============================================
// SINGLE TOAST COMPONENT
// ============================================

interface ToastItemProps {
  toast: ToastState;
  onHide: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onHide }) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Haptic feedback based on type
    if (toast.type === 'success') {
      haptics.successFeedback();
    } else if (toast.type === 'error') {
      haptics.errorFeedback();
    } else if (toast.type === 'warning') {
      haptics.warningFeedback();
    } else {
      haptics.lightTap();
    }

    // Auto hide
    const timer = setTimeout(() => {
      hideToast();
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, []);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide(toast.id);
    });
  };

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (toast.type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'alert-circle';
      case 'warning': return 'warning';
      case 'info': return 'information-circle';
      default: return 'information-circle';
    }
  };

  const getColors = () => {
    switch (toast.type) {
      case 'success':
        return { bg: '#e8f5e9', border: '#27ae60', icon: '#27ae60' };
      case 'error':
        return { bg: '#ffebee', border: '#e74c3c', icon: '#e74c3c' };
      case 'warning':
        return { bg: '#fff8e1', border: '#f39c12', icon: '#f39c12' };
      case 'info':
      default:
        return { bg: '#e3f2fd', border: '#0a7ea4', icon: '#0a7ea4' };
    }
  };

  const colors = getColors();

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: colors.bg,
          borderLeftColor: colors.border,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Ionicons name={getIcon()} size={22} color={colors.icon} />
      <Text style={styles.message} numberOfLines={2}>
        {toast.message}
      </Text>
      {toast.action && (
        <TouchableOpacity
          style={styles.action}
          onPress={() => {
            toast.action?.onPress();
            hideToast();
          }}
        >
          <Text style={[styles.actionText, { color: colors.border }]}>
            {toast.action.label}
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
        <Ionicons name="close" size={18} color="#999" />
      </TouchableOpacity>
    </Animated.View>
  );
};

// ============================================
// TOAST PROVIDER COMPONENT
// ============================================

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const showToast = useCallback((config: ToastConfig | string) => {
    const newToast: ToastState = {
      id: Date.now().toString(),
      ...(typeof config === 'string' ? { message: config } : config),
    };
    setToasts(prev => [...prev, newToast]);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    toastHandler = showToast;
    return () => {
      toastHandler = null;
    };
  }, [showToast]);

  return (
    <View style={styles.container}>
      {children}
      <View style={styles.toastContainer} pointerEvents="box-none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onHide={hideToast} />
        ))}
      </View>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    gap: 10,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  action: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
});

export default ToastProvider;
