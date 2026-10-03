import { formatMoney } from '@/lib/countries';

export interface InvoiceData {
  version: 1;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  accountName: string;
  accountEmail: string;
  accountContacts: string;
  accountCountry: string;
  recordCount: number;
  currencyCode: string;
  exchangeRate: number;
  planUsd: number;
  usageUsd: number;
  subtotalUsd: number;
  totalUsd: number;
  planAmount: number;
  usageAmount: number;
  subtotalAmount: number;
  discountAmount?: number;
  totalAmount: number;
  memo: string;
}

export interface InvoiceInput {
  invoiceNumber: string;
  invoiceDate: Date;
  period: string;
  accountName: string;
  accountEmail: string;
  accountContacts: string;
  accountCountry: string;
  currencyCode: string;
  recordCount: number;
  exchangeRate: number;
}

export const INVOICE_BODY_PREFIX = 'VEX_INVOICE_V1:';
export const INVOICE_MEMO =
  'This invoice covers the VEX Inventory Management System Pro Plan and database record usage for the 30-day billing period shown.';

export function getUsagePeriod(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) {
    throw new Error('Select a valid usage month before preparing an invoice.');
  }
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const endExclusive = new Date(Date.UTC(year, monthNumber - 1, 31));
  const end = new Date(endExclusive.getTime() - 24 * 60 * 60 * 1000);
  return {
    start,
    endExclusive,
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
  };
}

export function formatInvoicePeriod(periodStart: string, periodEnd: string): string {
  const formatDate = (value: string) => {
    const [year, month, day] = value.slice(0, 10).split('-');
    return `${month} ${day}, ${year}`;
  };
  return `${formatDate(periodStart)} - ${formatDate(periodEnd)}`;
}

export async function getUsdExchangeRate(currencyCode: string): Promise<number> {
  if (currencyCode === 'USD') return 1;

  const response = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load current currency exchange rates.');
  const data = await response.json();
  const rate = Number(data.rates?.[currencyCode]);
  if (data.result !== 'success' || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(`No USD exchange rate is available for ${currencyCode}.`);
  }
  return rate;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function createInvoiceData(input: InvoiceInput): InvoiceData {
  const planUsd = 20;
  const usageUsd = input.recordCount * 0.01344;
  const subtotalUsd = planUsd + usageUsd;
  const totalUsd = subtotalUsd;
  const subtotalAmount = roundCurrency(subtotalUsd * input.exchangeRate);
  const usagePeriod = getUsagePeriod(input.period);
  const invoiceDate = new Date(input.invoiceDate);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 3);

  return {
    version: 1,
    invoiceNumber: input.invoiceNumber,
    invoiceDate: invoiceDate.toISOString(),
    dueDate: dueDate.toISOString(),
    period: input.period,
    periodStart: usagePeriod.periodStart,
    periodEnd: usagePeriod.periodEnd,
    accountName: input.accountName,
    accountEmail: input.accountEmail,
    accountContacts: input.accountContacts,
    accountCountry: input.accountCountry,
    recordCount: input.recordCount,
    currencyCode: input.currencyCode,
    exchangeRate: input.exchangeRate,
    planUsd,
    usageUsd,
    subtotalUsd,
    totalUsd,
    planAmount: roundCurrency(planUsd * input.exchangeRate),
    usageAmount: roundCurrency(usageUsd * input.exchangeRate),
    subtotalAmount,
    totalAmount: subtotalAmount,
    memo: INVOICE_MEMO,
  };
}

export function applyInvoiceDiscount(invoice: InvoiceData, discountAmount: number): InvoiceData {
  const roundedDiscount = roundCurrency(discountAmount);
  if (!Number.isFinite(roundedDiscount) || roundedDiscount < 0 || roundedDiscount > invoice.subtotalAmount) {
    throw new Error('Discount must be between zero and the invoice subtotal.');
  }

  const { discountAmount: _previousDiscount, ...baseInvoice } = invoice;
  return roundedDiscount === 0
    ? { ...baseInvoice, totalAmount: baseInvoice.subtotalAmount }
    : {
      ...baseInvoice,
      discountAmount: roundedDiscount,
      totalAmount: roundCurrency(baseInvoice.subtotalAmount - roundedDiscount),
    };
}

export function serializeInvoiceData(invoice: InvoiceData): string {
  return `${INVOICE_BODY_PREFIX}${JSON.stringify(invoice)}`;
}

export function parseInvoiceData(body: string): InvoiceData | null {
  if (!body.startsWith(INVOICE_BODY_PREFIX)) return null;
  try {
    const invoice = JSON.parse(body.slice(INVOICE_BODY_PREFIX.length)) as InvoiceData;
    if (invoice.version !== 1 || typeof invoice.invoiceNumber !== 'string' || typeof invoice.period !== 'string') {
      return null;
    }
    const usagePeriod = getUsagePeriod(invoice.period);
    invoice.periodStart ||= usagePeriod.periodStart;
    invoice.periodEnd ||= usagePeriod.periodEnd;
    return invoice;
  } catch {
    return null;
  }
}

export function getInvoiceMessagePreview(body: string): string {
  const invoice = parseInvoiceData(body);
  if (!invoice) return body;
  return `Invoice ${invoice.invoiceNumber} · Amount due ${formatMoney(invoice.totalAmount, invoice.currencyCode)} · ${invoice.recordCount.toLocaleString()} database records`;
}

export function formatInvoiceBody(invoice: InvoiceData): string {
  const lines = [
    `Invoice Number: ${invoice.invoiceNumber}`,
    ...(invoice.discountAmount ? [
      `Subtotal: ${formatMoney(invoice.subtotalAmount, invoice.currencyCode)}`,
      `Discount: (${formatMoney(invoice.discountAmount, invoice.currencyCode)})`,
    ] : []),
    `Amount Due: ${formatMoney(invoice.totalAmount, invoice.currencyCode)} ${invoice.currencyCode}`,
    `Memo: ${invoice.memo}`,
  ];
  return lines.join('\n');
}