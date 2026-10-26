const fs = require('fs');
const path = require('path');
const assert = require('assert');

const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
const schemaText = fs.readFileSync(schemaPath, 'utf8').toLowerCase();
const createUserPath = path.join(
  __dirname,
  '..',
  'supabase',
  'functions',
  'create-user',
  'index.ts'
);
const createUserText = fs.readFileSync(createUserPath, 'utf8');
const adminAccountsPath = path.join(__dirname, '..', 'src', 'app', 'admin-accounts', 'page.tsx');
const adminAccountsText = fs.readFileSync(adminAccountsPath, 'utf8');
const authContextPath = path.join(__dirname, '..', 'src', 'contexts', 'AuthContext.tsx');
const authContextText = fs.readFileSync(authContextPath, 'utf8');
const loginPagePath = path.join(__dirname, '..', 'src', 'app', 'login', 'page.tsx');
const loginPageText = fs.readFileSync(loginPagePath, 'utf8');

const requiredSchemaColumns = [
  'pos_email',
  'pos_user_id',
  'current_stock',
  'min_level',
  'last_sale_date',
  'margin_percent',
  'reference_number',
  'purchase_date',
  'recipient_account_id',
  'sent_by',
  'message_type',
  'sms_messages',
];

for (const column of requiredSchemaColumns) {
  assert(schemaText.includes(column), `Missing schema support for: ${column}`);
}

assert(
  schemaText.includes('add column if not exists monthly_amount'),
  'Accounts must keep monthly_amount so account inserts match the live PostgREST schema.'
);
assert(
  schemaText.includes('add column if not exists plan text') &&
    !schemaText.includes('drop column if exists plan'),
  'Accounts must keep the legacy plan column for compatibility with deployed account creation functions.'
);
assert(
  schemaText.includes('add column if not exists registered_date date') &&
    !schemaText.includes('drop column if exists registered_date'),
  'Accounts must keep the legacy registered_date column for compatibility with deployed account creation functions.'
);
assert(
  schemaText.includes('add column if not exists subscription_expiry date') &&
    !schemaText.includes('drop column if exists subscription_expiry'),
  'Accounts must keep the legacy subscription_expiry column for compatibility with deployed account creation functions.'
);
assert(
  schemaText.includes('add column if not exists subscription_status text') &&
    !schemaText.includes('drop column if exists subscription_status'),
  'Accounts must keep the legacy subscription_status column for compatibility with deployed account creation functions.'
);
assert(
  schemaText.includes('create table if not exists public.business_products'),
  'Business products table missing'
);
assert(
  schemaText.includes('create table if not exists public.business_transactions'),
  'Business transactions table missing'
);
assert(
  schemaText.includes('create table if not exists public.sms_messages'),
  'SMS messages table missing'
);
assert(schemaText.includes('accounts_pos_email_lower_key'), 'POS emails must be unique.');
assert(
  schemaText.includes('pos_user_id = auth.uid()'),
  'POS account access must be tied to the linked auth user.'
);
assert(
  schemaText.includes('where user_id = auth.uid() or pos_user_id = auth.uid()'),
  'POS users must not be treated as platform admins.'
);
for (const tablePolicy of [
  'business_products_account_access',
  'business_sales_account_access',
  'business_transactions_account_access',
  'business_credit_payments_account_access',
]) {
  assert(
    schemaText.includes(`create policy ${tablePolicy} on public.`),
    `POS access policy missing for ${tablePolicy}.`
  );
}
assert(
  createUserText.includes('email_confirm: true') &&
    createUserText.includes("action === 'create_pos_login'") &&
    createUserText.includes('pos_user_id: posUserId') &&
    createUserText.includes('updateUserById(posUserId') &&
    createUserText.includes('email: posEmail,') &&
    createUserText.includes('recoverUnlinkedPosUser(adminClient'),
  'Business and POS Auth users must be confirmed and linked during account creation.'
);
assert(
  adminAccountsText.includes('value={form.pos_email}') &&
    adminAccountsText.includes("pos_email: '',") &&
    adminAccountsText.includes(
      'onChange={(e) => setForm({ ...form, pos_email: e.target.value })}'
    ) &&
    !adminAccountsText.includes('getPosEmail('),
  'The Admin account form must leave POS email blank by default and allow custom assignment.'
);
assert(
  adminAccountsText.includes(".select('pos_user_id, pos_email')") &&
    adminAccountsText.includes('POS account fields are missing from Supabase'),
  'The Accounts page must load POS email and report when its database fields are missing.'
);
assert(
  createUserText.includes("accountType === 'business' && posEmail") &&
    !createUserText.includes('A POS email is required for business accounts.'),
  'Creating a Business account without a POS email must remain valid.'
);
assert(
  authContextText.includes('supabase.auth.signInWithPassword') &&
    loginPageText.includes('const isPosUser = await isPosAccount(supabase, data.user)') &&
    loginPageText.includes("router.push(isPosUser ? '/business-pos'"),
  'A confirmed POS Auth user must sign in with its own email and route to POS.'
);
assert(
  !createUserText.includes('monthly_amount: 0'),
  'Account creation must not depend on monthly_amount being available in the PostgREST schema cache.'
);
assert(
  !createUserText.includes('plan:'),
  'The current account creation function must not depend on the legacy plan column.'
);
const businessCreditPaymentsTable =
  schemaText.match(
    /create table if not exists public\.business_credit_payments \([\s\S]*?\n\);/i
  )?.[0] || '';
for (const column of [
  'account_id',
  'transaction_id',
  'amount',
  'payment_method',
  'reference_number',
  'created_at',
]) {
  assert(
    businessCreditPaymentsTable.includes(`${column} `),
    `Business credit payments table missing ${column} column`
  );
}
assert(
  schemaText.includes('alter table public.business_credit_payments enable row level security'),
  'Credit payments must have row-level security enabled.'
);
assert(
  schemaText.includes(
    'create policy business_credit_payments_account_access on public.business_credit_payments'
  ),
  'Credit payments must be scoped to the owning business account.'
);
assert(
  schemaText.includes(
    'grant select, insert, update, delete on public.business_credit_payments to authenticated;'
  ),
  'Authenticated business users need credit payment access.'
);
const businessSalesTable =
  schemaText.match(/create table if not exists public\.business_sales \([\s\S]*?\n\);/i)?.[0] || '';
const businessTransactionsTable =
  schemaText.match(
    /create table if not exists public\.business_transactions \([\s\S]*?\n\);/i
  )?.[0] || '';
assert(
  businessSalesTable.includes('customer_name text not null default'),
  'Business sales table must store customer names.'
);
assert(
  businessTransactionsTable.includes('customer_name text not null default'),
  'Business transactions table must store customer names.'
);
assert(
  schemaText.includes('add column if not exists customer_name text not null default'),
  'Existing sales and transaction tables must be migrated with customer names.'
);
const subscriptionsTable =
  schemaText.match(/create table if not exists public\.subscriptions \([\s\S]*?\n\);/i)?.[0] || '';
for (const column of [
  'account_id',
  'account_name',
  'account_type',
  'country',
  'amount',
  'payment_date',
  'notes',
  'created_at',
]) {
  assert(subscriptionsTable.includes(`${column} `), `Subscriptions table missing ${column} column`);
}
assert(
  schemaText.includes('create policy subscriptions_admin_access on public.subscriptions'),
  'Subscriptions must be restricted to platform admins.'
);
assert(
  schemaText.includes(
    'grant select, insert, update, delete on public.subscriptions to authenticated;'
  ),
  'Authenticated users need the subscriptions table grant.'
);

console.log(
  'PASS: schema includes inventory, transaction, notification, and subscription fields used by the account pages.'
);
