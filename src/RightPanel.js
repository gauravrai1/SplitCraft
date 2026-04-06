// ===== RIGHT PANEL =====
// Compact progress and summary view used during auditing.
function RightPanel({ raw, derived, onExport, onOpenAnalysis, isComplete, lastSave }) {
  const stats = useMemo(() => computeAnalysisStats(raw, derived, { statusFilter: 'audited' }), [raw, derived]);

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 p-4 space-y-5">
      {lastSave && (
        <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 text-xs">
          <p className="text-emerald-700 dark:text-emerald-400 font-medium">✓ Auto-saved</p>
          <p className="text-emerald-600 dark:text-emerald-500">{lastSave}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex-1">Progress</h3>
        <DarkModeToggle />
      </div>

      {isComplete && (
        <button onClick={onOpenAnalysis} className="w-full py-2.5 rounded-lg text-sm font-medium bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition">
          Open Analysis Workspace
        </button>
      )}

      <div>
        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 mb-2">
          <div className="bg-blue-500 dark:bg-blue-600 h-2.5 rounded-full transition-all" style={{ width: `${pct(stats.processed, stats.total)}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
            <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{stats.processed}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Processed</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-2">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.kept}</p>
            <p className="text-xs text-emerald-500 dark:text-emerald-600">Kept</p>
          </div>
          <div className="bg-rose-50 dark:bg-rose-900/30 rounded-lg p-2">
            <p className="text-lg font-bold text-rose-500 dark:text-rose-400">{stats.discarded}</p>
            <p className="text-xs text-rose-400 dark:text-rose-600">Discarded</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-1">{stats.total - stats.processed} remaining</p>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Total Kept (gross)</span>
            <span className="text-sm font-bold tabular-nums dark:text-white">{fmt(stats.totalKept)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">My Actual Share</span>
            <span className="text-sm font-bold tabular-nums text-blue-600 dark:text-blue-400">{fmt(stats.myShare)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Owed to You</span>
            <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(stats.owedToYou)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Split Transactions</span>
            <span className="text-sm font-bold tabular-nums text-violet-600 dark:text-violet-400">{stats.totalSplit}</span>
          </div>
        </div>
      </div>

      {Object.keys(stats.personMap).length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Per Person (owes you)</h3>
          <div className="space-y-1">
            {Object.entries(stats.personMap).sort((a, b) => b[1] - a[1]).map(([name, amt]) => (
              <div key={name} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{name}</span>
                <span className={`text-sm font-bold tabular-nums ${amt >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{amt >= 0 ? '+' : ''}{fmt(amt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Export</h3>
        <div className="space-y-2">
          {[
            { key: 'state', label: 'Save State (JSON)', style: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600', info: 'Your full session checkpoint — current position and every decision made. Load this back into the app to resume exactly where you left off.' },
            { key: 'csv', label: 'Export Transactions (CSV)', style: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50', info: 'One row per reviewed transaction (kept or discarded). Includes status, split flag, and your notes.' },
            { key: 'split', label: 'Export Split Ledger (CSV)', style: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50', info: 'Only kept + split transactions, expanded to one row per person with their share of the amount.' },
          ].map(({ key, label, style, info }) => (
            <div key={key} className="relative flex items-center gap-1 group/export">
              <button onClick={() => onExport(key)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${style}`}>{label}</button>
              <div className="relative">
                <span className="cursor-default text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-xs leading-none select-none px-1">ⓘ</span>
                <div className="absolute right-0 bottom-full mb-2 w-56 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-lg px-3 py-2 shadow-lg opacity-0 pointer-events-none group-hover/export:opacity-100 transition-opacity z-10">
                  {info}
                  <div className="absolute right-2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
