/** Lowercase, unaccented, article first: how people type a place name. */
export function normalizePlace(name: string): string {
  const plain = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  // "campillo, el" → "el campillo"
  const m = plain.match(/^(.+), (la|el|los|las|a|o|os|as|l'|les|els|es|sa)$/);
  if (!m) return plain;
  return m[2].endsWith("'") ? `${m[2]}${m[1]}` : `${m[2]} ${m[1]}`;
}
