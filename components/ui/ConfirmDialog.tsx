import { useColorScheme } from '@/hooks/use-color-scheme';
import { haptics } from '@/utils/haptics';
import React from 'react';
import {
    Modal,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { getThemeColors, styles } from './ConfirmDialog.styles';

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

export default ConfirmDialog;
