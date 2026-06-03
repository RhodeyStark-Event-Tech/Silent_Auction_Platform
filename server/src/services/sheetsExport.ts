import { config } from '../config.js';
import type { WinnerRow } from './bidLogic.js';

/**
 * Push the aggregated winner rows to Google Sheets via a Google Apps Script
 * web-app webhook. The Apps Script clears and rewrites the sheet on each call,
 * so re-exporting just refreshes the snapshot (no duplicate rows).
 *
 * Kept transport-only: the rows are built by aggregateWinnersByBidder().
 */
export interface SheetsExportResult {
  exported: number;
}

export async function exportWinnersToSheet(rows: WinnerRow[]): Promise<SheetsExportResult> {
  const url = config.sheets.webhookUrl;
  if (!url) {
    throw new Error(
      'Google Sheets export is not configured. Set SHEETS_WEBHOOK_URL (and SHEETS_WEBHOOK_SECRET).',
    );
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: config.sheets.webhookSecret ?? '', rows }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Sheets webhook failed (${res.status}): ${body.slice(0, 200)}`);
  }

  return { exported: rows.length };
}
