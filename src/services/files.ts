import { getDocumentAsync } from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';

import type { FilePayload } from '@/services/brightpath';

// Native (Android/iOS) file handling. The web version is files.web.ts.

const SPREADSHEET_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

/** Lets the user pick an Excel file; returns its name and contents as base64, or null if they cancel. */
export async function pickSpreadsheet(): Promise<{ name: string; base64: string } | null> {
  const result = await getDocumentAsync({ type: SPREADSHEET_TYPES, copyToCacheDirectory: true });
  if (result.canceled) return null;
  const asset = result.assets[0];
  return { name: asset.name, base64: await new File(asset.uri).base64() };
}

/** Saves a generated file to the cache and opens the share sheet (Save to Files, Drive, email, print…). */
export async function saveFile({ filename, mimeType, base64 }: FilePayload) {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(base64, { encoding: 'base64' });
  await shareAsync(file.uri, { mimeType, dialogTitle: filename });
}
