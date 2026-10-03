'use client';

import React from 'react';
import Image from 'next/image';
import { formatMoney } from '@/lib/countries';
import { ReceiptData } from '@/lib/receipts';

interface ReceiptDocumentProps {
  receipt: ReceiptData;
}

const formatDate = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export default function ReceiptDocument({ receipt }: ReceiptDocumentProps) {
  return (
    <article className="bg-white text-slate-900 border border-slate-200 p-3 sm:p-8 space-y-4 sm:space-y-7">
      <header className="flex items-start justify-between gap-3 sm:gap-6 border-b border-slate-200 pb-4 sm:pb-6">
        <div>
          <Image src="/assets/images/app_logo.png" alt="VEX Inventory Management System logo" width={192} height={192} className="h-14 w-14 sm:h-32 sm:w-32 object-contain" priority />
          <p className="text-[9px] sm:text-sm text-slate-500">vexbrandfamily@gmail.com</p>
        </div>
        <div className="min-w-0 text-right">
          <h2 className="text-xl sm:text-2xl font-700">RECEIPT</h2>
          <p className="mt-1 break-words text-[10px] sm:text-sm">Receipt number <strong>{receipt.receiptNumber}</strong></p>
          <p className="text-[10px] sm:text-sm">Receipt date {formatDate(receipt.receiptDate)}</p>
        </div>
      </header>

      <section>
        <p className="text-[10px] sm:text-xs font-700 uppercase text-slate-500">Received from</p>
        <p className="mt-1 font-700">{receipt.accountName}</p>
        <p className="text-xs sm:text-sm capitalize">{receipt.accountType} account</p>
        <p className="break-words text-xs sm:text-sm">{receipt.accountEmail}</p>
        <p className="text-xs sm:text-sm">{receipt.accountCountry || '—'}</p>
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
              <td className="break-words py-3 pr-1 sm:pr-3">Subscription payment</td>
              <td className="py-3 px-1 sm:px-3 text-right">1</td>
              <td className="break-all py-3 px-1 sm:px-3 text-right">{formatMoney(receipt.amount, receipt.currencyCode)}</td>
              <td className="break-all py-3 pl-1 sm:pl-3 text-right">{formatMoney(receipt.amount, receipt.currencyCode)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <section className="ml-auto max-w-xs space-y-2 text-xs sm:text-sm">
        <div className="border-t border-slate-300 pt-2 sm:pt-3">
          <p className="text-[10px] sm:text-xs font-700 uppercase text-slate-500">Amount paid · {receipt.currencyCode}</p>
          <p className="break-words text-2xl sm:text-[32pt] leading-tight font-700">{formatMoney(receipt.amount, receipt.currencyCode)}</p>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-3 sm:pt-5">
        <p className="text-[10px] sm:text-xs font-700 uppercase text-slate-500">Notes</p>
        <p className="mt-2 text-[10px] sm:text-xs leading-5">{receipt.notes || '—'}</p>
      </section>
    </article>
  );
}