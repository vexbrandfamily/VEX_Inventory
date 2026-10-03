'use client';

import React, { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountCurrency } from '@/hooks/useAccountCurrency';
import { formatMoney } from '@/lib/countries';
import { buildPosSaleRecord } from '@/lib/posSales';
import { RecordPagination, useRecordPagination } from '@/components/ui/RecordPagination';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Smartphone, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface Product {
  id: string;
  name: string;
  selling_price: number;
  current_stock: number;
  unit: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface PrintableSale {
  accountName: string;
  documentType: 'Invoice' | 'Receipt';
  referenceNumber: string;
  paymentMethod: PaymentMethod;
  createdAt: string;
  items: CartItem[];
  discountAmount: number;
  totalAmount: number;
  cashReceived?: number;
  balance?: number;
}

type PaymentMethod = 'Cash' | 'Transfers' | 'Invoice' | 'Mobile';

const paymentIcons: Record<PaymentMethod, React.ElementType> = {
  Cash: Banknote,
  Transfers: CreditCard,
  Mobile: Smartphone,
  Invoice: FileText,
};

export default function BusinessPOSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [cashReceived, setCashReceived] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [businessAccountName, setBusinessAccountName] = useState('');
  const [activeCartIndex, setActiveCartIndex] = useState(0);
  const [printableSale, setPrintableSale] = useState<PrintableSale | null>(null);

  const { user } = useAuth();
  const { currencyCode } = useAccountCurrency();
  const supabase = createClient();

  const loadAccountId = useCallback(async () => {
    if (!user?.id && !user?.email) {
      setAccountId(null);
      return null;
    }

    let nextAccountId: string | null = null;
    let nextAccountName = '';

    if (user?.id) {
      const { data: accountByUserId } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('user_id', user.id)
        .maybeSingle();
      nextAccountId = accountByUserId?.id ?? null;
      nextAccountName = accountByUserId?.name ?? '';
    }

    if (!nextAccountId && user?.email) {
      const { data: accountByEmail } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('email', user.email)
        .maybeSingle();
      nextAccountId = accountByEmail?.id ?? null;
      nextAccountName = accountByEmail?.name ?? '';
    }

    setAccountId(nextAccountId);
    setBusinessAccountName(nextAccountName);
    return nextAccountId;
  }, [supabase, user?.email, user?.id]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const query = supabase
        .from('business_products')
        .select('id, name, selling_price, current_stock, unit')
        .neq('status', 'inactive')
        .gt('current_stock', 0)
        .order('name');
      const data = await fetchAllRows((from, to) => query.range(from, to));
      setProducts(data.map((product) => ({ ...product, selling_price: Number(product.selling_price || 0) })));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    setActiveCartIndex((currentIndex) => Math.min(currentIndex, Math.max(cart.length - 1, 0)));
  }, [cart.length]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const { currentPage, pageCount, pageRows, setPage } = useRecordPagination(filteredProducts);

  const addToCart = (product: Product) => {
    if (cart.some((item) => item.product.id === product.id)) return;
    setActiveCartIndex(cart.length);
    setCart((prev) => {
      if (prev.some((item) => item.product.id === product.id)) return prev;
      return [...prev, { product, quantity: 1 }];
    });
  };

  const setItemQuantity = (productId: string, nextQuantity: number) => {
    setCart((prev) =>
      prev.map((c) => c.product.id === productId
        ? { ...c, quantity: Math.max(1, Math.min(Number.isFinite(nextQuantity) ? nextQuantity : 1, c.product.current_stock)) }
        : c
      )
    );
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => c.product.id === productId
        ? { ...c, quantity: Math.max(1, Math.min(c.quantity + delta, c.product.current_stock)) }
        : c
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.product.selling_price * c.quantity, 0);
  const itemCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const safeDiscountAmount = Math.min(Math.max(Number(discountAmount) || 0, 0), subtotal);
  const totalAfterDiscount = Math.max(subtotal - safeDiscountAmount, 0);
  const safeCashReceived = Math.max(Number(cashReceived) || 0, 0);
  const cashBalance = safeCashReceived - totalAfterDiscount;
  const checkoutDisabled = cart.length === 0 || processing || (paymentMethod === 'Cash' && safeCashReceived < totalAfterDiscount);

  const handleCheckout = async () => {
    if (checkoutDisabled) return;
    setProcessing(true);
    setError(null);
    try {
      const currentAccountId = accountId ?? (await loadAccountId());
      if (!currentAccountId) {
        throw new Error('Business account not found.');
      }

      const refNumber = `POS-${Date.now().toString().slice(-8)}`;
      let printableBusinessName = businessAccountName;
      if (!printableBusinessName) {
        const { data: account } = await supabase
          .from('accounts')
          .select('name')
          .eq('id', currentAccountId)
          .maybeSingle();
        printableBusinessName = account?.name || 'Business Account';
      }
      const detail = cart.map((c) => `${c.product.name} x${c.quantity}`).join(', ');

      const saleRecord = buildPosSaleRecord({
        accountId: currentAccountId,
        referenceNumber: refNumber,
        totalAmount: totalAfterDiscount,
        itemCount,
        discountAmount: safeDiscountAmount,
        paymentMethod,
        detail,
      });

      const { data: transaction, error: txErr } = await supabase.from('business_transactions').insert({
        ...saleRecord,
        product_id: cart.length === 1 ? cart[0].product.id : null,
      }).select('id').single();
      if (txErr) throw txErr;

      for (const item of cart) {
        const lineTotal = item.product.selling_price * item.quantity;
        const { error: saleErr } = await supabase.from('business_sales').insert({
          account_id: currentAccountId,
          transaction_id: transaction.id,
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.selling_price,
          total_amount: lineTotal,
          discount_amount: safeDiscountAmount,
          reference_number: refNumber,
          payment_method: paymentMethod,
          notes: detail,
        });
        if (saleErr) throw saleErr;
      }

      // Update stock for each product
      for (const item of cart) {
        const previousStock = Number(item.product.current_stock ?? 0);
        const newStock = Math.max(0, previousStock - item.quantity);
        const status = newStock <= 0 ? 'out-of-stock' : newStock <= (item.product.current_stock * 0.2 || 1) ? 'low-stock' : 'available';
        await supabase.from('business_products').update({
          current_stock: newStock,
          status,
          last_sale_date: new Date().toISOString().split('T')[0],
        }).eq('id', item.product.id);
      }

      setCart([]);
      setDiscountAmount('');
      setCashReceived('');
      setSuccess(null);
      setPrintableSale({
        accountName: printableBusinessName,
        documentType: paymentMethod === 'Invoice' ? 'Invoice' : 'Receipt',
        referenceNumber: refNumber,
        paymentMethod,
        createdAt: new Date().toLocaleString(),
        items: cart,
        discountAmount: safeDiscountAmount,
        totalAmount: totalAfterDiscount,
        cashReceived: paymentMethod === 'Cash' ? safeCashReceived : undefined,
        balance: paymentMethod === 'Cash' ? cashBalance : undefined,
      });
      fetchProducts();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AppLayout accountType="business" pageTitle="Point of Sale" pageSubtitle="Process sales transactions">
      <div className="flex flex-col lg:flex-row gap-5 min-h-[calc(100vh-8rem)] lg:h-[calc(100vh-8rem)]">
        {/* Product Grid */}
        <div className="min-w-0 flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
                placeholder="Search products by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 text-sm bg-card border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-1 gap-3 overflow-y-auto">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2 mb-3" />
                  <div className="h-6 bg-muted rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-1 gap-3 overflow-y-auto scrollbar-thin pb-2">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <ShoppingCart size={32} className="opacity-30 mb-2" />
                  <p>No products available</p>
                </div>
              ) : (
                pageRows.map((p) => {
                  const inCart = cart.find((c) => c.product.id === p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className={`bg-card border rounded-xl p-4 text-left hover:shadow-md transition-all duration-150 lg:flex lg:items-center lg:gap-4 lg:rounded-lg lg:p-3 ${
                        inCart ? 'border-warning ring-1 ring-warning/30' : 'border-border hover:border-warning/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2 lg:mb-0 lg:min-w-0 lg:flex-1">
                        <p className="font-600 text-foreground text-sm leading-tight line-clamp-2">{p.name}</p>
                        {inCart && (
                          <span className="ml-1 flex-shrink-0 w-5 h-5 bg-warning text-warning-foreground rounded-full text-xs flex items-center justify-center font-700">
                            {inCart.quantity}
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-700 text-warning lg:w-28">{formatMoney(p.selling_price, currencyCode)}</p>
                      <p className="text-xs text-muted-foreground mt-1 lg:mt-0 lg:w-28">Stock: {p.current_stock} {p.unit}</p>
                    </button>
                  );
                })
              )}
            </div>
          )}
          {!loading && <RecordPagination total={filteredProducts.length} currentPage={currentPage} pageCount={pageCount} onPageChange={setPage} />}
        </div>

        {/* Cart Panel */}
        <div className="w-full lg:w-96 lg:h-full min-h-[32rem] flex-shrink-0 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <ShoppingCart size={16} className="text-warning" />
            <h2 className="font-700 text-foreground">Cart</h2>
            {cart.length > 0 && (
              <span className="ml-auto text-xs bg-warning text-warning-foreground px-2 py-0.5 rounded-full font-700">
                {itemCount} item{itemCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="min-h-[9rem] flex-1 overflow-hidden p-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                <ShoppingCart size={28} className="opacity-20 mb-2" />
                <p className="text-sm">Cart is empty</p>
                <p className="text-xs mt-1">Click products to add</p>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-center gap-3">
                {cart.length > 1 && (
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      title="Previous product"
                      onClick={() => setActiveCartIndex((currentIndex) => (currentIndex - 1 + cart.length) % cart.length)}
                      className="w-8 h-8 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs text-muted-foreground">Product {activeCartIndex + 1} of {cart.length}</span>
                    <button
                      type="button"
                      title="Next product"
                      onClick={() => setActiveCartIndex((currentIndex) => (currentIndex + 1) % cart.length)}
                      className="w-8 h-8 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
                {(() => {
                  const item = cart[activeCartIndex] ?? cart[cart.length - 1];
                  if (!item) return null;

                  return (
                <div key={item.product.id} className="flex-shrink-0 bg-background border border-border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium text-foreground leading-tight flex-1 pr-2">{item.product.name}</p>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-muted-foreground hover:text-danger transition-colors flex-shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.product.id, -1)}
                        className="w-6 h-6 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                        <Minus size={11} />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={item.product.current_stock}
                        value={item.quantity}
                        onChange={(e) => setItemQuantity(item.product.id, Number(e.target.value || 1))}
                        className="w-12 px-1 py-1 text-center text-sm font-700 bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-primary/30"
                      />
                      <button onClick={() => updateQty(item.product.id, 1)}
                        className="w-6 h-6 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                        <Plus size={11} />
                      </button>
                    </div>
                    <span className="text-sm font-700 text-foreground">
                      {formatMoney(item.product.selling_price * item.quantity, currencyCode)}
                    </span>
                  </div>
                </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Checkout */}
          <div className="flex-shrink-0 border-t border-border p-4 space-y-3">
            {error && <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}
            {success && <p className="text-xs text-success bg-success/10 rounded-lg px-3 py-2">{success}</p>}

            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1">Discount</label>
              <input
                type="number"
                min={0}
                max={subtotal}
                step="0.01"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1">Payment Method</label>
              <div className="flex gap-1 overflow-hidden">
                {(['Cash', 'Transfers', 'Invoice', 'Mobile'] as PaymentMethod[]).map((method) => {
                  const Icon = paymentIcons[method];
                  return (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`flex min-w-0 flex-1 items-center justify-center gap-1 px-1.5 py-2 rounded-lg text-xs font-medium transition-all border ${
                        paymentMethod === method
                          ? 'bg-warning text-warning-foreground border-warning'
                          : 'bg-background border-border text-muted-foreground hover:border-warning/50'
                      }`}
                    >
                      <Icon size={12} />
                      {method}
                    </button>
                  );
                })}
              </div>
            </div>

            {paymentMethod === 'Cash' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1">Cash Given</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-2.5 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1">Balance</label>
                  <div className={`w-full px-2.5 py-2 text-sm border rounded-lg ${cashBalance < 0 ? 'border-danger/40 bg-danger/10 text-danger' : 'border-border bg-muted text-foreground'}`}>
                    {formatMoney(cashBalance, currencyCode)}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 py-2 border-t border-border">
              <div className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
                <span className="font-600 text-muted-foreground">Subtotal</span>
                <span className="font-700 text-foreground text-right min-w-[5.5rem]">{formatMoney(subtotal, currencyCode)}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
                <span className="font-600 text-muted-foreground">Discount</span>
                <span className="font-700 text-foreground text-right min-w-[5.5rem]">-{formatMoney(safeDiscountAmount, currencyCode)}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center gap-3 pt-1">
                <span className="text-sm font-600 text-muted-foreground">Total</span>
                <span className="text-xl font-700 text-foreground text-right min-w-[5.5rem]">{formatMoney(totalAfterDiscount, currencyCode)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={checkoutDisabled}
              className="w-full py-3 bg-warning text-warning-foreground rounded-xl font-700 text-sm hover:bg-warning/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : `Checkout — ${formatMoney(totalAfterDiscount, currencyCode)}`}
            </button>
          </div>
        </div>
      </div>

      {printableSale && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <style>{`@media print {
            body * { visibility: hidden !important; }
            .printable-sale, .printable-sale * { visibility: visible !important; }
            .printable-sale { position: absolute !important; inset: 0 !important; width: 80mm !important; max-width: 80mm !important; margin: 0 auto !important; box-shadow: none !important; }
            .printable-sale-actions { display: none !important; }
          }`}</style>
          <div className="mx-auto max-w-sm rounded-xl bg-card p-4 shadow-xl">
            <div className="printable-sale mx-auto w-full max-w-[80mm] rounded-lg bg-background p-4 text-xs text-foreground">
              <div className="text-center">
                <h1 className="break-words text-base font-700">{printableSale.accountName}</h1>
                <p className="my-3 text-muted-foreground">----------------------------------------</p>
                <h2 className="text-base font-black">{printableSale.documentType}</h2>
                <p className="my-3 text-muted-foreground">----------------------------------------</p>
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <p className="text-left">{printableSale.documentType === 'Invoice' ? 'Invoice No.' : 'Receipt No.'}:</p>
                  <p className="text-right">{printableSale.referenceNumber}</p>
                </div>
                <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <p className="text-left">Date:</p>
                  <p className="text-right">{printableSale.createdAt}</p>
                </div>
                {printableSale.documentType !== 'Invoice' && (
                  <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                    <p className="text-left">Payment method:</p>
                    <p className="text-right">{printableSale.paymentMethod}</p>
                  </div>
                )}
              </div>

              <p className="my-3 text-center text-muted-foreground">----------------------------------------</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-1 py-2">Product</th>
                      <th className="px-1 py-2 text-right">Qty</th>
                      <th className="px-1 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printableSale.items.map((item) => (
                      <tr key={item.product.id} className="border-b border-border/60">
                        <td className="px-1 py-2">{item.product.name}</td>
                        <td className="px-1 py-2 text-right">{item.quantity}</td>
                        <td className="px-1 py-2 text-right">{formatMoney(item.product.selling_price * item.quantity, currencyCode)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="my-3 text-center text-muted-foreground">----------------------------------------</p>
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <tbody>
                  <tr>
                    <td className="py-1 pr-2 text-left">Subtotal</td>
                    <td className="py-1 text-right">{formatMoney(printableSale.items.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0), currencyCode)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-2 text-left">Discount</td>
                    <td className="py-1 text-right">-{formatMoney(printableSale.discountAmount, currencyCode)}</td>
                  </tr>
                  <tr className="text-lg font-700">
                    <td className="py-1 pr-2 text-left">Total</td>
                    <td className="py-1 text-right">{formatMoney(printableSale.totalAmount, currencyCode)}</td>
                  </tr>
                  {printableSale.documentType === 'Receipt' && printableSale.paymentMethod === 'Cash' && (
                    <>
                      <tr>
                        <td colSpan={2} className="py-1">
                          <p className="text-center text-muted-foreground">------------------------------</p>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-2 text-left">Cash</td>
                        <td className="py-1 text-right">{formatMoney(printableSale.cashReceived ?? 0, currencyCode)}</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-2 text-left">Balance</td>
                        <td className="py-1 text-right">{formatMoney(printableSale.balance ?? 0, currencyCode)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
              <p className="my-3 text-center text-muted-foreground">----------------------------------------</p>
              <p className="text-center font-700">THANK YOU</p>
              <div className="mt-4 flex justify-center">
                <QRCodeSVG
                  value={JSON.stringify({
                    type: 'vex-sale',
                    documentType: printableSale.documentType,
                    business: printableSale.accountName,
                    reference: printableSale.referenceNumber,
                    date: printableSale.createdAt,
                    currency: currencyCode,
                    total: printableSale.totalAmount,
                  })}
                  size={112}
                  level="M"
                  marginSize={2}
                  title={`QR code for ${printableSale.documentType} ${printableSale.referenceNumber}`}
                />
              </div>
            </div>

            <div className="printable-sale-actions mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPrintableSale(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg bg-warning px-4 py-2 text-sm font-700 text-warning-foreground hover:bg-warning/90"
              >
                Print {printableSale.documentType}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
