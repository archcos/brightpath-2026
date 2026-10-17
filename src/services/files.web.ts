import { getDocumentAsync } from 'expo-document-picker';

import type { FilePayload } from '@/services/brightpath';

// Web file handling: the browser's file picker and a normal download.

const SPREADSHEET_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

/** "data:…;base64,AAAA" → "AAAA". */
export const stripDataUrl = (value: string) => value.replace(/^data:[^,]*,/, '');

export async function pickSpreadsheet(): Promise<{ name: string; base64: string } | null> {
  const result = await getDocumentAsync({ type: SPREADSHEET_TYPES, base64: true });
  if (result.canceled) return null;
  const asset = result.assets[0];
  return { name: asset.name, base64: stripDataUrl(asset.base64 ?? asset.uri) };
}

export async function saveFile({ filename, mimeType, base64 }: FilePayload) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
