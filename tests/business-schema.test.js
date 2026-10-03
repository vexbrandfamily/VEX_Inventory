const fs = require('fs');
const path = require('path');
const assert = require('assert');

const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
const schemaText = fs.readFileSync(schemaPath, 'utf8').toLowerCase();

const requiredSchemaColumns = [
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

assert(schemaText.includes('create table if not exists public.business_products'), 'Business products table missing');
assert(schemaText.includes('create table if not exists public.business_transactions'), 'Business transactions table missing');
assert(schemaText.includes('create table if not exists public.sms_messages'), 'SMS messages table missing');
const subscriptionsTable = schemaText.match(/create table if not exists public\.subscriptions \([\s\S]*?\n\);/i)?.[0] || '';
for (const column of ['account_id', 'account_name', 'account_type', 'country', 'amount', 'payment_date', 'notes', 'created_at']) {
  assert(subscriptionsTable.includes(`${column} `), `Subscriptions table missing ${column} column`);
}
assert(schemaText.includes('create policy subscriptions_admin_access on public.subscriptions'), 'Subscriptions must be restricted to platform admins.');
assert(schemaText.includes('grant select, insert, update, delete on public.subscriptions to authenticated;'), 'Authenticated users need the subscriptions table grant.');

console.log('PASS: schema includes inventory, transaction, notification, and subscription fields used by the account pages.');
