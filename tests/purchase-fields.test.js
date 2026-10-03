const fs = require('fs');
const path = require('path');
const assert = require('assert');

const pagePath = path.join(__dirname, '..', 'src', 'app', 'business-stock-in', 'page.tsx');
const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');

const pageText = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'business', 'BusinessStockInView.tsx'), 'utf8');
const schemaText = fs.readFileSync(schemaPath, 'utf8');
const stockInViewText = pageText;
const stockOutViewText = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'business', 'BusinessStockOutView.tsx'), 'utf8');
const posPageText = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'business-pos', 'page.tsx'), 'utf8');
const productsPageText = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'business-products', 'page.tsx'), 'utf8');

const requiredPageFields = [
  'Purchase Date',
  'Quantity',
  'Supplier',
  'Notes',
  'Filter products added in Products',
];

const removedPurchaseFields = [
  'Supplier Invoice No.',
  'Received By',
  'Payment Status',
  'Payment Method',
];

for (const field of removedPurchaseFields) {
  assert(!pageText.includes(field), `Removed purchase field still present: ${field}`);
}

for (const field of requiredPageFields) {
  assert(pageText.includes(field), `Missing field label: ${field}`);
}

assert(!pageText.includes('Reference Number'), 'Reference Number should be removed from the purchase form.');
assert(!pageText.toLowerCase().includes('reference_number'), 'Reference number should be removed from the purchase flow.');
assert(!pageText.toLowerCase().includes('sku'), 'SKU references should be removed from the purchase flow.');
assert(!pageText.includes('Selling Price'), 'Selling Price should be removed from the purchase flow.');
assert(productsPageText.includes('Selling Price'), 'Selling Price should be available on the Products page.');
assert(stockOutViewText.includes('Reference Number'), 'Sales form should retain the required reference field.');

const requiredSchemaColumns = [
  'purchase_date',
  'supplier',
  'notes',
];

const purchaseTable = schemaText.match(/create table if not exists public\.business_purchases \([\s\S]*?\n\);/i)?.[0] || '';
for (const column of ['supplier_invoice_no', 'received_by', 'payment_status', 'payment_method']) {
  assert(!purchaseTable.toLowerCase().includes(column), `Removed purchase schema column still present: ${column}`);
}
assert(!purchaseTable.toLowerCase().includes('selling_price'), 'Selling price should not be stored on business_purchases.');

for (const column of requiredSchemaColumns) {
  assert(schemaText.toLowerCase().includes(column.toLowerCase()), `Missing schema column: ${column}`);
}

assert(stockInViewText.includes("from('business_purchases')") || stockInViewText.includes('from("business_purchases")'), 'Purchase creation must persist to business_purchases.');
assert(stockOutViewText.includes("from('business_sales')") || stockOutViewText.includes('from("business_sales")'), 'Sales creation must persist to business_sales.');
assert(posPageText.includes("from('business_sales')") || posPageText.includes('from("business_sales")'), 'POS sales must persist to business_sales.');
assert(stockInViewText.includes("activeTab === 'adjustments' ? 'adjustment' : 'purchase'"), 'Incoming adjustments must not be classified as purchases.');
assert(stockOutViewText.includes("activeTab === 'adjustments' ? 'adjustment' : 'sale'"), 'Outgoing adjustments must not be classified as sales.');
assert(stockInViewText.includes("if (activeTab === 'adjustments')") && stockInViewText.includes("} else {"), 'Incoming records must branch between adjustments and purchases.');
assert(stockOutViewText.includes("if (activeTab === 'adjustments')") && stockOutViewText.includes("} else {"), 'Outgoing records must branch between adjustments and sales.');
assert(schemaText.includes('create policy business_purchases_account_access'), 'Missing business_purchases RLS policy.');
assert(schemaText.includes('create policy business_sales_account_access'), 'Missing business_sales RLS policy.');
assert(schemaText.includes('grant select, insert, update, delete on public.business_purchases to authenticated;'), 'Missing business_purchases grant.');
assert(schemaText.includes('grant select, insert, update, delete on public.business_sales to authenticated;'), 'Missing business_sales grant.');

assert(!schemaText.toLowerCase().includes('reference_number') || schemaText.toLowerCase().includes('reference_number text not null default'), 'The sales schema must retain reference number support for POS and sales workflows.');
const businessProductsSchema = schemaText.match(/create table if not exists public\.business_products \([\s\S]*?\n\);/i)?.[0] || '';
assert(!businessProductsSchema.includes('sku'), 'SKU should be removed from the business products schema.');
assert(businessProductsSchema.includes('selling_price'), 'Selling price should be stored on business_products.');

console.log('PASS: purchase flow excludes stale stock/reference fields, includes required fields and product filter, and schema matches the data model.');
