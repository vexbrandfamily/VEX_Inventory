'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import {
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  ImagePlus,
  Pencil,
  Ban,
  CircleCheck,
} from 'lucide-react';
import ResponsiveRecordList, { RecordColumn } from '@/components/ui/ResponsiveRecordList';
import AccountAvatar from '@/components/AccountAvatar';
import StatusBadge from '@/components/ui/StatusBadge';
import { getCountryByPhoneCode, getCurrencySymbol } from '@/lib/countries';
import { createManagedAccount, deleteManagedAccount } from '@/lib/auth/createManagedAccount';

interface Account {
  id: string;
  user_id: string;
  name: string;
  email: string;
  contacts: string;
  account_type: 'store' | 'business';
  country: string;
  town?: string;
  country_code?: string;
  currency_code?: string;
  logo_url?: string;
  status?: 'active' | 'suspended';
}

interface NewAccountForm {
  name: string;
  email: string;
  contacts: string;
  password: string;
  account_type: 'store' | 'business';
  town: string;
  country_code: string;
  currency_code: string;
}

const emptyForm: NewAccountForm = {
  name: '',
  email: '',
  contacts: '',
  password: '',
  account_type: 'store',
  town: '',
  country_code: '',
  currency_code: 'USD',
};

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'store' | 'business'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [form, setForm] = useState<NewAccountForm>(emptyForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const selectedCountry = getCountryByPhoneCode(form.country_code);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('accounts')
        .select('*')
        .in('account_type', ['store', 'business'])
        .order('name', { ascending: true });
      if (filterType !== 'all') query = query.eq('account_type', filterType);
      setAccounts(await fetchAllRows((from, to) => query.range(from, to)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const searchTerm = search.trim().toLowerCase();
  const filtered = accounts.filter((a) =>
    [a.name, a.email, a.country, a.town].some((value) => value?.toLowerCase().includes(searchTerm))
  );

  const handleCountryChange = (code: string) => {
    const country = getCountryByPhoneCode(code);
    setForm((prev) => ({
      ...prev,
      country_code: code,
      currency_code: country?.currency || prev.currency_code || 'USD',
    }));
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (!form.country_code) throw new Error('Please enter a country calling code');
      if (!selectedCountry) throw new Error(`No country found for +${form.country_code}`);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.refreshSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('Not authenticated');

      const { error: adminProfileError } = await supabase.from('user_profiles').upsert(
        {
          id: session.user.id,
          email: session.user.email ?? '',
          full_name: (session.user.user_metadata?.full_name as string) || session.user.email || '',
          avatar_url: (session.user.user_metadata?.avatar_url as string) || '',
          account_type: 'admin',
          is_active: true,
        },
        { onConflict: 'id' }
      );
      if (adminProfileError) {
        console.warn('Could not persist admin profile:', adminProfileError.message);
      }

      const country = selectedCountry;

      let logo_url = '';
      if (logoFile) {
        const ext = (logoFile.name.split('.').pop() || 'png')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('account-logos')
          .upload(path, logoFile, { contentType: logoFile.type, upsert: true });
        if (uploadError) {
          const message =
            uploadError.message === 'Failed to fetch'
              ? 'Logo storage is not configured. Apply the storage section in supabase/schema.sql, then try again.'
              : `Logo upload failed: ${uploadError.message}`;
          throw new Error(message);
        }
        const { data: publicData } = supabase.storage.from('account-logos').getPublicUrl(path);
        logo_url = publicData.publicUrl;
      }

      if (editingAccount) {
        const { error: updateError } = await supabase
          .from('accounts')
          .update({
            name: form.name,
            account_type: form.account_type,
            contacts: form.contacts.trim(),
            country: country.name,
            town: form.town.trim(),
            country_code: form.country_code,
            currency_code: country.currency,
            ...(logo_url ? { logo_url } : {}),
          })
          .eq('id', editingAccount.id);
        if (updateError) throw new Error(`Account update failed: ${updateError.message}`);

        const { error: profileUpdateError } = await supabase
          .from('user_profiles')
          .update({
            full_name: form.name,
            account_type: form.account_type,
            ...(logo_url ? { avatar_url: logo_url } : {}),
          })
          .eq('id', editingAccount.user_id);
        if (profileUpdateError) {
          throw new Error(`Profile update failed: ${profileUpdateError.message}`);
        }
      } else {
        await createManagedAccount(supabase, {
          name: form.name,
          email: form.email,
          contacts: form.contacts.trim(),
          password: form.password,
          account_type: form.account_type,
          country: country.name,
          town: form.town.trim(),
          country_code: form.country_code,
          currency_code: country.currency,
          logo_url,
        });
      }

      setShowAddModal(false);
      setEditingAccount(null);
      setForm(emptyForm);
      setLogoFile(null);
      setLogoPreview('');
      setShowPassword(false);
      fetchAccounts();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (account: Account) => {
    setEditingAccount(account);
    setForm({
      name: account.name,
      email: account.email,
      contacts: account.contacts || '',
      password: '',
      account_type: account.account_type,
      town: account.town || '',
      country_code: account.country_code || '',
      currency_code: account.currency_code || 'USD',
    });
    setLogoFile(null);
    setLogoPreview(account.logo_url || '');
    setError(null);
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this account? This cannot be undone.')) return;
    setError(null);
    try {
      await deleteManagedAccount(supabase, id);
    } catch (e: any) {
      setError(e.message);
      return;
    }
    fetchAccounts();
  };

  const handleToggleStatus = async (account: Account) => {
    const isSuspended = account.status === 'suspended';
    const nextStatus = isSuspended ? 'active' : 'suspended';
    const actionLabel = isSuspended ? 'activate' : 'suspend';
    if (!confirm(`${isSuspended ? 'Activate' : 'Suspend'} ${account.name}?`)) return;

    setError(null);
    const { error: statusError } = await supabase
      .from('accounts')
      .update({ status: nextStatus })
      .eq('id', account.id);
    if (statusError) {
      setError(`Could not ${actionLabel} account: ${statusError.message}`);
      return;
    }

    if (account.user_id) {
      await supabase
        .from('user_profiles')
        .update({ is_active: nextStatus === 'active' })
        .eq('id', account.user_id);
    }

    const { error: activityError } = await supabase.from('platform_activities').insert({
      activity_type: nextStatus === 'suspended' ? 'account_suspended' : 'account_activated',
      title: isSuspended ? 'Account activated' : 'Account suspended',
      detail: `${account.name} (${account.email}) was ${nextStatus === 'suspended' ? 'suspended' : 'activated'}`,
      related_account_id: account.id,
    });
    if (activityError) {
      console.warn('Could not log account status change:', activityError.message);
    }

    fetchAccounts();
  };

  const accountColumns = useMemo<RecordColumn<Account>[]>(
    () => [
      {
        key: 'account',
        header: 'Account',
        card: 'title',
        render: (acc) => (
          <div className="flex items-center gap-2.5 min-w-0">
            <AccountAvatar
              name={acc.name}
              logoUrl={acc.logo_url}
              accountType={acc.account_type}
              size={32}
            />
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{acc.name}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        render: (acc) => (
          <span
            className={`text-xs font-600 px-2 py-0.5 rounded-full ${acc.account_type === 'store' ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'}`}
          >
            {acc.account_type}
          </span>
        ),
      },
      {
        key: 'email',
        header: 'Email',
        render: (acc) => (
          <span className="text-xs text-muted-foreground break-all">{acc.email}</span>
        ),
      },
      {
        key: 'contacts',
        header: 'Contacts',
        render: (acc) => (
          <span className="text-muted-foreground break-words">{acc.contacts || '—'}</span>
        ),
      },
      {
        key: 'country',
        header: 'Country',
        render: (acc) => (
          <div className="flex flex-col text-muted-foreground">
            <span>
              {acc.country_code
                ? `+${acc.country_code} ${acc.country?.toUpperCase() || ''}`
                : acc.country || '—'}
            </span>
            {acc.town?.trim() && (
              <span className="text-xs">
                {acc.town
                  .trim()
                  .toLowerCase()
                  .replace(/^./, (firstLetter) => firstLetter.toUpperCase())}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        card: 'meta',
        render: (acc) => (
          <StatusBadge variant={acc.status === 'suspended' ? 'suspended' : 'active'} />
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        card: 'actions',
        render: (acc) => {
          const isSuspended = acc.status === 'suspended';
          return (
            <div className="flex items-center gap-1">
              <button
                title="Edit account"
                onClick={() => openEdit(acc)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <Pencil size={14} />
              </button>
              <button
                title={isSuspended ? 'Activate account' : 'Suspend account'}
                onClick={() => handleToggleStatus(acc)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-600 transition-colors ${
                  isSuspended
                    ? 'hover:bg-success/10 text-success'
                    : 'hover:bg-warning/10 text-warning'
                }`}
              >
                {isSuspended ? <CircleCheck size={14} /> : <Ban size={14} />}
                {isSuspended ? 'Activate' : 'Suspend'}
              </button>
              <button
                title="Delete account"
                onClick={() => handleDelete(acc.id)}
                className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <AppLayout
      accountType="admin"
      pageTitle="Accounts"
      pageSubtitle="Manage all registered accounts"
    >
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search accounts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30 w-56"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="text-sm bg-card border border-border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary/30"
            >
              <option value="all">All Types</option>
              <option value="store">Store</option>
              <option value="business">Business</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchAccounts}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => {
                setEditingAccount(null);
                setForm(emptyForm);
                setLogoFile(null);
                setLogoPreview('');
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <Plus size={14} />
              Add Account
            </button>
          </div>
        </div>

        {error && !showAddModal && (
          <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <ResponsiveRecordList
          rows={filtered}
          getRowId={(acc) => acc.id}
          loading={loading}
          skeletonRows={6}
          footer={`${filtered.length} account${filtered.length !== 1 ? 's' : ''} shown`}
          empty={
            <div className="px-4 py-12 text-center text-muted-foreground">No accounts found.</div>
          }
          columns={accountColumns}
        />
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="font-700 text-foreground">
                {editingAccount ? 'Edit Account' : 'Add New Account'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {editingAccount
                  ? 'Update account details'
                  : 'Creates login credentials — user signs in with email & password'}
              </p>
            </div>
            <form onSubmit={handleAddAccount} className="px-6 py-4 space-y-4">
              <div className="flex flex-col items-center">
                <label className="block text-xs font-600 text-muted-foreground mb-2 self-start">
                  Account Logo
                </label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      setError('Logo must be 2MB or smaller');
                      return;
                    }
                    setLogoFile(file);
                    setLogoPreview(URL.createObjectURL(file));
                  }}
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted flex items-center justify-center overflow-hidden transition-colors"
                  title="Select logo from device"
                >
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <ImagePlus size={22} />
                      <span className="text-[10px] mt-1">Add logo</span>
                    </div>
                  )}
                </button>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Click to choose an image from your device
                </p>
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">
                  Account Name *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">Email *</label>
                <input
                  required
                  type="email"
                  disabled={!!editingAccount}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">
                  Contacts
                </label>
                <input
                  value={form.contacts}
                  onChange={(e) => setForm({ ...form, contacts: e.target.value })}
                  placeholder="Phone numbers or other contact details"
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">
                  Password{editingAccount ? '' : ' *'}
                </label>
                <div className="relative">
                  <input
                    required={!editingAccount}
                    type={showPassword ? 'text' : 'password'}
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min. 8 characters"
                    className="w-full px-3 py-2 pr-9 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {editingAccount
                    ? 'Leave blank to keep the current password'
                    : 'The user will log in with this password'}
                </p>
              </div>
              <div>
                <div>
                  <label className="block text-xs font-600 text-muted-foreground mb-1">
                    Account Type *
                  </label>
                  <select
                    value={form.account_type}
                    onChange={(e) => setForm({ ...form, account_type: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="store">Store</option>
                    <option value="business">Business</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">
                  Country *
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 text-sm bg-muted border border-r-0 border-border rounded-l-lg">
                    +
                  </span>
                  <input
                    required
                    inputMode="numeric"
                    pattern="[0-9]+"
                    value={form.country_code}
                    onChange={(e) => handleCountryChange(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-r-lg outline-none focus:ring-1 focus:ring-primary/30"
                    placeholder="254"
                    aria-label="Country calling code"
                  />
                  {selectedCountry && (
                    <span className="ml-2 text-sm font-600 text-foreground whitespace-nowrap">
                      {selectedCountry.name.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">Town</label>
                <input
                  value={form.town}
                  onChange={(e) => setForm({ ...form, town: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-600 text-muted-foreground mb-1">
                  Currency
                </label>
                <div className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground">
                  {selectedCountry
                    ? `${getCurrencySymbol(selectedCountry.currency)} (${selectedCountry.currency})`
                    : 'Enter a country code'}
                </div>
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingAccount(null);
                    setError(null);
                    setShowPassword(false);
                    setForm(emptyForm);
                    setLogoFile(null);
                    setLogoPreview('');
                  }}
                  className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : editingAccount ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
