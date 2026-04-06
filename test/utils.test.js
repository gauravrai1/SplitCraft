import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import vm from 'vm';

function loadUtilsForTest() {
  const utilsPath = path.resolve('src/utils.js');
  const source = fs.readFileSync(utilsPath, 'utf8');
  const instrumented = `${source}\n;globalThis.__testExports = { parseCSVLine, parseCSV, fmt, pct };`;

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

const { parseCSVLine, parseCSV, fmt, pct } = loadUtilsForTest();
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

test('fmt returns currency strings and preserves negative sign', () => {
  assert.equal(fmt(12.3), '$12.30');
  assert.equal(fmt(-45.678), '-$45.68');
  assert.equal(fmt('bad-input'), '$0.00');
});

test('pct handles normal and divide-by-zero cases', () => {
  assert.equal(pct(25, 100), 25);
  assert.equal(pct(1, 3), 33);
  assert.equal(pct(5, 0), 0);
});
