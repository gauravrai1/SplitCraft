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

function getTransactionStatus(derivedEntry) {
  return derivedEntry?.status || 'pending';
}

function getAllTransactions(raw, derived) {
  return raw.map(t => ({ ...t, d: derived.transactions[t.id] || {} }));
}

function matchesDateFilter(date, filterType, customStart, customEnd) {
  const now = new Date();
  if (filterType === 'thisMonth') {
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return date.startsWith(ym);
  }
  if (filterType === 'lastMonth') {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return date.startsWith(ym);
  }
  if (filterType === 'custom') {
    if (customStart && date < customStart) return false;
    if (customEnd && date > customEnd) return false;
  }
  return true;
}

function transactionIncludesPerson(transaction, person) {
  if (person === 'all') return true;
  const participants = transaction.d?.splitConfig?.participants || [];
  return participants.some(p => p.name === person);
}

function getFilteredTransactions(raw, derived, filters = {}) {
  const {
    filterType = 'all',
    customStart = '',
    customEnd = '',
    statusFilter = 'audited',
    splitFilter = 'all',
    personFilter = 'all',
    search = '',
  } = filters;

  const searchText = search.trim().toLowerCase();

  return getAllTransactions(raw, derived).filter(transaction => {
    const status = getTransactionStatus(transaction.d);
    if (statusFilter === 'audited' && status === 'pending') return false;
    if (statusFilter !== 'all' && statusFilter !== 'audited' && status !== statusFilter) return false;

    if (!matchesDateFilter(transaction.raw.Date, filterType, customStart, customEnd)) return false;

    if (splitFilter === 'split' && !transaction.d?.isSplit) return false;
    if (splitFilter === 'nonSplit' && transaction.d?.isSplit) return false;

    if (!transactionIncludesPerson(transaction, personFilter)) return false;

    if (searchText) {
      const haystack = [
        transaction.raw.Description,
        transaction.raw.Institution,
        transaction.raw.Account_Type,
        transaction.raw.Account_Name,
      ].join(' ').toLowerCase();
      if (!haystack.includes(searchText)) return false;
    }

    return true;
  });
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

function getSplitShare(splitConfig, absAmount, participant) {
  if (splitConfig.type === 'percentage') return +(absAmount * participant.value / 100).toFixed(2);
  if (splitConfig.type === 'equal') return +(absAmount / splitConfig.participants.length).toFixed(2);
  return participant.value;
}

function buildSplitLedgerCSV(raw, derived, filters) {
  const headers = 'transaction_id,person,amount';
  const rows = [];
  getFilteredTransactions(raw, derived, filters).forEach(t => {
    const d = t.d;
    if (d?.status !== 'kept' || !d.isSplit || !d.splitConfig) return;
    const absAmount = Math.abs(t.raw.Amount);
    d.splitConfig.participants.forEach(participant => {
      rows.push(`${t.id},${participant.name},${getSplitShare(d.splitConfig, absAmount, participant)}`);
    });
  });
  return headers + '\n' + rows.join('\n');
}

function buildProcessedTransactionsCSV(raw, derived, filters) {
  const headers = 'id,date,description,amount,institution,account_type,account_name,status,is_split,note';
  const rows = getFilteredTransactions(raw, derived, filters).map(t => {
    const d = t.d || {};
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

function computeAnalysisStats(raw, derived, filters = {}) {
  const all = getAllTransactions(raw, derived);
  const filtered = getFilteredTransactions(raw, derived, filters);
  const processed = all.filter(t => ['kept', 'discarded'].includes(getTransactionStatus(t.d)));
  const kept = all.filter(t => getTransactionStatus(t.d) === 'kept');
  const discarded = all.filter(t => getTransactionStatus(t.d) === 'discarded');
  const filteredKept = filtered.filter(t => getTransactionStatus(t.d) === 'kept');
  const filteredDiscarded = filtered.filter(t => getTransactionStatus(t.d) === 'discarded');

  const personMap = {};
  let myShare = 0;

  filteredKept.forEach(t => {
    if (t.d?.isSplit && t.d.splitConfig) {
      const sc = t.d.splitConfig;
      const absAmt = Math.abs(t.raw.Amount);
      sc.participants.forEach(p => {
        const share = getSplitShare(sc, absAmt, p);
        if (p.name === 'Me') myShare += share;
        else personMap[p.name] = (personMap[p.name] || 0) + share;
      });
    } else {
      myShare += Math.abs(t.raw.Amount);
    }
  });

  const owedToYou = Object.values(personMap).filter(v => v > 0).reduce((sum, value) => sum + value, 0);

  return {
    total: raw.length,
    processed: processed.length,
    kept: kept.length,
    discarded: discarded.length,
    filteredCount: filtered.length,
    filteredKept: filteredKept.length,
    filteredDiscarded: filteredDiscarded.length,
    totalKept: filteredKept.reduce((sum, t) => sum + t.raw.Amount, 0),
    totalSplit: filteredKept.filter(t => t.d?.isSplit).length,
    myShare,
    owedToYou,
    personMap,
    filtered,
  };
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
