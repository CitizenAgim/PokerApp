import { useColorScheme } from '@/hooks/use-color-scheme';
import { haptics } from '@/utils/haptics';
import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// ============================================
// TYPES
// ============================================

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const getThemeColors = (isDark: boolean) => ({
  overlay: 'rgba(0, 0, 0, 0.5)',
  dialogBg: isDark ? '#1c1c1e' : '#fff',
  title: isDark ? '#FFFFFF' : '#333',
  message: isDark ? '#AAAAAA' : '#666',
  cancelButton: isDark ? '#333333' : '#f0f0f0',
  cancelText: isDark ? '#FFFFFF' : '#666',
  confirmButton: '#0a7ea4',
  destructiveButton: '#e74c3c',
  confirmText: '#fff',
});

// ============================================
// COMPONENT
// ============================================

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);

  const handleConfirm = () => {
    if (confirmDestructive) {
      haptics.warningFeedback();
    } else {
      haptics.successFeedback();
    }
    onConfirm();
  };

  const handleCancel = () => {
    haptics.lightTap();
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: colors.dialogBg }]}>
          <Text style={[styles.title, { color: colors.title }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.message }]}>{message}</Text>
          
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.cancelButton }]}
              onPress={handleCancel}
            >
              <Text style={[styles.cancelText, { color: colors.cancelText }]}>{cancelText}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: confirmDestructive ? colors.destructiveButton : colors.confirmButton },
              ]}
              onPress={handleConfirm}
            >
              <Text
                style={[
                  styles.confirmText,
                  { color: colors.confirmText },
                ]}
              >
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {
    backgroundColor: '#0a7ea4',
  },
  destructiveButton: {
    backgroundColor: '#e74c3c',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  destructiveText: {
    color: '#fff',
  },
});

export default ConfirmDialog;
