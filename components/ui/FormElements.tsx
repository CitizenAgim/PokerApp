import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Text,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    View,
} from 'react-native';
import { getThemeColors, styles } from './FormElements.styles';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: object;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  secureTextEntry,
  ...props
}: InputProps) {
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [isFocused, setFocused] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);

  const isPassword = secureTextEntry !== undefined;
  const showPassword = isPassword && isPasswordVisible;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: colors.label }]}>{label}</Text>}
      
      <View
        style={[
          styles.inputContainer,
          { backgroundColor: colors.inputBg },
          isFocused && [styles.inputContainerFocused, { backgroundColor: colors.inputBgFocused, borderColor: colors.borderFocused }],
          error && [styles.inputContainerError, { backgroundColor: colors.inputBgError, borderColor: colors.borderError }],
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={error ? colors.borderError : isFocused ? colors.borderFocused : colors.icon}
            style={styles.leftIcon}
          />
        )}
        
        <TextInput
          style={[
            styles.input,
            { color: colors.inputText },
            leftIcon && styles.inputWithLeftIcon,
            (rightIcon || isPassword) && styles.inputWithRightIcon,
          ]}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        
        {isPassword && (
          <TouchableOpacity
            onPress={() => setPasswordVisible(!isPasswordVisible)}
            style={styles.rightIconButton}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color={colors.icon}
            />
          </TouchableOpacity>
        )}
        
        {!isPassword && rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIconButton}
            disabled={!onRightIconPress}
          >
            <Ionicons
              name={rightIcon}
              size={20}
              color={error ? colors.borderError : colors.icon}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color={colors.borderError} />
          <Text style={[styles.errorText, { color: colors.borderError }]}>{error}</Text>
        </View>
      )}
      
      {hint && !error && (
        <Text style={[styles.hintText, { color: colors.hint }]}>{hint}</Text>
      )}
    </View>
  );
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: object;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading,
  disabled,
  icon,
  style,
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);
  const isDisabled = disabled || loading;

  const getBackgroundColor = () => {
    if (isDisabled) return colors.btnDisabled;
    switch (variant) {
      case 'primary': return colors.btnPrimary;
      case 'secondary': return colors.btnSecondary;
      case 'danger': return colors.btnDanger;
      case 'ghost': return 'transparent';
      default: return colors.btnPrimary;
    }
  };

  const getTextColor = () => {
    if (isDisabled && variant !== 'ghost') return colors.btnTextDisabled;
    switch (variant) {
      case 'primary': return colors.btnTextPrimary;
      case 'secondary': return colors.btnTextSecondary;
      case 'danger': return colors.btnTextPrimary;
      case 'ghost': return isDisabled ? colors.btnTextDisabled : colors.btnPrimary;
      default: return colors.btnTextPrimary;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small': return { paddingVertical: 8, paddingHorizontal: 16 };
      case 'medium': return { paddingVertical: 12, paddingHorizontal: 20 };
      case 'large': return { paddingVertical: 16, paddingHorizontal: 24 };
      default: return { paddingVertical: 12, paddingHorizontal: 20 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small': return 14;
      case 'medium': return 16;
      case 'large': return 18;
      default: return 16;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        getPadding(),
        variant === 'ghost' && [styles.buttonGhost, { borderColor: colors.btnPrimary }],
        style,
      ]}
    >
      {loading ? (
        <Text style={[styles.buttonText, { color: getTextColor(), fontSize: getFontSize() }]}>
          Loading...
        </Text>
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={getFontSize() + 2}
              color={getTextColor()}
              style={styles.buttonIcon}
            />
          )}
          <Text style={[styles.buttonText, { color: getTextColor(), fontSize: getFontSize() }]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
