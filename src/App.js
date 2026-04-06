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
  const [mode, setMode] = useState('audit');
  const [analysisFilters, setAnalysisFilters] = useState({
    filterType: 'all',
    customStart: '',
    customEnd: '',
    statusFilter: 'audited',
    splitFilter: 'all',
    personFilter: 'all',
    search: '',
  });
  const wasCompleteRef = useRef(false);

  const handleStart = (cfg, rawTxns, derivedState, path) => {
    setConfig(cfg);
    setRaw(rawTxns);
    setDerived(derivedState);
    setStatePath(path || 'audit-state');
    setMode('audit');
    setAnalysisFilters({
      filterType: 'all',
      customStart: cfg.filters.startDate || '',
      customEnd: cfg.filters.endDate || '',
      statusFilter: 'audited',
      splitFilter: 'all',
      personFilter: 'all',
      search: '',
    });
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

  useEffect(() => {
    setViewIndex(Math.min(derived.currentIndex, Math.max(raw.length - 1, 0)));
  }, [derived.currentIndex, raw.length]);

  const isComplete = raw.length > 0 && derived.currentIndex >= raw.length;

  useEffect(() => {
    if (isComplete && !wasCompleteRef.current) setMode('analysis');
    if (!isComplete) setMode('audit');
    wasCompleteRef.current = isComplete;
  }, [isComplete]);

  const viewTxn = raw[viewIndex];
  const viewDerived = viewTxn ? derived.transactions[viewTxn.id] : null;

  const handleKeepView = useCallback(() => {
    if (!viewTxn) return;
    const d = derived.transactions[viewTxn.id];
    if (d?.isSplit && d.splitConfig && !isSplitConfigValid(d.splitConfig, viewTxn.raw.Amount)) {
      return;
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
    const nextIndex = viewIndex + 1;
    setViewIndex(nextIndex);
    if (nextIndex >= raw.length) setMode('analysis');
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
    const nextIndex = viewIndex + 1;
    setViewIndex(nextIndex);
    if (nextIndex >= raw.length) setMode('analysis');
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

  const handleExport = useCallback((type, filters) => {
    if (type === 'state') {
      const stateObj = {
        currentIndex: derived.currentIndex,
        transactions: Object.values(derived.transactions),
      };
      dl(JSON.stringify(stateObj, null, 2), 'audit-state.json', 'application/json');
    } else if (type === 'csv') {
      dl(buildProcessedTransactionsCSV(raw, derived, filters), 'processed-transactions.csv', 'text/csv');
    } else if (type === 'split') {
      dl(buildSplitLedgerCSV(raw, derived, filters), 'split-ledger.csv', 'text/csv');
    }
  }, [raw, derived]);

  if (screen === 'config') return <ConfigScreen onStart={handleStart} />;

  if (mode === 'analysis' && isComplete) {
    return (
      <AnalysisScreen
        raw={raw}
        derived={derived}
        config={config}
        filters={analysisFilters}
        onFiltersChange={setAnalysisFilters}
        onBack={() => {
          setMode('audit');
          setViewIndex(Math.max(raw.length - 1, 0));
        }}
        onExport={handleExport}
        lastSave={lastSave}
      />
    );
  }

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
          isComplete={false}
        />
      </div>
      <div className="w-80 flex-shrink-0">
        <RightPanel raw={raw} derived={derived} onExport={handleExport} onOpenAnalysis={() => setMode('analysis')} isComplete={isComplete} lastSave={lastSave} />
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
