/**
 * Convert a string to Title Case (e.g. "hello world" -> "Hello World")
 */
export function toTitleCase(str: string): string {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Normalize a location string (trim and Title Case)
 */
export function normalizeLocation(location: string): string {
  if (!location) return '';
  return toTitleCase(location.trim());
}

export function formatDate(timestamp: number, format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'): string {
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
    default:
      return `${month}/${day}/${year}`;
  }
}
