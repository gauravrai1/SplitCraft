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

function escapeCSVField(value) {
  return `"${String(value || '').replace(/"/g, '""')}"`;
}

function isSplitConfigValid(splitConfig, amount) {
  if (!splitConfig) return true;
  const participants = splitConfig.participants || [];
  const total = participants.reduce((sum, participant) => sum + participant.value, 0);
  const target = splitConfig.type === 'percentage' ? 100 : Math.abs(amount);
  return Math.abs(total - target) < 0.02;
}

function buildProcessedTransactionsCSV(raw, derived) {
  const headers = 'id,date,description,amount,institution,account_type,account_name,status,is_split,note';
  const rows = raw.map(t => {
    const d = derived.transactions[t.id] || {};
    if (!d.status || d.status === 'pending') return null;
    return [
      t.id,
      t.raw.Date,
      escapeCSVField(t.raw.Description),
      t.raw.Amount,
      escapeCSVField(t.raw.Institution),
      escapeCSVField(t.raw.Account_Type),
      escapeCSVField(t.raw.Account_Name),
      d.status,
      d.isSplit || false,
      escapeCSVField(d.note || ''),
    ].join(',');
  }).filter(Boolean);
  return headers + '\n' + rows.join('\n');
}

function getSplitShare(splitConfig, absAmount, participant) {
  if (splitConfig.type === 'percentage') return +(absAmount * participant.value / 100).toFixed(2);
  if (splitConfig.type === 'equal') return +(absAmount / splitConfig.participants.length).toFixed(2);
  return participant.value;
}

function buildSplitLedgerCSV(raw, derived) {
  const headers = 'transaction_id,person,amount';
  const rows = [];
  raw.forEach(t => {
    const d = derived.transactions[t.id];
    if (d?.status !== 'kept' || !d.isSplit || !d.splitConfig) return;
    const absAmount = Math.abs(t.raw.Amount);
    d.splitConfig.participants.forEach(participant => {
      rows.push(`${t.id},${participant.name},${getSplitShare(d.splitConfig, absAmount, participant)}`);
    });
  });
  return headers + '\n' + rows.join('\n');
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
