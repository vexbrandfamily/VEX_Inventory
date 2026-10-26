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
];

for (const field of removedPurchaseFields) {
  assert(!pageText.includes(field), `Removed purchase field still present: ${field}`);
}

for (const field of requiredPageFields) {
  assert(pageText.includes(field), `Missing field label: ${field}`);
}

assert(!pageText.toLowerCase().includes('sku'), 'SKU references should be removed from the purchase flow.');
assert(!pageText.includes('Selling Price'), 'Selling Price should be removed from the purchase flow.');
assert(productsPageText.includes('Selling Price'), 'Selling Price should be available on the Products page.');
assert(stockOutViewText.includes('Reference Number'), 'Sales form should retain the required reference field.');

const requiredSchemaColumns = [
  'purchase_date',
  'supplier',
  'payment_method',
  'reference_number',
  'notes',
];

const purchaseTable = schemaText.match(/create table if not exists public\.business_purchases \([\s\S]*?\n\);/i)?.[0] || '';
for (const column of ['supplier_invoice_no', 'received_by', 'payment_status']) {
  assert(!purchaseTable.toLowerCase().includes(column), `Removed purchase schema column still present: ${column}`);
}
assert(!purchaseTable.toLowerCase().includes('selling_price'), 'Selling price should not be stored on business_purchases.');

for (const column of requiredSchemaColumns) {
  assert(schemaText.toLowerCase().includes(column.toLowerCase()), `Missing schema column: ${column}`);
}

assert(stockInViewText.includes("from('business_purchases')") || stockInViewText.includes('from("business_purchases")'), 'Purchase creation must persist to business_purchases.');
assert(stockInViewText.includes('Payment Method'), 'Purchase form and listing must expose the payment method.');
for (const method of ['Cash', 'Transfers', 'Credit', 'Mobile']) {
  assert(stockInViewText.includes(`<option>${method}</option>`), `Missing purchase payment method option: ${method}`);
}
assert(purchaseTable.toLowerCase().includes('payment_method'), 'business_purchases must store payment method.');
assert(purchaseTable.toLowerCase().includes('reference_number'), 'business_purchases must store the purchase credit reference number.');
assert(schemaText.toLowerCase().includes("add column if not exists payment_method text not null default 'cash'"), 'Existing business_purchases tables must be migrated with a payment method.');
assert(schemaText.toLowerCase().includes("add column if not exists reference_number text not null default ''"), 'Existing business_purchases tables must be migrated with a reference number.');
assert(stockInViewText.includes("form.payment_method === 'Credit'"), 'Purchase reference number should be entered for Credit purchases.');
assert(stockInViewText.includes("reference_number: form.payment_method === 'Credit' ? form.purchase_reference_number.trim() : ''"), 'Purchase credit reference number must be persisted.');
assert(stockInViewText.includes(".from('business_credit_payments')"), 'Purchases must load repayment references.');
assert(stockInViewText.includes('paymentSummary.totalPaidCents >= totalAmountCents'), 'Purchases must show repayment references only after full payment.');
assert(stockInViewText.includes('text-xs font-600 text-success">{receiptNumber}'), 'Fully paid purchase receipt numbers must appear green beneath Credit.');
assert(stockOutViewText.includes(".from('business_credit_payments')"), 'Sales must load payment receipts for credit transactions.');
assert(stockOutViewText.includes('paymentSummary.amountCents < toCents(Number(transaction.total_amount || 0))'), 'Credit sales must show receipt numbers only after full payment.');
assert(stockOutViewText.includes('Receipt No: {receiptNumber}'), 'Fully paid credit sales must show payment receipt numbers in the Payment column.');
assert(stockOutViewText.includes('className="text-xs font-600 text-success"'), 'Credit payment receipt numbers must appear green.');
const creditAccountsViewText = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'business', 'BusinessCreditAccountsView.tsx'), 'utf8');
assert(creditAccountsViewText.includes(".from('business_purchases')"), 'Debts view must load purchase records.');
assert(creditAccountsViewText.includes('reference_number, product_name, quantity, supplier, total_amount'), 'Debts view must load stored purchase reference number.');
assert(creditAccountsViewText.includes('toCents(transaction.balance_due) > 0'), 'Partially paid credit records must remain while an unpaid balance remains.');
assert(creditAccountsViewText.includes("if (type === 'debts' && !paymentReceiptNumber.trim())"), 'Debt payments must require a receipt number.');
assert(creditAccountsViewText.includes('? paymentReceiptNumber.trim()'), 'Debt payments must persist the entered receipt number.');
assert(creditAccountsViewText.includes('>Receipt Number</label>'), 'Debt payment form must include a receipt number field.');
assert(creditAccountsViewText.includes(".select('transaction_id, amount, reference_number')"), 'Debts view must load payment receipt numbers.');
assert(creditAccountsViewText.includes('text-danger">{transaction.reference_number}'), 'Purchase invoice numbers must appear red in debt references.');
assert(creditAccountsViewText.includes('text-success">{receiptNumber}'), 'Debt payment receipt numbers must appear green in debt references.');
assert(creditAccountsViewText.includes('payment_receipt_numbers: type === \'debts\''), 'New debt receipt numbers must appear immediately after payment updates.');
assert(creditAccountsViewText.includes("if (type === 'credits' || type === 'debts')"), 'Both debts and credits must expose payment actions and paid totals.');
assert(creditAccountsViewText.includes("type === 'debts' ? 'Update' : 'Checkout'"), 'Debt payments must be submitted with an Update action.');
assert(creditAccountsViewText.includes("header: 'Amount'"), 'Credits must display the remaining balance in the Amount column.');
assert(creditAccountsViewText.includes('header: \'Paid\''), 'Credits must display the cumulative amount paid.');
assert(creditAccountsViewText.includes('receipt.remainingBalance > 0') && creditAccountsViewText.includes('>Balance Due</td>'), 'Payment receipts must show Balance Due only when a balance remains.');
assert(creditAccountsViewText.includes('receipt.overpayment > 0') && creditAccountsViewText.includes('>Overpayment</td>'), 'Payment receipts must show Overpayment only when the payment exceeds the balance.');
assert(creditAccountsViewText.includes("setPaymentAmount('')"), 'Update payment amount must start empty.');
assert(!creditAccountsViewText.includes('placeholder="0.00"'), 'Update payment amount must not show a numeric hint.');
assert(creditAccountsViewText.includes('>Paid today</td>'), 'Payment receipt must label the amount paid as Paid today.');
assert(/setReceipt\(\{\s*type,/.test(creditAccountsViewText), 'Both debt and credit payments must generate a receipt.');
assert(!creditAccountsViewText.includes('Cash Given') && !creditAccountsViewText.includes('Amount Transferred'), 'Payment form must not ask for cash given or transferred amounts.');
assert(!creditAccountsViewText.includes('Cash given') && !creditAccountsViewText.includes('Amount transferred'), 'Payment receipts must not show cash given or transferred amounts.');
assert(!creditAccountsViewText.includes('await fetchTransactions();'), 'A stale reload must not overwrite the updated partial-payment row immediately after checkout.');
assert(stockOutViewText.includes("from('business_sales')") || stockOutViewText.includes('from("business_sales")'), 'Sales creation must persist to business_sales.');
assert(posPageText.includes("from('business_sales')") || posPageText.includes('from("business_sales")'), 'POS sales must persist to business_sales.');
assert(posPageText.includes('Customer Name'), 'POS cart must collect the customer name.');
assert(posPageText.includes("paymentMethod === 'Credit' && (") && posPageText.includes('Required*') && posPageText.includes('required'), 'POS customer name must be required only for Credit payments.');
assert(posPageText.indexOf('>Payment Method</label>') < posPageText.indexOf('Customer Name') && posPageText.indexOf('Customer Name') < posPageText.indexOf('Cash Given'), 'POS customer name must appear below the payment methods.');
assert(posPageText.includes("if (paymentMethod === 'Credit' && !customerName.trim())"), 'POS checkout must reject Credit sales without a customer name.');
assert(stockOutViewText.includes("header: 'Customer'"), 'Sales page must display the customer name.');
assert(stockOutViewText.includes('customer_name: form.customer_name.trim()'), 'Sales page must persist customer names.');
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
