// ===== RIGHT PANEL =====
// Summary stats, per-person balances, analysis period filter, and export buttons.
// All stats are derived from `raw` + `derived` — no extra state stored here.
function RightPanel({ raw, derived, config, onExport, lastSave }) {
  const [filterType, setFilterType] = useState('all');
  const [customStart, setCustomStart] = useState(config.filters.startDate);
  const [customEnd, setCustomEnd] = useState(config.filters.endDate);

  const stats = useMemo(() => {
    const all = raw.map(t => ({ ...t, d: derived.transactions[t.id] }));
    const processed = all.filter(t => t.d?.status === 'kept' || t.d?.status === 'discarded');
    const kept = all.filter(t => t.d?.status === 'kept');
    const discarded = all.filter(t => t.d?.status === 'discarded');

    let filtered = kept;
    const now = new Date();
    if (filterType === 'thisMonth') {
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      filtered = kept.filter(t => t.raw.Date.startsWith(ym));
    } else if (filterType === 'lastMonth') {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      filtered = kept.filter(t => t.raw.Date.startsWith(ym));
    } else if (filterType === 'custom') {
      filtered = kept.filter(t => t.raw.Date >= customStart && t.raw.Date <= customEnd);
    }

    const totalKept = filtered.reduce((s, t) => s + t.raw.Amount, 0);
    const totalSplitKept = filtered.filter(t => t.d?.isSplit);

    const personMap = {};
    filtered.forEach(t => {
      if (t.d?.isSplit && t.d.splitConfig) {
        const sc = t.d.splitConfig;
        const absAmt = Math.abs(t.raw.Amount);
        sc.participants.forEach(p => {
          if (p.name === 'Me') return;
          let share;
          if (sc.type === 'percentage') share = absAmt * (p.value / 100);
          else if (sc.type === 'equal') share = absAmt / sc.participants.length;
          else share = p.value;
          personMap[p.name] = (personMap[p.name] || 0) + share;
        });
      }
    });

    const owedToYou = Object.values(personMap).filter(v => v > 0).reduce((s, v) => s + v, 0);

    let myShare = 0;
    filtered.forEach(t => {
      if (t.d?.isSplit && t.d.splitConfig) {
        const sc = t.d.splitConfig;
        const absAmt = Math.abs(t.raw.Amount);
        const me = sc.participants.find(p => p.name === 'Me');
        if (me) {
          if (sc.type === 'percentage') myShare += absAmt * (me.value / 100);
          else if (sc.type === 'equal') myShare += absAmt / sc.participants.length;
          else myShare += me.value;
        }
      } else {
        myShare += Math.abs(t.raw.Amount);
      }
    });

    return {
      total: raw.length,
      processed: processed.length,
      kept: kept.length,
      discarded: discarded.length,
      filteredCount: filtered.length,
      totalKept,
      totalSplit: totalSplitKept.length,
      owedToYou,
      myShare,
      net: owedToYou,
      personMap,
    };
  }, [raw, derived, filterType, customStart, customEnd, config]);

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
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Analysis Period</h3>
        <div className="flex flex-wrap gap-1">
          {[['all', 'All'], ['thisMonth', 'This Month'], ['lastMonth', 'Last Month'], ['custom', 'Custom']].map(([k, label]) => (
            <button key={k} onClick={() => setFilterType(k)} className={`px-3 py-1 rounded-full text-xs font-medium transition ${filterType === k ? 'bg-blue-600 dark:bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>{label}</button>
          ))}
        </div>
        {filterType === 'custom' && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-2 py-1 text-xs" />
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-2 py-1 text-xs" />
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Summary ({stats.filteredCount} txns)</h3>
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
            { key: 'csv',   label: 'Export Transactions (CSV)', style: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50', info: 'One row per reviewed transaction (kept or discarded). Includes status, split flag, and your notes. Use this for reconciliation or importing into a spreadsheet.' },
            { key: 'split', label: 'Export Split Ledger (CSV)', style: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50', info: 'Only kept + split transactions, expanded to one row per person with their share of the amount. Use this to settle up — who owes what for each expense.' },
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
