'use client';

import React from 'react';
import Image from 'next/image';
import { formatMoney } from '@/lib/countries';
import { formatInvoicePeriod, InvoiceData } from '@/lib/invoices';

interface InvoiceDocumentProps {
  invoice: InvoiceData;
}

const formatDate = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const formatUnitRate = (value: number, currencyCode: string) => new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: currencyCode,
  maximumFractionDigits: 6,
}).format(value);

export default function InvoiceDocument({ invoice }: InvoiceDocumentProps) {
  return (
    <article className="bg-white text-slate-900 border border-slate-200 p-3 sm:p-8 space-y-4 sm:space-y-7">
      <header className="flex items-start justify-between gap-3 sm:gap-6 border-b border-slate-200 pb-4 sm:pb-6">
        <div>
          <Image src="/assets/images/app_logo.png" alt="VEX Inventory Management System logo" width={192} height={192} className="h-14 w-14 sm:h-32 sm:w-32 object-contain" priority />
          <p className="text-[9px] sm:text-sm text-slate-500">vexbrandfamily@gmail.com</p>
        </div>
        <div className="min-w-0 text-right">
          <h2 className="text-xl sm:text-2xl font-700">INVOICE</h2>
          <p className="mt-1 break-words text-[10px] sm:text-sm">Invoice number <strong>{invoice.invoiceNumber}</strong></p>
          <p className="text-[10px] sm:text-sm">Invoice date {formatDate(invoice.invoiceDate)}</p>
          <p className="text-[10px] sm:text-sm">Due date {formatDate(invoice.dueDate)}</p>
        </div>
      </header>

      <section>
        <p className="text-[10px] sm:text-xs font-700 uppercase text-slate-500">Bill to</p>
        <p className="mt-1 font-700">{invoice.accountName}</p>
        {invoice.accountContacts && <p className="break-words text-xs sm:text-sm">{invoice.accountContacts}</p>}
        <p className="break-words text-xs sm:text-sm">{invoice.accountEmail}</p>
        <p className="text-xs sm:text-sm">{invoice.accountCountry || '—'}</p>
      </section>

      <div className="overflow-x-auto">
        <table className="w-full min-w-full table-fixed text-[10px] sm:text-sm">
          <colgroup>
            <col className="w-[40%]" />
            <col className="w-[14%]" />
            <col className="w-[23%]" />
            <col className="w-[23%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-300 text-left text-[8px] sm:text-xs uppercase text-slate-500">
              <th className="py-2 pr-1 sm:pr-3">Description</th>
              <th className="py-2 px-1 sm:px-3 text-right"><span className="sm:hidden">Qty</span><span className="hidden sm:inline">Quantity</span></th>
              <th className="py-2 px-1 sm:px-3 text-right">Rate</th>
              <th className="py-2 pl-1 sm:pl-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="break-words py-3 pr-1 sm:pr-3">Pro Plan</td>
              <td className="py-3 px-1 sm:px-3 text-right">1</td>
              <td className="break-all py-3 px-1 sm:px-3 text-right">{formatMoney(invoice.planAmount, invoice.currencyCode)}</td>
              <td className="break-all py-3 pl-1 sm:pl-3 text-right">{formatMoney(invoice.planAmount, invoice.currencyCode)}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="break-words py-3 pr-1 sm:pr-3">Database records (30-day period)<span className="block text-[9px] sm:text-xs text-slate-500">{formatInvoicePeriod(invoice.periodStart, invoice.periodEnd)}</span></td>
              <td className="break-all py-3 px-1 sm:px-3 text-right">{invoice.recordCount.toLocaleString()}</td>
              <td className="break-all py-3 px-1 sm:px-3 text-right">{formatUnitRate(0.01344 * invoice.exchangeRate, invoice.currencyCode)}</td>
              <td className="break-all py-3 pl-1 sm:pl-3 text-right">{formatMoney(invoice.usageAmount, invoice.currencyCode)}</td>
            </tr>
            {invoice.discountAmount && (
              <>
                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-1 sm:pr-3">Subtotal</td>
                  <td className="py-3 px-1 sm:px-3 text-right">—</td>
                  <td className="py-3 px-1 sm:px-3 text-right">—</td>
                  <td className="break-all py-3 pl-1 sm:pl-3 text-right">{formatMoney(invoice.subtotalAmount, invoice.currencyCode)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-1 sm:pr-3">Discount</td>
                  <td className="py-3 px-1 sm:px-3 text-right">—</td>
                  <td className="py-3 px-1 sm:px-3 text-right">—</td>
                  <td className="break-all py-3 pl-1 sm:pl-3 text-right">({formatMoney(invoice.discountAmount, invoice.currencyCode)})</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      <section className="ml-auto max-w-xs space-y-2 text-xs sm:text-sm">
        <div className="border-t border-slate-300 pt-2 sm:pt-3">
          <p className="text-[10px] sm:text-xs font-700 uppercase text-slate-500">Amount due · {invoice.currencyCode}</p>
          <p className="break-words text-2xl sm:text-[32pt] leading-tight font-700">{formatMoney(invoice.totalAmount, invoice.currencyCode)}</p>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-3 sm:pt-5">
        <p className="text-[10px] sm:text-xs font-700 uppercase text-slate-500">Memo</p>
        <p className="mt-2 text-[10px] sm:text-xs leading-5">{invoice.memo}</p>
      </section>
    </article>
  );
}
