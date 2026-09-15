import fs from 'node:fs';
import path from 'node:path';

const load = (locale: string) =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/i18n/messages', `${locale}.json`), 'utf8'));

const messages = { es: load('es'), en: load('en') };
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Matches a message's text in either locale, read from the same files the app
 * uses, so a copy change does not break the test. Only for plain messages, not
 * ICU plurals.
 */
export function text(key: string): RegExp {
  const pick = (catalog: unknown) =>
    key.split('.').reduce<any>((node, part) => (node == null ? undefined : node[part]), catalog);
  const values = [pick(messages.es), pick(messages.en)].filter((v): v is string => typeof v === 'string');
  if (values.length === 0) throw new Error(`i18n key not found: ${key}`);
  return new RegExp(values.map(escape).join('|'), 'i');
}
