import { safeParseFloworaFile, type Diagram } from '@flowora/shared';

/** Trigger a browser download of a text blob. */
export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  downloadUrl(url, filename);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Trigger a browser download of a data URL (PNG/SVG export). */
export function downloadUrl(url: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function slugifyName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'diagram';
}

/** Download the editable .flowora.json file for a diagram. */
export function downloadFloworaFile(diagram: Diagram): void {
  const file = { format: 'flowora', schemaVersion: 1, diagram };
  downloadTextFile(
    `${slugifyName(diagram.name)}.flowora.json`,
    JSON.stringify(file, null, 2),
    'application/json',
  );
}

/** Read + validate a user-picked .flowora.json file. */
export async function readFloworaFile(
  file: File,
): Promise<{ ok: true; diagram: Diagram } | { ok: false; error: string }> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: 'Could not read that file.' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  const result = safeParseFloworaFile(parsed);
  if (!result.ok) {
    return { ok: false, error: `Not a valid Flowora diagram: ${result.error}` };
  }
  return { ok: true, diagram: result.diagram };
}
