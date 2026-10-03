import { formatMoney } from '@/lib/countries';

export interface ReceiptData {
  version: 1;
  receiptNumber: string;
  receiptDate: string;
  accountName: string;
  accountEmail: string;
  accountType: string;
  accountCountry: string;
  amount: number;
  currencyCode: string;
  notes: string;
}

export const RECEIPT_BODY_PREFIX = 'VEX_RECEIPT_V1:';

export function serializeReceiptData(receipt: ReceiptData): string {
  return `${RECEIPT_BODY_PREFIX}${JSON.stringify(receipt)}`;
}

export function parseReceiptData(body: string): ReceiptData | null {
  if (!body.startsWith(RECEIPT_BODY_PREFIX)) return null;
  try {
    const receipt = JSON.parse(body.slice(RECEIPT_BODY_PREFIX.length)) as ReceiptData;
    if (
      receipt.version !== 1 ||
      typeof receipt.receiptNumber !== 'string' ||
      typeof receipt.receiptDate !== 'string' ||
      typeof receipt.accountName !== 'string' ||
      typeof receipt.amount !== 'number' ||
      typeof receipt.currencyCode !== 'string'
    ) return null;
    return receipt;
  } catch {
    return null;
  }
}

export function getReceiptMessagePreview(body: string): string {
  const receipt = parseReceiptData(body);
  if (!receipt) return body;
  return `Receipt ${receipt.receiptNumber} · Amount paid ${formatMoney(receipt.amount, receipt.currencyCode)} · ${receipt.accountName}`;
}