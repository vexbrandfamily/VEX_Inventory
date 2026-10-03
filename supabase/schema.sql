-- VEX Inventory database schema (single source of truth — do not add extra schema files).
-- Apply this file in the Supabase SQL Editor before deploying the create-user Edge Function.
-- Passwords are managed by Supabase Auth and are intentionally not stored here.

create extension if not exists pgcrypto;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  name text not null check (char_length(trim(name)) > 0),
  email text not null,
  contacts text not null default '',
  account_type text not null check (account_type in ('store', 'business')),
  country text not null default '',
  town text not null default '',
  country_code text not null default '',
  currency_code text not null default 'USD' check (currency_code ~ '^[A-Z]{3}$'),
  logo_url text not null default '',
  status text not null default 'active' check (status in ('active', 'suspended'))
);

-- Existing databases created before status was added.
alter table public.accounts
  add column if not exists status text not null default 'active';

alter table public.accounts
  add column if not exists contacts text not null default '';

alter table public.accounts
  add column if not exists town text not null default '';

alter table public.accounts drop constraint if exists accounts_status_check;
alter table public.accounts
  add constraint accounts_status_check check (status in ('active', 'suspended'));

update public.accounts
set status = 'active'
where status is null or status not in ('active', 'suspended');

-- Remove legacy account fields when this script is applied to an older schema.
alter table public.accounts
  drop column if exists plan,
  drop column if exists subscription_status,
  drop column if exists monthly_amount,
  drop column if exists subscription_expiry,
  drop column if exists registered_date,
  drop column if exists created_at,
  drop column if exists updated_at;

drop trigger if exists accounts_set_updated_at on public.accounts;

create unique index if not exists accounts_email_lower_key
  on public.accounts (lower(email));
create index if not exists accounts_account_type_idx on public.accounts (account_type);

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  avatar_url text not null default '',
  account_type text not null default 'admin'
    check (account_type in ('admin', 'store', 'business')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.business_products (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  category text not null default '',
  brand text not null default '',
  description text not null default '',
  unit text not null default 'Piece',
  selling_price numeric(12,2) not null default 0 check (selling_price >= 0),
  reorder_level integer not null default 10 check (reorder_level >= 0),
  minimum_stock integer not null default 5 check (minimum_stock >= 0),
  maximum_stock integer not null default 100 check (maximum_stock >= 0),
  current_stock integer not null default 0 check (current_stock >= 0),
  min_level integer not null default 0 check (min_level >= 0),
  margin_percent numeric(5,2) not null default 0 check (margin_percent >= 0),
  last_sale_date date,
  status text not null default 'active' check (status in ('active', 'inactive', 'available', 'low-stock', 'out-of-stock')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.business_products
  drop column if exists supplier,
  drop column if exists location,
  drop column if exists sku,
  drop column if exists purchase_price;

alter table public.business_products
  alter column category set default '';

create table if not exists public.store_items (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  code text not null default '',
  name text not null check (char_length(trim(name)) > 0),
  category text not null default 'consumable'
    check (category in ('consumable', 'permanent_expendable', 'permanent', 'expendable', 'perishable')),
  unit text not null default 'Piece' check (char_length(trim(unit)) > 0),
  current_stock integer not null default 0 check (current_stock >= 0),
  min_level integer not null default 0 check (min_level >= 0),
  max_level integer not null default 100 check (max_level >= 0),
  location text not null default '',
  status text not null default 'out-of-stock'
    check (status in ('available', 'low-stock', 'out-of-stock')),
  last_movement_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Existing databases created before the store item contract was added.
alter table public.store_items
  add column if not exists code text not null default '',
  add column if not exists account_id uuid references public.accounts(id) on delete cascade,
  add column if not exists name text not null default '',
  add column if not exists category text not null default 'consumable',
  add column if not exists unit text not null default 'Piece',
  add column if not exists current_stock integer not null default 0,
  add column if not exists min_level integer not null default 0,
  add column if not exists max_level integer not null default 100,
  add column if not exists location text not null default '',
  add column if not exists status text not null default 'out-of-stock',
  add column if not exists last_movement_date date,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

-- Existing inventory can only be assigned automatically when ownership is unambiguous.
update public.store_items
set account_id = (select id from public.accounts where account_type = 'store')
where account_id is null
  and (select count(*) from public.accounts where account_type = 'store') = 1;

alter table public.store_items drop constraint if exists store_items_category_check;
alter table public.store_items
  add constraint store_items_category_check
  check (category in ('consumable', 'permanent_expendable', 'permanent', 'expendable', 'perishable'));

alter table public.store_items drop constraint if exists store_items_status_check;
alter table public.store_items
  add constraint store_items_status_check
  check (status in ('available', 'low-stock', 'out-of-stock'));

create index if not exists store_items_name_idx on public.store_items (name);
create index if not exists store_items_account_id_idx on public.store_items (account_id);
create index if not exists store_items_category_idx on public.store_items (category);
create index if not exists store_items_status_idx on public.store_items (status);

create table if not exists public.store_receipts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  item_id uuid not null references public.store_items(id) on delete restrict,
  item_name text not null default '',
  receipt_date date not null default current_date,
  received_from text not null default '',
  receipt_voucher_no text not null default '',
  quantity integer not null check (quantity > 0),
  rate numeric(12,2) not null check (rate >= 0),
  currency_code text not null default 'USD' check (currency_code ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists store_receipts_account_id_idx on public.store_receipts (account_id);
create index if not exists store_receipts_receipt_date_idx on public.store_receipts (receipt_date desc);

create table if not exists public.store_issues (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  item_id uuid not null references public.store_items(id) on delete restrict,
  item_name text not null default '',
  issue_date date not null default current_date,
  issued_to text not null default '',
  identity_or_contacts text not null default '',
  inventory_number text not null default '',
  quantity integer not null check (quantity > 0),
  issue_type text not null check (issue_type in ('permanent_transfer', 'writes_off')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists store_issues_account_id_idx on public.store_issues (account_id);
create index if not exists store_issues_issue_date_idx on public.store_issues (issue_date desc);

create table if not exists public.store_adjustment_in (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  item_id uuid not null references public.store_items(id) on delete restrict,
  item_name text not null default '',
  reference_number text not null default '',
  quantity integer not null check (quantity > 0),
  performed_by text not null default '',
  reason text not null default '',
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.store_adjustment_out (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  item_id uuid not null references public.store_items(id) on delete restrict,
  item_name text not null default '',
  reference_number text not null default '',
  quantity integer not null check (quantity > 0),
  performed_by text not null default '',
  reason text not null default '',
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists store_adjustment_in_account_id_idx on public.store_adjustment_in (account_id);
create index if not exists store_adjustment_in_created_at_idx on public.store_adjustment_in (created_at desc);
create index if not exists store_adjustment_out_account_id_idx on public.store_adjustment_out (account_id);
create index if not exists store_adjustment_out_created_at_idx on public.store_adjustment_out (created_at desc);

create table if not exists public.business_purchases (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid,
  account_id uuid not null references public.accounts(id) on delete cascade,
  product_id uuid not null references public.business_products(id) on delete restrict,
  product_name text not null default '',
  quantity integer not null default 0 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  purchase_price numeric(12,2) not null default 0 check (purchase_price >= 0),
  purchase_date date,
  supplier text not null default '',
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.business_sales (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid,
  account_id uuid not null references public.accounts(id) on delete cascade,
  product_id uuid not null references public.business_products(id) on delete restrict,
  product_name text not null default '',
  quantity integer not null default 0 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  reference_number text not null default '',
  payment_method text not null default 'Cash',
  cashier_name text not null default '',
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.business_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  product_id uuid references public.business_products(id) on delete restrict,
  transaction_type text not null default 'purchase' check (transaction_type in ('sale', 'purchase', 'return', 'adjustment')),
  movement_subtype text not null default 'purchase' check (movement_subtype in ('purchase', 'adjustment_in', 'adjustment_out', 'return', 'sale')),
  reference_number text not null default '',
  detail text not null default '',
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  item_count integer not null default 0 check (item_count >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  purchase_date date,
  supplier text not null default '',
  cashier_name text not null default '',
  payment_method text not null default 'Cash',
  reason text not null default '',
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.business_adjustment_in (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid,
  account_id uuid not null references public.accounts(id) on delete cascade,
  product_id uuid not null references public.business_products(id) on delete restrict,
  product_name text not null default '',
  quantity integer not null default 0 check (quantity > 0),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  reason text not null default '',
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.business_adjustment_out (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid,
  account_id uuid not null references public.accounts(id) on delete cascade,
  product_id uuid not null references public.business_products(id) on delete restrict,
  product_name text not null default '',
  quantity integer not null default 0 check (quantity > 0),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  reason text not null default '',
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.business_purchases
  add column if not exists transaction_id uuid;
alter table public.business_purchases
  add column if not exists purchase_price numeric(12,2) not null default 0,
  drop column if exists selling_price;
alter table public.business_products
  add column if not exists selling_price numeric(12,2) not null default 0;
alter table public.business_sales
  add column if not exists transaction_id uuid;
alter table public.business_sales
  add column if not exists discount_amount numeric(12,2) not null default 0;
alter table public.business_adjustment_in
  add column if not exists transaction_id uuid;
alter table public.business_adjustment_out
  add column if not exists transaction_id uuid;
alter table public.business_transactions
  add column if not exists product_id uuid;
alter table public.business_transactions
  add column if not exists discount_amount numeric(12,2) not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'business_purchases_transaction_id_fkey') then
    alter table public.business_purchases
      add constraint business_purchases_transaction_id_fkey
      foreign key (transaction_id) references public.business_transactions(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_sales_transaction_id_fkey') then
    alter table public.business_sales
      add constraint business_sales_transaction_id_fkey
      foreign key (transaction_id) references public.business_transactions(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_adjustment_in_transaction_id_fkey') then
    alter table public.business_adjustment_in
      add constraint business_adjustment_in_transaction_id_fkey
      foreign key (transaction_id) references public.business_transactions(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_adjustment_out_transaction_id_fkey') then
    alter table public.business_adjustment_out
      add constraint business_adjustment_out_transaction_id_fkey
      foreign key (transaction_id) references public.business_transactions(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_transactions_product_id_fkey') then
    alter table public.business_transactions
      add constraint business_transactions_product_id_fkey
      foreign key (product_id) references public.business_products(id) on delete restrict;
  end if;
end $$;

create index if not exists business_products_account_id_idx
  on public.business_products (account_id);
create index if not exists business_products_status_idx
  on public.business_products (status);
create index if not exists business_purchases_account_id_idx
  on public.business_purchases (account_id);
create index if not exists business_purchases_created_at_idx
  on public.business_purchases (created_at desc);
create index if not exists business_sales_account_id_idx
  on public.business_sales (account_id);
create index if not exists business_sales_created_at_idx
  on public.business_sales (created_at desc);
create index if not exists business_transactions_account_id_idx
  on public.business_transactions (account_id);
create index if not exists business_transactions_created_at_idx
  on public.business_transactions (created_at desc);
create index if not exists business_adjustment_in_account_id_idx
  on public.business_adjustment_in (account_id);
create index if not exists business_adjustment_in_created_at_idx
  on public.business_adjustment_in (created_at desc);
create index if not exists business_adjustment_out_account_id_idx
  on public.business_adjustment_out (account_id);
create index if not exists business_adjustment_out_created_at_idx
  on public.business_adjustment_out (created_at desc);

create table if not exists public.platform_activities (
  id uuid primary key default gen_random_uuid(),
  activity_type text not null,
  title text not null,
  detail text not null default '',
  related_account_id uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists platform_activities_created_at_idx
  on public.platform_activities (created_at desc);

create table if not exists public.sms_messages (
  id uuid primary key default gen_random_uuid(),
  message_type text not null check (message_type in ('invoice', 'receipt', 'short_message')),
  subject text not null default '',
  body text not null default '',
  recipient_account_id uuid not null references public.accounts(id) on delete cascade,
  recipient_name text not null default '',
  recipient_email text not null default '',
  sent_by text not null default 'Admin',
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists sms_messages_recipient_account_idx
  on public.sms_messages (recipient_account_id, created_at desc);
create index if not exists sms_messages_type_idx
  on public.sms_messages (message_type, created_at desc);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete set null,
  account_name text not null default '',
  account_type text not null check (account_type in ('store', 'business')),
  country text not null default '',
  amount numeric(12,2) not null default 0 check (amount >= 0),
  payment_date date not null default current_date,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists subscriptions_payment_date_idx
  on public.subscriptions (payment_date desc);
create index if not exists subscriptions_account_id_idx
  on public.subscriptions (account_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists store_issues_set_updated_at on public.store_issues;
create trigger store_issues_set_updated_at
before update on public.store_issues
for each row execute function public.set_updated_at();

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists business_products_set_updated_at on public.business_products;
create trigger business_products_set_updated_at
before update on public.business_products
for each row execute function public.set_updated_at();

drop trigger if exists store_items_set_updated_at on public.store_items;
create trigger store_items_set_updated_at
before update on public.store_items
for each row execute function public.set_updated_at();

drop trigger if exists store_receipts_set_updated_at on public.store_receipts;
create trigger store_receipts_set_updated_at
before update on public.store_receipts
for each row execute function public.set_updated_at();

drop trigger if exists store_adjustment_in_set_updated_at on public.store_adjustment_in;
create trigger store_adjustment_in_set_updated_at
before update on public.store_adjustment_in
for each row execute function public.set_updated_at();

drop trigger if exists store_adjustment_out_set_updated_at on public.store_adjustment_out;
create trigger store_adjustment_out_set_updated_at
before update on public.store_adjustment_out
for each row execute function public.set_updated_at();

drop trigger if exists business_purchases_set_updated_at on public.business_purchases;
create trigger business_purchases_set_updated_at
before update on public.business_purchases
for each row execute function public.set_updated_at();

drop trigger if exists business_sales_set_updated_at on public.business_sales;
create trigger business_sales_set_updated_at
before update on public.business_sales
for each row execute function public.set_updated_at();

drop trigger if exists business_adjustment_in_set_updated_at on public.business_adjustment_in;
create trigger business_adjustment_in_set_updated_at
before update on public.business_adjustment_in
for each row execute function public.set_updated_at();

drop trigger if exists business_adjustment_out_set_updated_at on public.business_adjustment_out;
create trigger business_adjustment_out_set_updated_at
before update on public.business_adjustment_out
for each row execute function public.set_updated_at();

-- An Auth user with no store/business account is the initial platform admin.
-- SECURITY DEFINER prevents the policy from recursively evaluating accounts RLS.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and (
      coalesce(auth.jwt() -> 'app_metadata' ->> 'account_type', '') = 'admin'
      or coalesce(auth.jwt() -> 'user_metadata' ->> 'account_type', '') = 'admin'
      or not exists (
        select 1 from public.accounts
        where user_id = auth.uid()
          and account_type in ('store', 'business')
      )
    );
$$;

-- Only platform admins may change a member's role. Members can still update
-- their own profile details without being able to promote themselves.
create or replace function public.prevent_member_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null for Auth triggers and the service-role Edge Function.
  -- Only block signed-in store/business members from changing their own role.
  if old.account_type is distinct from new.account_type
    and auth.uid() is not null
    and not public.is_platform_admin() then
    raise exception 'Only platform admins can change account type';
  end if;
  return new;
end;
$$;

drop trigger if exists user_profiles_prevent_role_change on public.user_profiles;
create trigger user_profiles_prevent_role_change
before update on public.user_profiles
for each row execute function public.prevent_member_role_change();

drop trigger if exists accounts_prevent_role_change on public.accounts;
create trigger accounts_prevent_role_change
before update on public.accounts
for each row execute function public.prevent_member_role_change();

create or replace function public.prevent_member_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status
    and auth.uid() is not null
    and not public.is_platform_admin() then
    raise exception 'Only platform admins can change account status';
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_prevent_status_change on public.accounts;
create trigger accounts_prevent_status_change
before update on public.accounts
for each row execute function public.prevent_member_status_change();

alter table public.accounts enable row level security;
alter table public.user_profiles enable row level security;
alter table public.business_products enable row level security;
alter table public.store_items enable row level security;
alter table public.store_receipts enable row level security;
alter table public.store_issues enable row level security;
alter table public.store_adjustment_in enable row level security;
alter table public.store_adjustment_out enable row level security;
alter table public.business_purchases enable row level security;
alter table public.business_sales enable row level security;
alter table public.business_transactions enable row level security;
alter table public.business_adjustment_in enable row level security;
alter table public.business_adjustment_out enable row level security;
alter table public.platform_activities enable row level security;
alter table public.sms_messages enable row level security;
alter table public.subscriptions enable row level security;

-- Admin Account page: admins can list, update, and delete client accounts.
drop policy if exists accounts_admin_select on public.accounts;
create policy accounts_admin_select on public.accounts
for select to authenticated
using (public.is_platform_admin() or user_id = auth.uid());

drop policy if exists accounts_admin_insert on public.accounts;
create policy accounts_admin_insert on public.accounts
for insert to authenticated
with check (public.is_platform_admin());

drop policy if exists accounts_admin_update on public.accounts;
create policy accounts_admin_update on public.accounts
for update to authenticated
using (public.is_platform_admin() or user_id = auth.uid())
with check (public.is_platform_admin() or user_id = auth.uid());

drop policy if exists accounts_admin_delete on public.accounts;
create policy accounts_admin_delete on public.accounts
for delete to authenticated
using (public.is_platform_admin());

drop policy if exists user_profiles_self_or_admin on public.user_profiles;
create policy user_profiles_self_or_admin on public.user_profiles
for all to authenticated
using (public.is_platform_admin() or id = auth.uid())
with check (public.is_platform_admin() or id = auth.uid());

drop policy if exists store_items_store_access on public.store_items;
create policy store_items_store_access on public.store_items
for all to authenticated
using (
  public.is_platform_admin()
  or exists (
    select 1 from public.accounts
    where id = account_id and user_id = auth.uid() and account_type = 'store'
  )
)
with check (
  public.is_platform_admin()
  or exists (
    select 1 from public.accounts
    where id = account_id and user_id = auth.uid() and account_type = 'store'
  )
);

drop policy if exists store_receipts_store_access on public.store_receipts;
create policy store_receipts_store_access on public.store_receipts
for all to authenticated
using (
  public.is_platform_admin()
  or account_id in (select id from public.accounts where user_id = auth.uid() and account_type = 'store')
)
with check (
  public.is_platform_admin()
  or account_id in (select id from public.accounts where user_id = auth.uid() and account_type = 'store')
);

drop policy if exists store_issues_store_access on public.store_issues;
create policy store_issues_store_access on public.store_issues
for all to authenticated
using (
  public.is_platform_admin()
  or account_id in (select id from public.accounts where user_id = auth.uid() and account_type = 'store')
)
with check (
  public.is_platform_admin()
  or account_id in (select id from public.accounts where user_id = auth.uid() and account_type = 'store')
);

drop policy if exists store_adjustment_in_store_access on public.store_adjustment_in;
create policy store_adjustment_in_store_access on public.store_adjustment_in
for all to authenticated
using (
  public.is_platform_admin()
  or account_id in (select id from public.accounts where user_id = auth.uid() and account_type = 'store')
)
with check (
  public.is_platform_admin()
  or account_id in (select id from public.accounts where user_id = auth.uid() and account_type = 'store')
);

drop policy if exists store_adjustment_out_store_access on public.store_adjustment_out;
create policy store_adjustment_out_store_access on public.store_adjustment_out
for all to authenticated
using (
  public.is_platform_admin()
  or account_id in (select id from public.accounts where user_id = auth.uid() and account_type = 'store')
)
with check (
  public.is_platform_admin()
  or account_id in (select id from public.accounts where user_id = auth.uid() and account_type = 'store')
);

drop policy if exists business_products_account_access on public.business_products;
create policy business_products_account_access on public.business_products
for all to authenticated
using (
  account_id in (
    select id from public.accounts where user_id = auth.uid() and account_type = 'business'
  ) or public.is_platform_admin()
)
with check (
  account_id in (
    select id from public.accounts where user_id = auth.uid() and account_type = 'business'
  ) or public.is_platform_admin()
);

drop policy if exists business_purchases_account_access on public.business_purchases;
create policy business_purchases_account_access on public.business_purchases
for all to authenticated
using (
  account_id in (
    select id from public.accounts where user_id = auth.uid() and account_type = 'business'
  ) or public.is_platform_admin()
)
with check (
  account_id in (
    select id from public.accounts where user_id = auth.uid() and account_type = 'business'
  ) or public.is_platform_admin()
);

drop policy if exists business_sales_account_access on public.business_sales;
create policy business_sales_account_access on public.business_sales
for all to authenticated
using (
  account_id in (
    select id from public.accounts where user_id = auth.uid() and account_type = 'business'
  ) or public.is_platform_admin()
)
with check (
  account_id in (
    select id from public.accounts where user_id = auth.uid() and account_type = 'business'
  ) or public.is_platform_admin()
);

drop policy if exists business_transactions_account_access on public.business_transactions;
create policy business_transactions_account_access on public.business_transactions
for all to authenticated
using (
  account_id in (
    select id from public.accounts where user_id = auth.uid() and account_type = 'business'
  ) or public.is_platform_admin()
)
with check (
  account_id in (
    select id from public.accounts where user_id = auth.uid() and account_type = 'business'
  ) or public.is_platform_admin()
);

drop policy if exists business_adjustment_in_account_access on public.business_adjustment_in;
create policy business_adjustment_in_account_access on public.business_adjustment_in
for all to authenticated
using (
  account_id in (
    select id from public.accounts where user_id = auth.uid() and account_type = 'business'
  ) or public.is_platform_admin()
)
with check (
  account_id in (
    select id from public.accounts where user_id = auth.uid() and account_type = 'business'
  ) or public.is_platform_admin()
);

drop policy if exists business_adjustment_out_account_access on public.business_adjustment_out;
create policy business_adjustment_out_account_access on public.business_adjustment_out
for all to authenticated
using (
  account_id in (
    select id from public.accounts where user_id = auth.uid() and account_type = 'business'
  ) or public.is_platform_admin()
)
with check (
  account_id in (
    select id from public.accounts where user_id = auth.uid() and account_type = 'business'
  ) or public.is_platform_admin()
);

drop policy if exists platform_activities_admin_read on public.platform_activities;
create policy platform_activities_admin_read on public.platform_activities
for select to authenticated
using (public.is_platform_admin());

drop policy if exists platform_activities_admin_insert on public.platform_activities;
create policy platform_activities_admin_insert on public.platform_activities
for insert to authenticated
with check (public.is_platform_admin());

drop policy if exists subscriptions_admin_access on public.subscriptions;
create policy subscriptions_admin_access on public.subscriptions
for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists sms_messages_admin_or_recipient_access on public.sms_messages;
create policy sms_messages_admin_or_recipient_access on public.sms_messages
for all to authenticated
using (
  public.is_platform_admin()
  or recipient_account_id in (
    select id from public.accounts where user_id = auth.uid()
  )
)
with check (
  public.is_platform_admin()
  or recipient_account_id in (
    select id from public.accounts where user_id = auth.uid()
  )
);

-- Logo bucket used by src/app/admin-accounts/page.tsx.
insert into storage.buckets (id, name, public)
values ('account-logos', 'account-logos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists account_logos_public_read on storage.objects;
create policy account_logos_public_read on storage.objects
for select using (bucket_id = 'account-logos');

drop policy if exists account_logos_authenticated_insert on storage.objects;
create policy account_logos_authenticated_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'account-logos');

drop policy if exists account_logos_authenticated_update on storage.objects;
create policy account_logos_authenticated_update on storage.objects
for update to authenticated
using (bucket_id = 'account-logos')
with check (bucket_id = 'account-logos');

drop policy if exists account_logos_authenticated_delete on storage.objects;
create policy account_logos_authenticated_delete on storage.objects
for delete to authenticated
using (bucket_id = 'account-logos');

grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on public.accounts to authenticated;
grant select, insert, update, delete on public.user_profiles to authenticated;
grant select, insert, update, delete on public.business_products to authenticated;
grant select, insert, update, delete on public.store_receipts to authenticated;
grant select, insert, update, delete on public.store_issues to authenticated;
grant select, insert, update, delete on public.store_adjustment_in to authenticated;
grant select, insert, update, delete on public.store_adjustment_out to authenticated;
grant select, insert, update, delete on public.business_purchases to authenticated;
grant select, insert, update, delete on public.business_sales to authenticated;
grant select, insert, update, delete on public.business_transactions to authenticated;
grant select, insert, update, delete on public.business_adjustment_in to authenticated;
grant select, insert, update, delete on public.business_adjustment_out to authenticated;
grant select, insert, update, delete on public.sms_messages to authenticated;
grant select, insert, update, delete on public.subscriptions to authenticated;
grant select, insert on public.platform_activities to authenticated;

notify pgrst, 'reload schema';

-- Auth "Database error creating new user" is raised when the on_auth_user_created
-- trigger fails. Legacy installs cast account_type to an enum and unique-email
-- on user_profiles aborts the Auth insert. Keep this block idempotent.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and column_name = 'account_type'
      and udt_name = 'account_type'
  ) then
    alter table public.user_profiles
      alter column account_type drop default;
    alter table public.user_profiles
      alter column account_type type text using account_type::text;
    alter table public.user_profiles
      alter column account_type set default 'admin';
  end if;
end $$;

alter table public.user_profiles drop constraint if exists user_profiles_email_key;
drop index if exists user_profiles_email_key;

alter table public.user_profiles drop constraint if exists user_profiles_account_type_check;
alter table public.user_profiles
  add constraint user_profiles_account_type_check
  check (account_type in ('admin', 'store', 'business'));

alter table public.business_products
  add column if not exists current_stock integer not null default 0,
  add column if not exists min_level integer not null default 0,
  add column if not exists margin_percent numeric(5,2) not null default 0,
  add column if not exists last_sale_date date;

alter table public.business_products
  drop constraint if exists business_products_status_check;
alter table public.business_products
  add constraint business_products_status_check check (status in ('active', 'inactive', 'available', 'low-stock', 'out-of-stock'));

alter table public.business_products
  alter column current_stock set default 0,
  alter column min_level set default 0,
  alter column margin_percent set default 0;

alter table public.business_transactions
  add column if not exists reference_number text not null default '';

alter table public.business_transactions
  drop constraint if exists business_transactions_movement_subtype_check;
alter table public.business_transactions
  add constraint business_transactions_movement_subtype_check
  check (movement_subtype in ('purchase', 'adjustment_in', 'adjustment_out', 'return', 'sale'));

update public.business_products
set status = 'available'
where status in ('active', 'inactive') and current_stock <= 0;

update public.business_products
set status = 'low-stock'
where status in ('active', 'inactive', 'available') and current_stock > 0 and current_stock <= coalesce(min_level, 0);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_type text;
begin
  new_type := lower(coalesce(new.raw_user_meta_data->>'account_type', 'admin'));
  if new_type not in ('admin', 'store', 'business') then
    new_type := 'admin';
  end if;

  insert into public.user_profiles (id, email, full_name, avatar_url, account_type, is_active)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'logo_url', ''),
    new_type,
    true
  )
  on conflict (id) do nothing;

  return new;
exception
  when others then
    raise warning 'handle_new_user skipped: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Stale leftover from the old schema; updated_at was dropped from accounts.
drop trigger if exists update_accounts_updated_at on public.accounts;

notify pgrst, 'reload schema';
