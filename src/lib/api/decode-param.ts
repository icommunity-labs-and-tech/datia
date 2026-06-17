/**
 * Safely decode a URL parameter that might contain special characters.
 * Next.js may partially decode parameters, so we attempt to decode iteratively
 * to handle cases where the ID contains spaces, special characters, etc.
 * 
 * This handles the case where URLs get double-encoded (e.g., when a URL is
 * copy-pasted or processed multiple times).
 * 
 * @param rawParam - The raw parameter value from Next.js params
 * @returns The decoded parameter value
 */
export function decodeUrlParam(rawParam: string): string {
  if (!rawParam) return rawParam;
  
  let decoded = rawParam;
  let previousValue = '';
  let iterations = 0;
  const maxIterations = 3; // Prevent infinite loops
  
  try {
    // Keep decoding until the value stops changing or we hit max iterations
    while (decoded !== previousValue && iterations < maxIterations) {
      previousValue = decoded;
      
      try {
        const nextDecoded = decodeURIComponent(decoded);
        // Only continue if decoding actually changed something
        if (nextDecoded !== decoded) {
          decoded = nextDecoded;
        } else {
          break;
        }
      } catch {
        // If decoding fails at any point, stop and use the last valid value
        break;
      }
      
      iterations++;
    }
    
    return decoded;
  } catch (e) {
    // If any unexpected error occurs, return the original value
    console.warn('[API] Failed to decode URL parameter:', rawParam, e);
    return rawParam;
  }
}

