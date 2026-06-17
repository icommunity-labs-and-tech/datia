import { describe, it, expect } from 'vitest';
import { decodeUrlParam } from '../decode-param';

describe('decodeUrlParam', () => {
  it('should decode a URL-encoded string with spaces', () => {
    const encoded = 'bater%C3%ADa%20-%20123456';
    const result = decodeUrlParam(encoded);
    expect(result).toBe('batería - 123456');
  });

  it('should handle already decoded strings', () => {
    const decoded = 'batería - 123456';
    const result = decodeUrlParam(decoded);
    expect(result).toBe('batería - 123456');
  });

  it('should handle double-encoded strings', () => {
    // This is what we saw in the terminal: bater%25C3%25ADa%2520-%2520123456
    const doubleEncoded = 'bater%25C3%25ADa%2520-%2520123456';
    const result = decodeUrlParam(doubleEncoded);
    // Should decode fully to the original string
    expect(result).toBe('batería - 123456');
  });

  it('should handle simple alphanumeric IDs', () => {
    const simple = 'ITEM-001';
    const result = decodeUrlParam(simple);
    expect(result).toBe('ITEM-001');
  });

  it('should handle IDs with special characters', () => {
    const special = 'product%2F123%2Fversion';
    const result = decodeUrlParam(special);
    expect(result).toBe('product/123/version');
  });

  it('should handle empty string', () => {
    const empty = '';
    const result = decodeUrlParam(empty);
    expect(result).toBe('');
  });

  it('should handle malformed URI gracefully', () => {
    // Malformed URIs should return the original value
    const malformed = '%E0%A4%A';
    const result = decodeUrlParam(malformed);
    expect(result).toBe(malformed);
  });

  it('should handle IDs with plus signs', () => {
    const withPlus = 'item+123';
    const result = decodeUrlParam(withPlus);
    expect(result).toBe('item+123');
  });

  it('should decode encoded special characters', () => {
    const encoded = 'test%40example%23item';
    const result = decodeUrlParam(encoded);
    expect(result).toBe('test@example#item');
  });
});

