const fs = require('fs');
const path = require('path');
const assert = require('assert');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const schema = read('supabase/schema.sql').toLowerCase();
const theme = read('src/contexts/ThemeContext.tsx');
const themeStorage = read('src/lib/themes.ts');
const storeItems = read('src/app/store-items/page.tsx');

const storeItemsPolicy = schema.match(/create policy store_items_store_access[\s\S]*?\);/i)?.[0] ?? '';
assert(storeItemsPolicy.includes('id = account_id'), 'Store item RLS must match the owning account.');
assert(schema.includes('account_id uuid references public.accounts(id) on delete cascade'), 'Store items must store an owning account.');
assert(schema.includes('update public.store_items'), 'Legacy store items must be backfilled when ownership is unambiguous.');
assert(storeItems.includes('account_id: account.id'), 'New store items must be assigned to the current account.');
assert(themeStorage.includes('vex-color-mode:${userId ?? \'anonymous\'}'), 'Theme preference keys must be user-specific.');
assert(theme.includes('getColorModeStorageKey(user?.id ?? null)'), 'Theme provider must load preferences for the signed-in user.');

console.log('PASS: store inventory ownership and theme preferences are isolated by account.');