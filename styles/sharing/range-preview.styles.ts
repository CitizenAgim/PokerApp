import { StyleSheet } from 'react-native';

export const getThemeColors = (isDark: boolean) => ({
  background: isDark ? '#000' : '#f5f5f5',
  modalBackground: isDark ? '#1c1c1e' : '#fff',
  card: isDark ? '#2c2c2e' : '#f8f8f8',
  text: isDark ? '#fff' : '#333',
  subText: isDark ? '#aaa' : '#888',
  border: isDark ? '#333' : '#e0e0e0',
  accent: '#0a7ea4',
  success: '#27ae60',
  tabBg: isDark ? '#2c2c2e' : '#f0f0f0',
  tabActiveBg: '#0a7ea4',
  tabText: isDark ? '#aaa' : '#666',
  tabActiveText: '#fff',
  tabDeselectedBg: isDark ? '#1c1c1e' : '#e8e8e8',
  tabDeselectedText: isDark ? '#666' : '#999',
  checkboxBg: isDark ? '#3a3a3c' : '#e0e0e0',
  checkboxCheckedBg: '#0a7ea4',
  emptyStateBg: isDark ? '#2c2c2e' : '#f5f5f5',
  bulkActionBg: isDark ? '#2c2c2e' : '#f0f0f0',
});

export const styles = StyleSheet.create({
  // ============================================
  // MODAL CONTAINER
  // ============================================

  modalContainer: {
    flex: 1,
  },

  // ============================================
  // HEADER
  // ============================================

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
    marginLeft: 16,
  },

  // ============================================
  // RANGE SELECTOR (TABS)
  // ============================================

  selectorContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  selectorScroll: {
    paddingHorizontal: 16,
  },
  selectorScrollContent: {
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  tabActive: {
    // backgroundColor set dynamically
  },
  tabDeselected: {
    opacity: 0.6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabTextActive: {
    fontWeight: '600',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  checkboxChecked: {
    borderWidth: 0,
  },

  // ============================================
  // SELECTION SUMMARY
  // ============================================

  selectionSummary: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  selectionSummaryText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ============================================
  // BULK ACTIONS
  // ============================================

  bulkActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  bulkActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bulkActionText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // ============================================
  // CONTENT AREA
  // ============================================

  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // ============================================
  // RANGE DISPLAY
  // ============================================

  rangeSection: {
    marginBottom: 16,
  },
  rangeSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  gridWrapper: {
    alignItems: 'center',
    paddingVertical: 8,
  },

  // ============================================
  // EMPTY STATE
  // ============================================

  emptyRangeContainer: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  emptyRangeText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },

  // ============================================
  // FOOTER
  // ============================================

  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  acceptButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    opacity: 0.5,
  },
  acceptButtonText: {
    fontWeight: '600',
    fontSize: 16,
    color: '#fff',
  },
  closeButtonFooter: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },

  // ============================================
  // INFO BOX
  // ============================================

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
