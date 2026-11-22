# ShopLedger

## Stack
- Node.js, CommonJS JavaScript, Express and body-parser.
- package.json declares express ^4.17.1 and body-parser ^1.19.0.
- Plain HTML/CSS/browser JavaScript in public/; XMLHttpRequest calls the API.
- lib/store.js synchronously reads and rewrites data/db.json; no database server.

## Module map
- server.js: JSON middleware, static public/ files, /api routers and printable invoice route.
- config.js: port, shop details, admin key, GST slabs, inventory settings and coupons.
- routes/customers.js: lists customers and settlements; records settlements and persists audit/data.
- routes/orders.js: lists, retrieves, creates and cancels orders; coordinates pricing, stock and Khata.
- routes/products.js: lists/filter products with sellable stock and GST; lists active coupons.
- routes/reports.js: dashboard, GST reconciliation, pricing preview and key-protected database export.
- lib/coupons.js: normalizes, validates and lists coupons; calculates capped discounts.
- lib/dates.js: local DD/MM/YYYY dates, date-string conversion and fiscal-year labels.
- lib/inventory.js: product lookup, sellable-stock checks, stock deductions, release and summaries.
- lib/invoice.js: separately recalculates invoice totals and renders printable HTML.
- lib/ledger.js: customer lookup/listing, Khata charges/reversals and settlement recording.
- lib/orders.js: adds, retrieves, cancels and lists orders with search/status/date filters.
- lib/pricing.js: subtotal, coupon discount, proportional line discounts and GST totals.
- lib/reports.js: dashboard aggregates and stored-order versus invoice reconciliation.
- lib/store.js: JSON persistence, missing top-level defaults and a capped audit log.
- lib/tax.js: GST rate lookup and CGST/SGST splitting.

## Commands
- Start the app from the repo root: npm start (runs node server.js).
- Run tests with Node's built-in runner: node --test.
- npm test is currently a placeholder that exits with an error.

## Rules
1. Write characterization tests before changing behaviour.
2. Change only the module(s) the ticket is about.
3. Tests never read or write data/db.json; use in-memory data.
4. Add no dependencies.
5. Make the smallest fix that works.

## Current ticket
- Order history sorting and date filtering are broken: DD/MM/YYYY strings are compared lexically.
- Khata settlements corrupt customer balances: recordSettlement adds an unconverted amount to totalSettled.
- Allowed files: lib/orders.js (list only), lib/dates.js, lib/ledger.js, routes/customers.js.
