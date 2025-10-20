/**
 * Centralized variant formatter that handles multiple storage formats:
 * - Objects: {size: "Medium", color: "Red"}
 * - JSON strings: '{"size":"Medium","color":"Red"}'
 * - Plain strings: "Medium / Red" (legacy data)
 */

export function formatVariant(variant: any): string | null {
  if (!variant) return null;

  // If it's already a formatted string, return it
  if (typeof variant === 'string') {
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(variant);
      if (typeof parsed === 'object' && parsed !== null) {
        // It was a JSON string, format the object
        const parts = [];
        if (parsed.size) parts.push(parsed.size);
        if (parsed.color) parts.push(parsed.color);
        return parts.length > 0 ? parts.join(' / ') : variant; // Fallback to original string
      }
    } catch {
      // Not JSON, just return the string as-is (legacy format)
      return variant;
    }
    return variant;
  }

  // If it's an object, format it
  if (typeof variant === 'object' && variant !== null) {
    const parts = [];
    if (variant.size) parts.push(variant.size);
    if (variant.color) parts.push(variant.color);
    return parts.length > 0 ? parts.join(' / ') : null;
  }

  return null;
}
