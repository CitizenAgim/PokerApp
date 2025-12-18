export const getCurrencySymbol = (currencyCode?: string): string => {
  switch (currencyCode) {
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'USD':
    default:
      return '$';
  }
};
