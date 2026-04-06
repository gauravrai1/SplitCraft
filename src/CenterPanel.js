// ===== CENTER PANEL =====
// Main transaction review area. Shows transaction details, split editor,
// note field, and Keep/Discard/Undo actions with keyboard shortcut hints.
function CenterPanel({ txn, derived, config, onKeep, onDiscard, onUndo, onUpdateDerived, canUndo, isComplete }) {
  const [splitMode, setSplitMode] = useState(false);
  const [note, setNote] = useState('');
  const noteRef = useRef();

  useEffect(() => {
    const d = derived || {};
    setSplitMode(d.isSplit || false);
    setNote(d.note || '');
  }, [txn?.id, derived]);

  const updateNote = (val) => {
    setNote(val);
    onUpdateDerived({ note: val });
  };

  const toggleSplit = () => {
    const next = !splitMode;
    setSplitMode(next);
    if (next) {
      onUpdateDerived({ isSplit: true, splitConfig: derived?.splitConfig || { ...config.defaultSplit, participants: config.defaultSplit.participants.map(p => ({ ...p })) } });
    } else {
      onUpdateDerived({ isSplit: false, splitConfig: undefined });
    }
  };

  const handleSplitChange = (sc) => onUpdateDerived({ splitConfig: sc });

  if (isComplete) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center space-y-4">
          <div className="text-6xl">🎉</div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Audit Complete!</h2>
          <p className="text-slate-500 dark:text-slate-400">All transactions have been reviewed.</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">Use the export buttons in the right panel to download your results.</p>
          {canUndo && <button onClick={onUndo} className="mt-4 px-6 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition">← Go Back (U)</button>}
        </div>
      </div>
    );
  }

  if (!txn) return <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500">No transaction selected</div>;

  const r = txn.raw;
  const status = derived?.status || 'pending';
  const splitValid = !splitMode || !derived?.splitConfig || (() => {
    const sc = derived.splitConfig;
    const total = sc.participants.reduce((s, p) => s + p.value, 0);
    const target = sc.type === 'percentage' ? 100 : Math.abs(r.Amount);
    return Math.abs(total - target) < 0.02;
  })();

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-xl mx-auto space-y-5">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className={`px-6 py-4 ${r.Amount < 0 ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-slate-800 dark:bg-slate-700'}`}>
            <p className="text-3xl font-bold text-white tabular-nums">{fmt(r.Amount)}</p>
            <p className="text-sm text-white/70 mt-1">{r.Amount < 0 ? 'Payment / Credit' : 'Charge / Debit'}</p>
          </div>
          <div className="px-6 py-4 space-y-3">
            <div>
              <p className="text-lg font-semibold text-slate-800 dark:text-white">{r.Description}</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">{r.Date}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">{r.Institution}</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">{r.Account_Type}</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{r.Account_Name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Mode:</span>
          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
            <button onClick={() => splitMode && toggleSplit()} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${!splitMode ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow dark:shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Normal</button>
            <button onClick={() => !splitMode && toggleSplit()} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${splitMode ? 'bg-violet-600 dark:bg-violet-700 text-white shadow dark:shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Split</button>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">Press S to toggle</span>
        </div>

        {splitMode && (
          <SplitEditor
            splitConfig={derived?.splitConfig}
            amount={r.Amount}
            people={config.people}
            onChange={handleSplitChange}
          />
        )}

        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Note (optional)</label>
          <input
            ref={noteRef}
            value={note}
            onChange={e => updateNote(e.target.value)}
            placeholder="e.g. Dinner with friends"
            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500"
            onKeyDown={e => e.stopPropagation()}
          />
        </div>

        <div className="flex items-center gap-3">
          {canUndo && (
            <button onClick={onUndo} className="px-5 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition flex items-center gap-2">
              <span>↩</span> Undo <kbd className="ml-1 px-1.5 py-0.5 bg-slate-300 dark:bg-slate-600 rounded text-xs">U</kbd>
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onDiscard} className="px-6 py-3 bg-rose-500 dark:bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-600 dark:hover:bg-rose-700 transition shadow-lg shadow-rose-200 dark:shadow-none flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-rose-600 dark:bg-rose-700 rounded text-xs">←</kbd> Discard
          </button>
          <button
            onClick={onKeep}
            disabled={!splitValid}
            className={`px-6 py-3 rounded-xl text-sm font-semibold transition shadow-lg flex items-center gap-2 ${splitValid ? 'bg-emerald-500 dark:bg-emerald-600 text-white hover:bg-emerald-600 dark:hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none' : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none'}`}
          >
            Add <kbd className={`px-1.5 py-0.5 rounded text-xs ${splitValid ? 'bg-emerald-600 dark:bg-emerald-700' : 'bg-slate-400 dark:bg-slate-600'}`}>→</kbd>
          </button>
        </div>

        {status !== 'pending' && (
          <div className={`text-center text-sm font-medium rounded-lg py-2 ${status === 'kept' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
            This transaction was {status === 'kept' ? 'added ✓' : 'discarded ✗'} — you can change your decision
          </div>
        )}
      </div>
    </div>
  );
}
