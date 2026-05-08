/**
 * Returns a color code based on the confidence percentage.
 * @param {number} conf - Confidence score (0-100)
 * @returns {string} - CSS color variable or hex code
 */
export const getConfidenceColor = (conf) => {
  if (conf >= 80) return 'var(--accent-color)';
  if (conf >= 60) return '#f59e0b';
  return 'var(--danger)';
};

/**
 * Normalizes an image URL, handling local uploads and external links.
 * @param {string} url - The raw image URL
 * @returns {string} - The processed URL
 */
export const normalizeImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('/uploads')) {
    // In dev, Vite proxy handles /api, but static /uploads might need direct server access
    // or proxying. Assuming proxy handles /uploads too if configured in server.js.
    return url; 
  }
  return url;
};
