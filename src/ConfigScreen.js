// ===== CONFIG SCREEN =====
function ConfigScreen({ onStart }) {
  const [cfg, setCfg] = useState(DEFAULT_CONFIG);
  const [csvText, setCsvText] = useState(null);
  const [stateJson, setStateJson] = useState(null);
  const [newPerson, setNewPerson] = useState('');
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(null);
  const [statePath, setStatePath] = useState('audit-state');
  const [autoLoadAttempted, setAutoLoadAttempted] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef();
  const stateRef = useRef();
  const dragRef = useRef();

  // Load config and saved state on mount
  useEffect(() => {
    const init = async () => {
      try {
        await loadConfigFromServer();
        setCfg(DEFAULT_CONFIG);
        setStatePath(DEFAULT_CONFIG.statePath || 'audit-state');
      } catch (e) {
        console.log('Using default config');
      }

      // Auto-load saved state from localStorage
      const saved = localStorage.getItem(`state_${statePath}`);
      if (saved) {
        try {
          setStateJson(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to load saved state:', e);
        }
      }
      setAutoLoadAttempted(true);
      setLoading(false);
    };

    if (!autoLoadAttempted) {
      init();
    }
  }, []);

  const handleCSV = (e) => {
    const f = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target.result);
    reader.readAsText(f);
    setDragActive(null);
  };

  const handleState = (e) => {
    const f = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        setStateJson(data);
        localStorage.setItem(`state_${statePath}`, ev.target.result);
      } catch {
        setError('Invalid state file');
      }
    };
    reader.readAsText(f);
    setDragActive(null);
  };

  const handleDrag = (e, zone) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(zone);
    } else if (e.type === 'dragleave') {
      setDragActive(null);
    }
  };

  const handleDropCSV = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer?.files?.[0];
    if (f?.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (ev) => setCsvText(ev.target.result);
      reader.readAsText(f);
    }
    setDragActive(null);
  };

  const loadSampleCSV = async () => {
    try {
      const response = await fetch('/api/sample-csv');
      if (response.ok) {
        const csv = await response.text();
        setCsvText(csv);
      } else {
        setError('Failed to load sample CSV');
      }
    } catch (e) {
      setError('Could not load sample CSV. Make sure server is running.');
    }
  };

  const handleDropState = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer?.files?.[0];
    if (f?.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          setStateJson(data);
          localStorage.setItem(`state_${statePath}`, ev.target.result);
        } catch {
          setError('Invalid state file');
        }
      };
      reader.readAsText(f);
    }
    setDragActive(null);
  };

  const addPerson = () => {
    const n = newPerson.trim();
    if (n && !cfg.people.includes(n)) {
      setCfg(p => ({ ...p, people: [...p.people, n] }));
      setNewPerson('');
    }
  };

  const removePerson = (name) => setCfg(p => ({ ...p, people: p.people.filter(x => x !== name) }));

  const start = () => {
    if (!csvText) {
      setError('Please upload a CSV file');
      return;
    }
    const rows = parseCSV(csvText);
    if (!rows.length) {
      setError('No valid transactions found in CSV');
      return;
    }
    const filtered = rows.filter(r => r.Date >= cfg.filters.startDate && r.Date <= cfg.filters.endDate);
    if (!filtered.length) {
      setError(`No transactions in date range ${cfg.filters.startDate} – ${cfg.filters.endDate}`);
      return;
    }
    const raw = filtered.map(r => ({
      id: uid(),
      raw: {
        Date: r.Date,
        Description: r.Description,
        Amount: parseFloat(r.Amount),
        Institution: r.Institution,
        Account_Type: r.Account_Type,
        Account_Name: r.Account_Name
      }
    }));
    let derived = { currentIndex: 0, transactions: {} };
    if (stateJson) {
      derived.currentIndex = stateJson.currentIndex || 0;
      (stateJson.transactions || []).forEach((t, i) => {
        if (i < raw.length) {
          const mapped = { ...t, id: raw[i].id };
          derived.transactions[raw[i].id] = mapped;
        }
      });
    }
    onStart(cfg, raw, derived, statePath);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Transaction Audit & Split</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Load your CSV, configure settings, and start auditing.</p>
          </div>
          <DarkModeToggle />
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg text-sm">{error}</div>}

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Upload Transactions CSV</label>
          <div
            ref={dragRef}
            onDragEnter={(e) => handleDrag(e, 'csv')}
            onDragLeave={(e) => handleDrag(e, null)}
            onDragOver={(e) => handleDrag(e, 'csv')}
            onDrop={handleDropCSV}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition ${dragActive === 'csv' ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50'}`}
          >
            <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} className="hidden" />
            <div className="flex flex-col items-center gap-2">
              <div className="text-2xl">📄</div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Drag CSV here or <button onClick={() => fileRef.current.click()} className="text-blue-600 dark:text-blue-400 hover:underline">click to browse</button></p>
              <p className="text-xs text-slate-500 dark:text-slate-400">or</p>
              <button onClick={loadSampleCSV} className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/60 transition font-medium">Load Sample Data</button>
              {csvText && <p className="text-xs text-emerald-600 dark:text-emerald-400">✓ {parseCSV(csvText).length} rows loaded</p>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
            <input type="date" value={cfg.filters.startDate} onChange={e => setCfg(p => ({ ...p, filters: { ...p.filters, startDate: e.target.value } }))} className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">End Date</label>
            <input type="date" value={cfg.filters.endDate} onChange={e => setCfg(p => ({ ...p, filters: { ...p.filters, endDate: e.target.value } }))} className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">People (for splits)</label>
          <div className="flex flex-wrap gap-2">
            {cfg.people.map(p => (
              <span key={p} className="inline-flex items-center gap-1 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-3 py-1 rounded-full text-sm">
                {p}
                <button onClick={() => removePerson(p)} className="text-violet-400 dark:text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 ml-1 font-bold">&times;</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newPerson} onChange={e => setNewPerson(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPerson()} placeholder="Add person…" className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
            <button onClick={addPerson} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 dark:bg-violet-700 dark:hover:bg-violet-600 text-white rounded-lg text-sm font-medium transition">Add</button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">State File Management</label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={statePath}
                onChange={e => setStatePath(e.target.value)}
                placeholder="e.g. audit-state"
                className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500 self-center whitespace-nowrap">Auto-save path</span>
            </div>
            <div
              onDragEnter={(e) => handleDrag(e, 'state')}
              onDragLeave={(e) => handleDrag(e, null)}
              onDragOver={(e) => handleDrag(e, 'state')}
              onDrop={handleDropState}
              className={`border-2 border-dashed rounded-lg p-4 text-center transition ${dragActive === 'state' ? 'border-violet-500 dark:border-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50'}`}
            >
              <input ref={stateRef} type="file" accept=".json" onChange={handleState} className="hidden" />
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Drag state JSON here or <button onClick={() => stateRef.current.click()} className="text-violet-600 dark:text-violet-400 hover:underline">click to load</button>
                {stateJson && <span className="block text-emerald-600 dark:text-emerald-400 mt-1">✓ Session loaded ({(stateJson.transactions || []).length} decisions)</span>}
              </p>
            </div>
          </div>
        </div>

        <button onClick={start} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded-xl text-base font-semibold transition shadow-lg shadow-emerald-200 dark:shadow-none">Start Audit Session</button>
      </div>
    </div>
  );
}
