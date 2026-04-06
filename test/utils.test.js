import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import vm from 'vm';

function loadUtilsForTest() {
  const utilsPath = path.resolve('src/utils.js');
  const source = fs.readFileSync(utilsPath, 'utf8');
  const instrumented = `${source}\n;globalThis.__testExports = { parseCSVLine, parseCSV, fmt, pct, escapeCSVField, isSplitConfigValid, buildProcessedTransactionsCSV, buildSplitLedgerCSV, getSplitShare };`;

  const context = {
    React: {
      useState: () => {},
      useEffect: () => {},
      useCallback: (fn) => fn,
      useMemo: (fn) => fn(),
      useRef: () => ({ current: null }),
    },
    console,
    fetch: async () => ({ ok: false }),
    document: {},
    URL: {
      createObjectURL: () => 'blob:test',
      revokeObjectURL: () => {},
    },
    Blob: class Blob {},
  };

  vm.createContext(context);
  vm.runInContext(instrumented, context, { filename: utilsPath });
  return context.__testExports;
}

const {
  parseCSVLine,
  parseCSV,
  fmt,
  pct,
  escapeCSVField,
  isSplitConfigValid,
  buildProcessedTransactionsCSV,
  buildSplitLedgerCSV,
  getSplitShare,
} = loadUtilsForTest();
const normalize = (value) => JSON.parse(JSON.stringify(value));

test('parseCSVLine handles quoted commas and escaped quotes', () => {
  const row = '2026-01-31,"Coffee, Shop","He said ""hello""",12.34';
  assert.deepEqual(normalize(parseCSVLine(row)), [
    '2026-01-31',
    'Coffee, Shop',
    'He said "hello"',
    '12.34',
  ]);
});

test('parseCSVLine handles empty quoted fields and trailing commas', () => {
  const row = '"",Bank,Chequing,';
  assert.deepEqual(normalize(parseCSVLine(row)), ['', 'Bank', 'Chequing', '']);
});

test('parseCSV parses valid rows and trims headers and values', () => {
  const csv = `
Date,Description,Amount,Institution,Account_Type,Account_Name
2026-01-31, Groceries ,50.00,Bank,Chequing,Main Account
2026-02-01,Restaurant,-35.50,Bank,Credit Card,Visa
`.trim();

  assert.deepEqual(normalize(parseCSV(csv)), [
    {
      Date: '2026-01-31',
      Description: 'Groceries',
      Amount: '50.00',
      Institution: 'Bank',
      Account_Type: 'Chequing',
      Account_Name: 'Main Account',
    },
    {
      Date: '2026-02-01',
      Description: 'Restaurant',
      Amount: '-35.50',
      Institution: 'Bank',
      Account_Type: 'Credit Card',
      Account_Name: 'Visa',
    },
  ]);
});

test('parseCSV maps fields by header name even when columns are reordered', () => {
  const csv = `
Amount,Account_Name,Date,Description,Account_Type,Institution
19.99,Main,2026-04-01,Coffee,Chequing,Bank
`.trim();

  assert.deepEqual(normalize(parseCSV(csv)), [
    {
      Amount: '19.99',
      Account_Name: 'Main',
      Date: '2026-04-01',
      Description: 'Coffee',
      Account_Type: 'Chequing',
      Institution: 'Bank',
    },
  ]);
});

test('parseCSV keeps extra unexpected columns without breaking required ones', () => {
  const csv = `
Date,Description,Amount,Institution,Account_Type,Account_Name,Category
2026-04-01,Coffee,19.99,Bank,Chequing,Main,Food
`.trim();

  assert.deepEqual(normalize(parseCSV(csv)), [
    {
      Date: '2026-04-01',
      Description: 'Coffee',
      Amount: '19.99',
      Institution: 'Bank',
      Account_Type: 'Chequing',
      Account_Name: 'Main',
      Category: 'Food',
    },
  ]);
});

test('parseCSV drops rows with missing dates or invalid amounts', () => {
  const csv = `
Date,Description,Amount,Institution,Account_Type,Account_Name
,Missing Date,10.00,Bank,Chequing,Main
2026-01-31,Invalid Amount,nope,Bank,Chequing,Main
2026-02-01,Valid Row,-12.25,Bank,Credit Card,Visa
`.trim();

  assert.deepEqual(normalize(parseCSV(csv)), [
    {
      Date: '2026-02-01',
      Description: 'Valid Row',
      Amount: '-12.25',
      Institution: 'Bank',
      Account_Type: 'Credit Card',
      Account_Name: 'Visa',
    },
  ]);
});

test('parseCSV accepts amount strings that begin with currency symbols or grouped numbers', () => {
  const csv = `
Date,Description,Amount,Institution,Account_Type,Account_Name
2026-04-01,Salary,$1200.00,Bank,Chequing,Main
2026-04-02,Transfer,"1,234.56",Bank,Chequing,Savings
`.trim();

  assert.deepEqual(normalize(parseCSV(csv)), [
    {
      Date: '2026-04-02',
      Description: 'Transfer',
      Amount: '1,234.56',
      Institution: 'Bank',
      Account_Type: 'Chequing',
      Account_Name: 'Savings',
    },
  ]);
});

test('parseCSV trims whitespace in headers and preserves blank optional fields', () => {
  const csv = `
 Date , Description , Amount , Institution , Account_Type , Account_Name
2026-03-01,Rent,1200.00,,, 
`.trim();

  assert.deepEqual(normalize(parseCSV(csv)), [
    {
      Date: '2026-03-01',
      Description: 'Rent',
      Amount: '1200.00',
      Institution: '',
      Account_Type: '',
      Account_Name: '',
    },
  ]);
});

test('parseCSV ignores trailing blank lines and accepts zero amounts', () => {
  const csv = `
Date,Description,Amount,Institution,Account_Type,Account_Name
2026-03-10,Zero Row,0.00,Bank,Chequing,Main


`.trim();

  assert.deepEqual(normalize(parseCSV(csv)), [
    {
      Date: '2026-03-10',
      Description: 'Zero Row',
      Amount: '0.00',
      Institution: 'Bank',
      Account_Type: 'Chequing',
      Account_Name: 'Main',
    },
  ]);
});

test('escapeCSVField wraps values and escapes inner quotes', () => {
  assert.equal(escapeCSVField('Coffee "Shop", Downtown'), '"Coffee ""Shop"", Downtown"');
  assert.equal(escapeCSVField(''), '""');
});

test('isSplitConfigValid validates percentage and absolute totals with tolerance', () => {
  assert.equal(isSplitConfigValid({
    type: 'percentage',
    participants: [{ name: 'Me', value: 50 }, { name: 'Alex', value: 50 }],
  }, 42), true);
  assert.equal(isSplitConfigValid({
    type: 'percentage',
    participants: [{ name: 'Me', value: 50 }, { name: 'Alex', value: 49.97 }],
  }, 42), false);
  assert.equal(isSplitConfigValid({
    type: 'absolute',
    participants: [{ name: 'Me', value: 10 }, { name: 'Alex', value: 15.01 }],
  }, 25), true);
});

test('getSplitShare computes percentage, equal, and absolute shares', () => {
  assert.equal(getSplitShare({
    type: 'percentage',
    participants: [{ name: 'Me', value: 25 }, { name: 'Alex', value: 75 }],
  }, 80, { name: 'Me', value: 25 }), 20);
  assert.equal(getSplitShare({
    type: 'equal',
    participants: [{ name: 'Me', value: 0 }, { name: 'Alex', value: 0 }, { name: 'Sam', value: 0 }],
  }, 10, { name: 'Alex', value: 0 }), 3.33);
  assert.equal(getSplitShare({
    type: 'absolute',
    participants: [{ name: 'Me', value: 12.34 }],
  }, 80, { name: 'Me', value: 12.34 }), 12.34);
});

test('buildProcessedTransactionsCSV exports only processed rows and escapes text fields', () => {
  const raw = [
    {
      id: 't1',
      raw: {
        Date: '2026-04-01',
        Description: 'Coffee "Shop", Downtown',
        Amount: '12.34',
        Institution: 'Bank',
        Account_Type: 'Chequing',
        Account_Name: 'Main',
      },
    },
    {
      id: 't2',
      raw: {
        Date: '2026-04-02',
        Description: 'Ignored pending row',
        Amount: '5.00',
        Institution: 'Bank',
        Account_Type: 'Chequing',
        Account_Name: 'Main',
      },
    },
  ];
  const derived = {
    currentIndex: 1,
    transactions: {
      t1: { id: 't1', status: 'kept', isSplit: true, note: 'Paid by "me"' },
      t2: { id: 't2', status: 'pending', note: 'skip' },
    },
  };

  assert.equal(
    buildProcessedTransactionsCSV(raw, derived),
    'id,date,description,amount,institution,account_type,account_name,status,is_split,note\n' +
    't1,2026-04-01,"Coffee ""Shop"", Downtown",12.34,"Bank","Chequing","Main",kept,true,"Paid by ""me"""'
  );
});

test('buildSplitLedgerCSV exports kept split transactions for percentage, equal, and absolute modes', () => {
  const raw = [
    { id: 'p1', raw: { Amount: '100.00' } },
    { id: 'p2', raw: { Amount: '-10.00' } },
    { id: 'p3', raw: { Amount: '42.00' } },
    { id: 'p4', raw: { Amount: '50.00' } },
  ];
  const derived = {
    currentIndex: 4,
    transactions: {
      p1: {
        status: 'kept',
        isSplit: true,
        splitConfig: {
          type: 'percentage',
          participants: [{ name: 'Me', value: 25 }, { name: 'Alex', value: 75 }],
        },
      },
      p2: {
        status: 'kept',
        isSplit: true,
        splitConfig: {
          type: 'equal',
          participants: [{ name: 'Me', value: 0 }, { name: 'Alex', value: 0 }, { name: 'Sam', value: 0 }],
        },
      },
      p3: {
        status: 'kept',
        isSplit: true,
        splitConfig: {
          type: 'absolute',
          participants: [{ name: 'Me', value: 12 }, { name: 'Alex', value: 30 }],
        },
      },
      p4: {
        status: 'discarded',
        isSplit: true,
        splitConfig: {
          type: 'percentage',
          participants: [{ name: 'Me', value: 50 }, { name: 'Alex', value: 50 }],
        },
      },
    },
  };

  assert.equal(
    buildSplitLedgerCSV(raw, derived),
    'transaction_id,person,amount\n' +
    'p1,Me,25\n' +
    'p1,Alex,75\n' +
    'p2,Me,3.33\n' +
    'p2,Alex,3.33\n' +
    'p2,Sam,3.33\n' +
    'p3,Me,12\n' +
    'p3,Alex,30'
  );
});

test('fmt returns currency strings and preserves negative sign', () => {
  assert.equal(fmt(12.3), '$12.30');
  assert.equal(fmt(-45.678), '-$45.68');
  assert.equal(fmt(-0), '$0.00');
  assert.equal(fmt('12.5'), '$12.50');
  assert.equal(fmt(null), '$0.00');
  assert.equal(fmt(undefined), '$0.00');
  assert.equal(fmt('bad-input'), '$0.00');
});

test('pct handles normal and divide-by-zero cases', () => {
  assert.equal(pct(25, 100), 25);
  assert.equal(pct(1, 3), 33);
  assert.equal(pct(0, 5), 0);
  assert.equal(pct(-5, 10), -50);
  assert.equal(pct(2, 3), 67);
  assert.equal(pct(5, 0), 0);
});
