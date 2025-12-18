import { Ionicons } from '@expo/vector-icons';
import { Component, ErrorInfo, ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getThemeColors, styles } from './ErrorBoundary.styles';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryClass extends Component<Props & { isDark: boolean }, State> {
  constructor(props: Props & { isDark: boolean }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { isDark } = this.props;
      const colors = getThemeColors(isDark);

      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.iconContainer}>
            <Ionicons name="warning-outline" size={64} color={colors.icon} />
          </View>
          <Text style={[styles.title, { color: colors.title }]}>Something went wrong</Text>
          <Text style={[styles.message, { color: colors.message }]}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.buttonBg }]} 
            onPress={this.handleRetry}
          >
            <Ionicons name="refresh" size={20} color={colors.buttonText} />
            <Text style={[styles.retryText, { color: colors.buttonText }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary(props: Props) {
  const colorScheme = useColorScheme();
  return <ErrorBoundaryClass {...props} isDark={colorScheme === 'dark'} />;
}
