'use client';

import { createClient } from '@/lib/supabase/client';
import { formatMoney } from '@/lib/countries';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';

async function getCurrentAccountId(): Promise<string | null> {
  const supabase = createClient();
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const { data: accountByUserId } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (accountByUserId?.id) return accountByUserId.id;

    if (user.email) {
      const { data: accountByEmail } = await supabase
        .from('accounts')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();
      if (accountByEmail?.id) return accountByEmail.id;
    }

    return null;
  } catch {
    return null;
  }
}

function isSchemaError(error: any): boolean {
  if (!error) return false;
  if (error.code && typeof error.code === 'string') {
    const errorClass = error.code.substring(0, 2);
    if (errorClass === '42') return true;
    if (errorClass === '23') return false;
    if (errorClass === '08') return true;
  }
  if (error.message) {
    const schemaErrorPatterns = [
      /relation.*does not exist/i,
      /column.*does not exist/i,
      /function.*does not exist/i,
      /syntax error/i,
      /type.*does not exist/i,
    ];
    return schemaErrorPatterns.some((p) => p.test(error.message));
  }
  return false;
}

// ─── ADMIN SERVICES ──────────────────────────────────────────

export const adminService = {
  async getMetrics() {
    const supabase = createClient();
    try {
      const [totalRes, storeRes, bizRes] = await Promise.all([
        supabase.from('accounts').select('*', { count: 'exact', head: true }),
        supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('account_type', 'store'),
        supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('account_type', 'business'),
      ]);

      const totalAccounts = totalRes.count ?? 0;
      const storeAccounts = storeRes.count ?? 0;
      const businessAccounts = bizRes.count ?? 0;
      return { totalAccounts, storeAccounts, businessAccounts };
    } catch (error: any) {
      if (isSchemaError(error)) throw error;
      return { totalAccounts: 0, storeAccounts: 0, businessAccounts: 0 };
    }
  },

  async getRecentRegistrations(limit = 10) {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('name', { ascending: true })
        .limit(limit);
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return data?.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        type: r.account_type as 'store' | 'business',
        country: r.country,
      })) ?? [];
    } catch (error: any) {
      if (isSchemaError(error)) throw error;
      return [];
    }
  },

  async getActivityFeed(limit = 6) {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('platform_activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return data?.map((a) => ({
        id: a.id,
        activityType: a.activity_type,
        title: a.title,
        detail: a.detail,
        time: formatRelativeTime(a.created_at),
      })) ?? [];
    } catch (error: any) {
      if (isSchemaError(error)) throw error;
      return [];
    }
  },

};

// ─── STORE SERVICES ──────────────────────────────────────────

export const storeService = {
  async getMetrics() {
    const supabase = createClient();
    try {
      const accountId = await getCurrentAccountId();
      if (!accountId) {
        return { totalItems: 0, lowStockItems: 0, outOfStock: 0, receivedToday: 0, issuedToday: 0, receiptsCount: 0, issuesCount: 0 };
      }

      const [totalRes, lowRes, outRes] = await Promise.all([
        supabase.from('store_items').select('*', { count: 'exact', head: true }),
        supabase.from('store_items').select('*', { count: 'exact', head: true }).eq('status', 'low-stock'),
        supabase.from('store_items').select('*', { count: 'exact', head: true }).eq('status', 'out-of-stock'),
      ]);

      const today = new Date().toISOString().split('T')[0];
      const [receipts, issues, adjustmentIn, adjustmentOut] = await Promise.all([
        fetchAllRows((from, to) => supabase.from('store_receipts').select('quantity, receipt_date').eq('account_id', accountId).range(from, to)),
        fetchAllRows((from, to) => supabase.from('store_issues').select('quantity, issue_date').eq('account_id', accountId).range(from, to)),
        fetchAllRows((from, to) => supabase.from('store_adjustment_in').select('quantity').eq('account_id', accountId).gte('created_at', today).range(from, to)),
        fetchAllRows((from, to) => supabase.from('store_adjustment_out').select('quantity').eq('account_id', accountId).gte('created_at', today).range(from, to)),
      ]);
      const receivedToday = receipts.filter((movement) => movement.receipt_date === today).reduce((sum, movement) => sum + Number(movement.quantity || 0), 0)
        + adjustmentIn.reduce((sum, movement) => sum + Math.abs(Number(movement.quantity || 0)), 0);
      const issuedToday = issues.filter((movement) => movement.issue_date === today).reduce((sum, movement) => sum + Number(movement.quantity || 0), 0)
        + adjustmentOut.reduce((sum, movement) => sum + Math.abs(Number(movement.quantity || 0)), 0);
      const receiptsCount = receipts.filter((movement) => movement.receipt_date === today).length + adjustmentIn.length;
      const issuesCount = issues.filter((movement) => movement.issue_date === today).length + adjustmentOut.length;

      return {
        totalItems: totalRes.count ?? 0,
        lowStockItems: lowRes.count ?? 0,
        outOfStock: outRes.count ?? 0,
        receivedToday,
        issuedToday,
        receiptsCount,
        issuesCount,
      };
    } catch (error: any) {
      if (isSchemaError(error)) throw error;
      return { totalItems: 0, lowStockItems: 0, outOfStock: 0, receivedToday: 0, issuedToday: 0, receiptsCount: 0, issuesCount: 0 };
    }
  },

  async getStockItems() {
    const supabase = createClient();
    try {
      const accountId = await getCurrentAccountId();
      let query = supabase.from('store_items').select('*').order('name', { ascending: true });
      const data = await fetchAllRows((from, to) => query.range(from, to));
      return data.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        category: item.category as 'permanent' | 'consumable' | 'perishable',
        unit: item.unit,
        currentStock: item.current_stock,
        minLevel: item.min_level,
        maxLevel: item.max_level,
        location: item.location,
        lastMovement: item.last_movement_date ? new Date(item.last_movement_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '',
        status: item.status as 'available' | 'low-stock' | 'out-of-stock',
      })) ?? [];
    } catch (error: any) {
      if (isSchemaError(error)) throw error;
      return [];
    }
  },

  async getLowStockItems() {
    const supabase = createClient();
    try {
      const accountId = await getCurrentAccountId();
      let query = supabase
        .from('store_items')
        .select('*')
        .in('status', ['low-stock', 'out-of-stock'])
        .order('current_stock', { ascending: true });
      const data = await fetchAllRows((from, to) => query.range(from, to));
      return data.map((item) => ({
        id: item.id,
        name: item.name,
        code: item.code,
        current: item.current_stock,
        min: item.min_level,
        category: item.category as 'permanent' | 'consumable' | 'perishable',
      })) ?? [];
    } catch (error: any) {
      if (isSchemaError(error)) throw error;
      return [];
    }
  },

  async getRecentMovements(limit = 5) {
    const supabase = createClient();
    try {
      const accountId = await getCurrentAccountId();
      if (!accountId) return [];

      const [
        { data: receipts, error: receiptsError },
        { data: issues, error: issuesError },
        { data: adjustmentIn, error: adjustmentInError },
        { data: adjustmentOut, error: adjustmentOutError },
      ] = await Promise.all([
        supabase.from('store_receipts').select('id, item_name, receipt_voucher_no, quantity, received_from, receipt_date, created_at').eq('account_id', accountId).order('receipt_date', { ascending: false }).limit(limit),
        supabase.from('store_issues').select('id, item_name, quantity, issued_to, issue_date, created_at').eq('account_id', accountId).order('issue_date', { ascending: false }).limit(limit),
        supabase.from('store_adjustment_in').select('*').eq('account_id', accountId).order('created_at', { ascending: false }).limit(limit),
        supabase.from('store_adjustment_out').select('*').eq('account_id', accountId).order('created_at', { ascending: false }).limit(limit),
      ]);
      if (receiptsError || issuesError || adjustmentInError || adjustmentOutError) {
        const error = receiptsError || issuesError || adjustmentInError || adjustmentOutError;
        if (isSchemaError(error)) throw error;
        return [];
      }
      const data = [
        ...(receipts ?? []).map((movement) => ({ ...movement, movement_type: 'receipt', reference_number: movement.receipt_voucher_no, performed_by: movement.received_from, created_at: `${movement.receipt_date}T00:00:00` })),
        ...(issues ?? []).map((movement) => ({ ...movement, movement_type: 'issue', reference_number: '', performed_by: movement.issued_to, created_at: `${movement.issue_date}T00:00:00` })),
        ...(adjustmentIn ?? []).map((movement) => ({ ...movement, movement_type: 'receipt' })),
        ...(adjustmentOut ?? []).map((movement) => ({ ...movement, movement_type: 'issue' })),
      ].sort((first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime()).slice(0, limit);
      return data.map((m) => ({
        id: m.id,
        type: m.movement_type as 'receipt' | 'issue' | 'adjustment' | 'transfer',
        ref: m.reference_number,
        item: `${m.item_name} × ${Math.abs(m.quantity)}`,
        user: m.performed_by,
        time: new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      })) ?? [];
    } catch (error: any) {
      if (isSchemaError(error)) throw error;
      return [];
    }
  },

  async getMostIssuedItems(limit = 10) {
    const supabase = createClient();
    const accountId = await getCurrentAccountId();
    if (!accountId) return [];

    const issues = await fetchAllRows((from, to) =>
      supabase
        .from('store_issues')
        .select('item_name, quantity')
        .eq('account_id', accountId)
        .range(from, to)
    );
    const quantities = new Map<string, number>();
    issues.forEach((issue) => {
      const name = typeof issue.item_name === 'string' ? issue.item_name.trim() : '';
      const quantity = Math.abs(Number(issue.quantity));
      if (name && Number.isFinite(quantity)) {
        quantities.set(name, (quantities.get(name) ?? 0) + quantity);
      }
    });

    return Array.from(quantities, ([name, quantity]) => ({ name, quantity }))
      .sort((first, second) => second.quantity - first.quantity || first.name.localeCompare(second.name))
      .slice(0, Math.max(0, limit));
  },

  async getCategoryBreakdown() {
    const supabase = createClient();
    try {
      const accountId = await getCurrentAccountId();
      const query = supabase.from('store_items').select('category, current_stock');
      const data = await fetchAllRows((from, to) => query.range(from, to));
      const counts: Record<string, number> = { Consumable: 0, 'Permanent & Expendable': 0 };
      data.forEach((item) => {
        const category = item.category === 'consumable' ? 'Consumable' : 'Permanent & Expendable';
        counts[category] += Number(item.current_stock || 0);
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    } catch (error: any) {
      if (isSchemaError(error)) throw error;
      return [];
    }
  },

  async getMovementChartData() {
    const supabase = createClient();
    try {
      const accountId = await getCurrentAccountId();
      if (!accountId) return [];

      const rangeStart = new Date();
      rangeStart.setHours(0, 0, 0, 0);
      rangeStart.setDate(rangeStart.getDate() - 13);
      const startDate = rangeStart.toISOString().split('T')[0];
      const [receipts, issues, adjustmentIn, adjustmentOut] = await Promise.all([
        fetchAllRows((from, to) => supabase.from('store_receipts').select('quantity, receipt_date, created_at').eq('account_id', accountId).gte('receipt_date', startDate).range(from, to)),
        fetchAllRows((from, to) => supabase.from('store_issues').select('quantity, issue_date, created_at').eq('account_id', accountId).gte('issue_date', startDate).range(from, to)),
        fetchAllRows((from, to) => supabase.from('store_adjustment_in').select('quantity, created_at').eq('account_id', accountId).gte('created_at', rangeStart.toISOString()).range(from, to)),
        fetchAllRows((from, to) => supabase.from('store_adjustment_out').select('quantity, created_at').eq('account_id', accountId).gte('created_at', rangeStart.toISOString()).range(from, to)),
      ]);
      const data = [
        ...receipts.map((movement) => ({ quantity: movement.quantity, created_at: `${movement.receipt_date}T00:00:00`, movement_type: 'receipt' })),
        ...issues.map((movement) => ({ quantity: movement.quantity, created_at: `${movement.issue_date}T00:00:00`, movement_type: 'issue' })),
        ...adjustmentIn.map((movement) => ({ ...movement, movement_type: 'receipt' })),
        ...adjustmentOut.map((movement) => ({ ...movement, movement_type: 'issue' })),
      ].sort((first, second) => new Date(first.created_at).getTime() - new Date(second.created_at).getTime()).slice(-30);
      const days: Record<string, { day: string; receipts: number; issues: number }> = {};
      for (let offset = 13; offset >= 0; offset -= 1) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - offset);
        const key = date.toISOString().split('T')[0];
        days[key] = { day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), receipts: 0, issues: 0 };
      }
      data?.forEach((movement) => {
        const key = new Date(movement.created_at).toISOString().split('T')[0];
        if (!days[key]) return;
        if (movement.movement_type === 'receipt') days[key].receipts += Math.abs(Number(movement.quantity || 0));
        else days[key].issues += Math.abs(Number(movement.quantity || 0));
      });
      return Object.values(days);
    } catch (error: any) {
      if (isSchemaError(error)) throw error;
      return [];
    }
  },
};

// ─── BUSINESS SERVICES ───────────────────────────────────────

export const businessService = {
  async getMetrics() {
    const supabase = createClient();
    try {
      const accountId = await getCurrentAccountId();
      if (!accountId) {
        return { todaySales: 0, todayTransactions: 0, todayReturns: 0, mtdPurchases: 0, lowStockProducts: 0, outOfStock: 0 };
      }

      const today = new Date().toISOString().split('T')[0];
      const [lowRes, outRes, todaySales, purchases] = await Promise.all([
        supabase.from('business_products').select('*', { count: 'exact', head: true }).eq('account_id', accountId).eq('status', 'low-stock'),
        supabase.from('business_products').select('*', { count: 'exact', head: true }).eq('account_id', accountId).eq('status', 'out-of-stock'),
        fetchAllRows((from, to) => supabase.from('business_transactions').select('total_amount, transaction_type').eq('account_id', accountId).gte('created_at', today).range(from, to)),
        fetchAllRows((from, to) => supabase.from('business_transactions').select('total_amount').eq('account_id', accountId).eq('transaction_type', 'purchase').range(from, to)),
      ]);

      const todaySalesTotal = todaySales.filter((t) => t.transaction_type === 'sale').reduce((s, t) => s + (t.total_amount || 0), 0);
      const todayTransactions = todaySales.filter((t) => t.transaction_type === 'sale').length;
      const todayReturns = todaySales.filter((t) => t.transaction_type === 'return').length;
      const mtdPurchases = purchases.reduce((s, t) => s + (t.total_amount || 0), 0);

      return {
        todaySales: todaySalesTotal,
        todayTransactions,
        todayReturns,
        mtdPurchases,
        lowStockProducts: lowRes.count ?? 0,
        outOfStock: outRes.count ?? 0,
      };
    } catch (error: any) {
      if (isSchemaError(error)) throw error;
      return { todaySales: 0, todayTransactions: 0, todayReturns: 0, mtdPurchases: 0, lowStockProducts: 0, outOfStock: 0 };
    }
  },

  async getProducts() {
    const supabase = createClient();
    try {
      const accountId = await getCurrentAccountId();
      let query = supabase
        .from('business_products')
        .select('*')
        .neq('status', 'inactive')
        .order('name', { ascending: true });
      if (accountId) query = query.eq('account_id', accountId);
      const data = await fetchAllRows((from, to) => query.range(from, to));
      return data.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        unit: p.unit,
        currentStock: p.current_stock,
        minLevel: p.min_level,
        margin: p.margin_percent,
        lastSale: p.last_sale_date ? new Date(p.last_sale_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '',
        status: p.status as 'available' | 'low-stock' | 'out-of-stock',
      })) ?? [];
    } catch (error: any) {
      if (isSchemaError(error)) throw error;
      return [];
    }
  },

  async getTopProducts(limit = 5) {
    const supabase = createClient();
    try {
      const accountId = await getCurrentAccountId();
      if (!accountId) return [];

      const salesQuery = supabase
        .from('business_sales')
        .select('product_id, product_name, quantity, total_amount, account_id')
        .eq('account_id', accountId);
      const salesData = await fetchAllRows((from, to) => salesQuery.range(from, to));

      const totals = new Map<string, { id: string; name: string; unitsSold: number; revenue: number }>();
      salesData.forEach((sale) => {
        const key = sale.product_id || sale.product_name || 'unknown';
        const current = totals.get(key) ?? { id: sale.product_id || key, name: sale.product_name || 'Unknown product', unitsSold: 0, revenue: 0 };
        current.unitsSold += Number(sale.quantity || 0);
        current.revenue += Number(sale.total_amount || 0);
        totals.set(key, current);
      });

      return [...totals.values()]
        .map((product) => ({
          id: product.id,
          name: product.name,
          unitsSold: product.unitsSold,
          revenue: Math.round(product.revenue),
          trend: product.unitsSold > 0 ? 'up' as const : 'neutral' as const,
        }))
        .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
        .slice(0, limit);
    } catch (error: any) {
      if (isSchemaError(error)) throw error;
      return [];
    }
  },

  async getRecentTransactions(limit = 6) {
    const supabase = createClient();
    try {
      const accountId = await getCurrentAccountId();
      if (!accountId) return [];

      let query = supabase
        .from('business_transactions')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(limit);
      const { data, error } = await query;
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return data?.map((t) => ({
        id: t.id,
        type: t.transaction_type as 'sale' | 'purchase' | 'return' | 'adjustment',
        ref: t.reference_number,
        detail: t.detail,
        cashier: t.cashier_name,
        time: new Date(t.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        payMethod: t.payment_method || '—',
      })) ?? [];
    } catch (error: any) {
      if (isSchemaError(error)) throw error;
      return [];
    }
  },

  async getSalesTrendData() {
    const supabase = createClient();
    try {
      const accountId = await getCurrentAccountId();
      if (!accountId) return [];

      const rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - 29);

      const query = supabase
        .from('business_transactions')
        .select('total_amount, transaction_type, created_at')
        .eq('account_id', accountId)
        .in('transaction_type', ['sale', 'purchase'])
        .gte('created_at', rangeStart.toISOString())
        .order('created_at', { ascending: true });
      const data = await fetchAllRows((from, to) => query.range(from, to));

      const grouped: Record<string, { date: string; sales: number; purchases: number }> = {};
      for (let i = 29; i >= 0; i -= 1) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - i);
        const key = date.toISOString().split('T')[0];
        grouped[key] = { date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), sales: 0, purchases: 0 };
      }

      data.forEach((t) => {
        const key = new Date(t.created_at).toISOString().split('T')[0];
        if (!grouped[key]) return;
        if (t.transaction_type === 'sale') grouped[key].sales += Number(t.total_amount || 0);
        if (t.transaction_type === 'purchase') grouped[key].purchases += Number(t.total_amount || 0);
      });

      return Object.values(grouped);
    } catch (error: any) {
      if (isSchemaError(error)) throw error;
      return [];
    }
  },

  async getWeeklySalesData() {
    const supabase = createClient();
    try {
      const accountId = await getCurrentAccountId();
      if (!accountId) return [];

      const rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - 89);

      const query = supabase
        .from('business_transactions')
        .select('total_amount, transaction_type, created_at')
        .eq('account_id', accountId)
        .eq('transaction_type', 'sale')
        .gte('created_at', rangeStart.toISOString())
        .order('created_at', { ascending: true });
      const data = await fetchAllRows((from, to) => query.range(from, to));
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const grouped: Record<string, number> = {};
      days.forEach((d) => { grouped[d] = 0; });
      data.forEach((t) => {
        const date = new Date(t.created_at);
        const weekday = days[(date.getDay() + 6) % 7];
        grouped[weekday] += Number(t.total_amount || 0);
      });
      return days.map((day) => ({ day, avg: grouped[day] }));
    } catch (error: any) {
      if (isSchemaError(error)) throw error;
      return [];
    }
  },
};

// ─── HELPERS ─────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}
