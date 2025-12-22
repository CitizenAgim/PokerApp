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
