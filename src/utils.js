const { useState, useEffect, useCallback, useMemo, useRef } = React;

// ===== UTILITIES =====
const uid = () => 't' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function parseCSVLine(line) {
  const r = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; }
      else q = !q;
    } else if (c === ',' && !q) {
      r.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  r.push(cur);
  return r;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const hdr = parseCSVLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(l => {
    const v = parseCSVLine(l);
    const o = {};
    hdr.forEach((h, i) => (o[h] = (v[i] || '').trim()));
    return o;
  }).filter(r => r.Date && r.Amount && !isNaN(parseFloat(r.Amount)));
}

function dl(content, name, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

const fmt = (n) => {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(v)) return '$0.00';
  return (v < 0 ? '-' : '') + '$' + Math.abs(v).toFixed(2);
};

const pct = (a, b) => (b === 0 ? 0 : Math.round((a / b) * 100));

let DEFAULT_CONFIG = {
  defaultSplit: { type: 'percentage', participants: [{ name: 'Me', value: 50 }, { name: 'Other', value: 50 }] },
  people: ['Alice', 'Bob', 'Charlie'],
  filters: { startDate: '', endDate: '' },
};

async function loadConfigFromServer() {
  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      DEFAULT_CONFIG = await response.json();
    }
  } catch (e) {
    console.log('Using default config (server not available)');
  }
}
