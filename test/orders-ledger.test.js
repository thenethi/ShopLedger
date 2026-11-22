'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const orders = require('../lib/orders');
const dates = require('../lib/dates');
const ledger = require('../lib/ledger');

// Synthetic fixtures only. Never import routes/store or access the persisted DB.
function orderDb() {
  return { orders: [
    { id: 1, date: '15/03/2022' },
    { id: 2, date: '30/01/2022' },
    { id: 3, date: '28/12/2021' }
  ] };
}

function customerDb() {
  return {
    customers: [{ id: 1, name: 'Test customer', openingBalance: 450,
      totalBilled: 1982.01, totalSettled: 1200, balance: 1232.01 }],
    nextSettlementId: 501,
    settlements: [{ id: 500, amount: 100 }]
  };
}

test('correct behaviour: dates are chronological and settlement input is numeric', () => {
  assert.deepEqual(orders.list(orderDb()).map(o => o.id), [1, 2, 3]);
  assert.deepEqual(orders.list(orderDb(), { from: '2022-03-15' }).map(o => o.id), [1]);
  assert.deepEqual(orders.list(orderDb(), { to: '2022-03-15' }).map(o => o.id), [1, 2, 3]);
  assert.deepEqual(orders.list(orderDb(), {
    from: '2022-01-01', to: '2022-01-31'
  }).map(o => o.id), [2]);

  const db = customerDb();
  const result = ledger.recordSettlement(db, 1, '500');
  assert.equal(result.ok, true);
  assert.equal(result.customer.totalSettled, 1700);
  assert.equal(result.customer.balance, 732.01);

  const invalidDb = customerDb();
  const before = structuredClone(invalidDb);
  assert.deepEqual(ledger.recordSettlement(invalidDb, 1, 'abc'), {
    ok: false, error: 'Settlement amount must be greater than zero'
  });
  assert.deepEqual(invalidDb, before);
});

test('orders are sorted newest first by calendar date', () => {
  const db = orderDb();
  const before = structuredClone(db);
  assert.deepEqual(orders.list(db).map(o => o.id), [1, 2, 3]);
  assert.deepEqual(db, before);
});

test('ISO from filter includes dates on or after its calendar date', () => {
  assert.deepEqual(orders.list(orderDb(), { from: '2022-03-15' }).map(o => o.id), [1]);
});

test('ISO to filter includes dates on or before its calendar date', () => {
  assert.deepEqual(orders.list(orderDb(), { to: '2022-03-15' }).map(o => o.id), [1, 2, 3]);
});

test('ISO date range includes only orders in the calendar range', () => {
  assert.deepEqual(orders.list(orderDb(), {
    from: '2022-01-01', to: '2022-01-31'
  }).map(o => o.id), [2]);
});

test('CURRENT BEHAVIOUR: equal ISO boundaries include the matching date', () => {
  assert.deepEqual(orders.list(orderDb(), {
    from: '2022-01-30', to: '2022-01-30'
  }).map(o => o.id), [2]);
});

test('normalizeDateKey converts supported inputs to sortable date text', () => {
  assert.equal(dates.normalizeDateKey(' 2022-03-15 '), '2022-03-15');
  assert.equal(dates.normalizeDateKey(' 15/03/2022 '), '2022-03-15');
  assert.equal(dates.normalizeDateKey('2022-1-5'), '2022-01-05');
});

test('CURRENT BEHAVIOUR: normalizeDateKey returns empty for absent input', () => {
  for (const input of [undefined, null, '']) {
    assert.equal(dates.normalizeDateKey(input), '');
  }
});

test('normalizeDateKey rejects unsupported text formats', () => {
  assert.equal(dates.normalizeDateKey('not-a-date'), '');
  assert.equal(dates.normalizeDateKey('nonsense'), '');
});

function checkRecorded(db, result, amount) {
  assert.equal(result.ok, true);
  assert.equal(result.customer, db.customers[0]);
  assert.equal(result.settlement, db.settlements[0]);
  assert.equal(db.nextSettlementId, 502);
  assert.equal(db.settlements.length, 2);
  assert.deepEqual(db.settlements[1], { id: 500, amount: 100 });
  assert.equal(result.settlement.id, 501);
  assert.equal(result.settlement.customerId, 1);
  assert.equal(result.settlement.customerName, 'Test customer');
  assert.equal(result.settlement.amount, amount);
  assert.equal(result.settlement.mode, 'upi');
  assert.equal(result.settlement.note, 'Khata settlement');
  assert.match(result.settlement.date, /^\d{2}\/\d{2}\/\d{4}$/);
  assert.equal(db.customers[0].openingBalance, 450);
  assert.equal(db.customers[0].totalBilled, 1982.01);
}

test('CURRENT BEHAVIOUR: numeric 500 adds to settled total and reduces balance', () => {
  const db = customerDb();
  const result = ledger.recordSettlement(db, 1, 500);
  checkRecorded(db, result, 500);
  assert.equal(result.customer.totalSettled, 1700);
  assert.equal(result.customer.balance, 732.01);
});

test('string 500 is converted before updating the settled total', () => {
  const db = customerDb();
  const result = ledger.recordSettlement(db, '1', '500');
  checkRecorded(db, result, 500);
  assert.equal(result.customer.totalSettled, 1700);
  assert.equal(result.customer.balance, 732.01);
});

test('CURRENT BEHAVIOUR: zero settlements are rejected without mutation', () => {
  for (const amount of [0, '0']) {
    const db = customerDb();
    const before = structuredClone(db);
    assert.deepEqual(ledger.recordSettlement(db, 1, amount), {
      ok: false, error: 'Settlement amount must be greater than zero'
    });
    assert.deepEqual(db, before);
  }
});

test('CURRENT BEHAVIOUR: negative settlements are rejected without mutation', () => {
  for (const amount of [-500, '-500']) {
    const db = customerDb();
    const before = structuredClone(db);
    assert.deepEqual(ledger.recordSettlement(db, 1, amount), {
      ok: false, error: 'Settlement amount must be greater than zero'
    });
    assert.deepEqual(db, before);
  }
});

test('non-numeric settlement text is rejected without mutation', () => {
  const db = customerDb();
  const before = structuredClone(db);
  assert.deepEqual(ledger.recordSettlement(db, 1, 'abc'), {
    ok: false, error: 'Settlement amount must be greater than zero'
  });
  assert.deepEqual(db, before);
});

test('CURRENT BEHAVIOUR: numeric NaN is rejected without mutation', () => {
  const db = customerDb();
  const before = structuredClone(db);
  assert.deepEqual(ledger.recordSettlement(db, 1, NaN), {
    ok: false, error: 'Settlement amount must be greater than zero'
  });
  assert.deepEqual(db, before);
});
