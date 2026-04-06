// ===== MAIN APP =====
// Top-level state: screen, config, raw transactions, derived audit state, view position.
// Auto-saves to localStorage + server every 500ms (debounced).
function App() {
  const [screen, setScreen] = useState('config');
  const [config, setConfig] = useState(null);
  const [raw, setRaw] = useState([]);
  const [derived, setDerived] = useState({ currentIndex: 0, transactions: {} });
  const [viewIndex, setViewIndex] = useState(0);
  const [statePath, setStatePath] = useState('audit-state');
  const [lastSave, setLastSave] = useState(null);

  const handleStart = (cfg, rawTxns, derivedState, path) => {
    setConfig(cfg);
    setRaw(rawTxns);
    setDerived(derivedState);
    setStatePath(path || 'audit-state');
    setScreen('audit');
  };

  // Auto-save to localStorage + server whenever derived changes
  useEffect(() => {
    if (screen !== 'audit' || !statePath) return;
    const timer = setTimeout(() => {
      const stateObj = {
        currentIndex: derived.currentIndex,
        transactions: Object.values(derived.transactions),
      };
      localStorage.setItem(`state_${statePath}`, JSON.stringify(stateObj));
      fetch('/api/save-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stateObj),
      }).catch(() => {}); // silently ignore if server not running
      setLastSave(new Date().toLocaleTimeString());
    }, 500);
    return () => clearTimeout(timer);
  }, [derived, screen, statePath]);

  const statePathRef = useRef(statePath);

  useEffect(() => {
    setViewIndex(derived.currentIndex);
  }, [derived.currentIndex]);

  const viewTxn = raw[viewIndex];
  const viewDerived = viewTxn ? derived.transactions[viewTxn.id] : null;

  const handleKeepView = useCallback(() => {
    if (!viewTxn) return;
    const d = derived.transactions[viewTxn.id];
    if (d?.isSplit && d.splitConfig) {
      const sc = d.splitConfig;
      const total = sc.participants.reduce((s, p) => s + p.value, 0);
      const target = sc.type === 'percentage' ? 100 : Math.abs(viewTxn.raw.Amount);
      if (Math.abs(total - target) >= 0.02) return;
    }
    setDerived(prev => {
      const newProgress = viewIndex >= prev.currentIndex ? viewIndex + 1 : prev.currentIndex;
      return {
        ...prev,
        currentIndex: newProgress,
        transactions: {
          ...prev.transactions,
          [viewTxn.id]: { ...prev.transactions[viewTxn.id], id: viewTxn.id, status: 'kept' },
        },
      };
    });
    setViewIndex(viewIndex + 1);
  }, [viewTxn, viewIndex, derived]);

  const handleDiscardView = useCallback(() => {
    if (!viewTxn) return;
    setDerived(prev => {
      const newProgress = viewIndex >= prev.currentIndex ? viewIndex + 1 : prev.currentIndex;
      return {
        ...prev,
        currentIndex: newProgress,
        transactions: {
          ...prev.transactions,
          [viewTxn.id]: { id: viewTxn.id, status: 'discarded', isSplit: false, note: prev.transactions[viewTxn.id]?.note || '' },
        },
      };
    });
    setViewIndex(viewIndex + 1);
  }, [viewTxn, viewIndex, derived]);

  const handleUndoView = useCallback(() => {
    const target = viewIndex > 0 ? viewIndex - 1 : 0;
    if (target < 0) return;
    const prevTxn = raw[target];
    setDerived(prev => ({
      ...prev,
      currentIndex: target,
      transactions: {
        ...prev.transactions,
        [prevTxn.id]: { ...prev.transactions[prevTxn.id], status: 'pending' },
      },
    }));
    setViewIndex(target);
  }, [viewIndex, raw]);

  const updateDerivedView = useCallback((patch) => {
    if (!viewTxn) return;
    setDerived(prev => ({
      ...prev,
      transactions: {
        ...prev.transactions,
        [viewTxn.id]: { ...prev.transactions[viewTxn.id], id: viewTxn.id, ...patch },
      },
    }));
  }, [viewTxn]);

  useEffect(() => {
    if (screen !== 'audit') return;
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); handleKeepView(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); handleDiscardView(); }
      else if (e.key === 'u' || e.key === 'U') { e.preventDefault(); handleUndoView(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [screen, handleKeepView, handleDiscardView, handleUndoView]);

  const handleExport = useCallback((type) => {
    if (type === 'state') {
      const stateObj = {
        currentIndex: derived.currentIndex,
        transactions: Object.values(derived.transactions),
      };
      dl(JSON.stringify(stateObj, null, 2), 'audit-state.json', 'application/json');
    } else if (type === 'csv') {
      const headers = 'id,date,description,amount,institution,account_type,account_name,status,is_split,note';
      const rows = raw.map(t => {
        const d = derived.transactions[t.id] || {};
        if (!d.status || d.status === 'pending') return null;
        const esc = (s) => `"${String(s || '').replace(/"/g, '""')}"`;
        return [t.id, t.raw.Date, esc(t.raw.Description), t.raw.Amount, esc(t.raw.Institution), esc(t.raw.Account_Type), esc(t.raw.Account_Name), d.status, d.isSplit || false, esc(d.note || '')].join(',');
      }).filter(Boolean);
      dl(headers + '\n' + rows.join('\n'), 'processed-transactions.csv', 'text/csv');
    } else if (type === 'split') {
      const headers = 'transaction_id,person,amount';
      const rows = [];
      raw.forEach(t => {
        const d = derived.transactions[t.id];
        if (d?.status !== 'kept' || !d.isSplit || !d.splitConfig) return;
        const sc = d.splitConfig;
        const absAmt = Math.abs(t.raw.Amount);
        sc.participants.forEach(p => {
          let share;
          if (sc.type === 'percentage') share = +(absAmt * p.value / 100).toFixed(2);
          else if (sc.type === 'equal') share = +(absAmt / sc.participants.length).toFixed(2);
          else share = p.value;
          rows.push(`${t.id},${p.name},${share}`);
        });
      });
      dl(headers + '\n' + rows.join('\n'), 'split-ledger.csv', 'text/csv');
    }
  }, [raw, derived]);

  if (screen === 'config') return <ConfigScreen onStart={handleStart} />;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <div className="w-64 flex-shrink-0">
        <LeftPanel raw={raw} derived={derived} currentIndex={viewIndex} onNavigate={(i) => { if (i <= derived.currentIndex) setViewIndex(i); }} />
      </div>
      <div className="flex-1 min-w-0">
        <CenterPanel
          txn={viewTxn}
          derived={viewDerived}
          config={config}
          onKeep={handleKeepView}
          onDiscard={handleDiscardView}
          onUndo={handleUndoView}
          onUpdateDerived={updateDerivedView}
          canUndo={viewIndex > 0}
          isComplete={viewIndex >= raw.length}
        />
      </div>
      <div className="w-80 flex-shrink-0">
        <RightPanel raw={raw} derived={derived} config={config} onExport={handleExport} lastSave={lastSave} />
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
