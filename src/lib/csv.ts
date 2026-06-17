export interface ParsedCsvRow {
  line: number;
  values: Record<string, string>;
}

export function parseCsv(text: string): ParsedCsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows: ParsedCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const lineText = lines[i];
    if (!lineText.trim()) continue;
    const cols = splitCsvLine(lineText);
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = cols[idx] ?? '';
    });
    rows.push({ line: i + 1, values: record });
  }

  return rows;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === ',') {
        result.push(current);
        current = '';
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        current += ch;
      }
    }
  }

  result.push(current);
  return result;
}




