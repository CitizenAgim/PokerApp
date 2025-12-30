import { StyleSheet } from 'react-native';

export const getThemeColors = (isDark: boolean) => ({
  background: isDark ? '#000' : '#f5f5f5',
  card: isDark ? '#1c1c1e' : '#fff',
  text: isDark ? '#fff' : '#333',
  subText: isDark ? '#aaa' : '#666',
  border: isDark ? '#333' : '#e0e0e0',
  actionButtonBg: isDark ? '#1a2a3a' : '#f0f9ff',
  actionButtonDisabledBg: isDark ? '#1c1c1e' : '#e0e0e0',
  icon: isDark ? '#aaa' : '#666',
  tint: '#2196f3',
  success: '#4caf50',
  warning: '#ff9800',
});

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  backButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  settingsLabel: {
    fontSize: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionDisplay: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    minHeight: 50,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionSubtext: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
    borderTopWidth: 1,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressText: {
    fontSize: 14,
  },
  streetBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streetText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  winnerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  winnerCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 300,
    width: '100%',
  },
  winnerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  winnerName: {
    fontSize: 18,
    marginBottom: 4,
  },
  winnerAmount: {
    fontSize: 20,
    fontWeight: '600',
  },
  dismissButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  dismissButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sessionInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  sessionInfoText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
