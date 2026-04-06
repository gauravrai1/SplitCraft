// ===== ANALYSIS SCREEN =====
// Full-width post-audit workspace with filters, deeper summaries, and filtered exports.
function AnalysisScreen({ raw, derived, config, filters, onFiltersChange, onBack, onExport, lastSave }) {
  const stats = useMemo(() => computeAnalysisStats(raw, derived, filters), [raw, derived, filters]);

  const institutionRows = useMemo(() => {
    const map = {};
    stats.filtered
      .filter(t => getTransactionStatus(t.d) === 'kept')
      .forEach(t => {
        const key = t.raw.Institution || 'Unspecified';
        map[key] = (map[key] || 0) + Math.abs(t.raw.Amount);
      });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [stats]);

  const accountTypeRows = useMemo(() => {
    const map = {};
    stats.filtered.forEach(t => {
      const key = t.raw.Account_Type || 'Unspecified';
      if (!map[key]) map[key] = { count: 0, amount: 0 };
      map[key].count += 1;
      if (getTransactionStatus(t.d) === 'kept') map[key].amount += Math.abs(t.raw.Amount);
    });
    return Object.entries(map).sort((a, b) => b[1].amount - a[1].amount);
  }, [stats]);

  const recentTransactions = useMemo(() => {
    return [...stats.filtered].sort((a, b) => b.raw.Date.localeCompare(a.raw.Date)).slice(0, 12);
  }, [stats]);

  const personOptions = ['all', 'Me', ...config.people.filter(name => name !== 'Me')];
  const updateFilter = (key, value) => onFiltersChange(prev => ({ ...prev, [key]: value }));

  const resetFilters = () => onFiltersChange({
    filterType: 'all',
    customStart: config.filters.startDate || '',
    customEnd: config.filters.endDate || '',
    statusFilter: 'audited',
    splitFilter: 'all',
    personFilter: 'all',
    search: '',
  });

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wide">
                Audit Complete
              </div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Analysis Workspace</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                Filter the audited dataset, review summaries, and export files that match the filters shown here.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {lastSave && (
                <div className="px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-xs text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Auto-saved {lastSave}
                </div>
              )}
              <DarkModeToggle />
              <button onClick={onBack} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition">
                ← Back To Audit
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6">
          <div className="space-y-5">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Filters</h3>
                <button onClick={resetFilters} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">Reset</button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Search</label>
                <input value={filters.search} onChange={e => updateFilter('search', e.target.value)} placeholder="Merchant, account, institution" className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Period</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['all', 'All'],
                    ['thisMonth', 'This Month'],
                    ['lastMonth', 'Last Month'],
                    ['custom', 'Custom'],
                  ].map(([key, label]) => (
                    <button key={key} onClick={() => updateFilter('filterType', key)} className={`px-3 py-2 rounded-lg text-xs font-medium transition ${filters.filterType === key ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                {filters.filterType === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input type="date" value={filters.customStart} onChange={e => updateFilter('customStart', e.target.value)} className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-2 py-2 text-xs" />
                    <input type="date" value={filters.customEnd} onChange={e => updateFilter('customEnd', e.target.value)} className="border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-2 py-2 text-xs" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Status</label>
                <select value={filters.statusFilter} onChange={e => updateFilter('statusFilter', e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm">
                  <option value="audited">Audited Only</option>
                  <option value="all">All Rows</option>
                  <option value="kept">Kept Only</option>
                  <option value="discarded">Discarded Only</option>
                  <option value="pending">Pending Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Split</label>
                <select value={filters.splitFilter} onChange={e => updateFilter('splitFilter', e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm">
                  <option value="all">All</option>
                  <option value="split">Split Only</option>
                  <option value="nonSplit">Non-Split Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Person</label>
                <select value={filters.personFilter} onChange={e => updateFilter('personFilter', e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm">
                  {personOptions.map(name => (
                    <option key={name} value={name}>{name === 'all' ? 'All People' : name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Export</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">The CSV exports below use the exact filters currently applied on this screen.</p>
              <button onClick={() => onExport('csv', filters)} className="w-full py-2.5 rounded-lg text-sm font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition">
                Export Filtered Transactions
              </button>
              <button onClick={() => onExport('split', filters)} className="w-full py-2.5 rounded-lg text-sm font-medium bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition">
                Export Filtered Split Ledger
              </button>
              <button onClick={() => onExport('state')} className="w-full py-2.5 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition">
                Save Full State (JSON)
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
              {[
                ['Filtered Rows', stats.filteredCount, 'text-slate-900 dark:text-white'],
                ['Kept', stats.filteredKept, 'text-emerald-600 dark:text-emerald-400'],
                ['Discarded', stats.filteredDiscarded, 'text-rose-500 dark:text-rose-400'],
                ['Gross Kept', fmt(stats.totalKept), 'text-slate-900 dark:text-white'],
                ['My Share', fmt(stats.myShare), 'text-blue-600 dark:text-blue-400'],
                ['Owed To You', fmt(stats.owedToYou), 'text-violet-600 dark:text-violet-400'],
              ].map(([label, value, color]) => (
                <div key={label} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
                  <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Per Person Owed</h3>
                <div className="space-y-2">
                  {Object.keys(stats.personMap).length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No split balances in the current filter.</p>}
                  {Object.entries(stats.personMap).sort((a, b) => b[1] - a[1]).map(([name, amount]) => (
                    <div key={name} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{name}</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">+{fmt(amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Institution Breakdown</h3>
                <div className="space-y-2">
                  {institutionRows.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No kept transactions in the current filter.</p>}
                  {institutionRows.slice(0, 8).map(([name, amount]) => (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{name}</span>
                      <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{fmt(amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Account Type Breakdown</h3>
                <div className="space-y-2">
                  {accountTypeRows.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No transactions in the current filter.</p>}
                  {accountTypeRows.slice(0, 8).map(([name, info]) => (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{name}</span>
                      <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{info.count} / {fmt(info.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Filtered Transactions</h3>
                <span className="text-xs text-slate-400 dark:text-slate-500">{stats.filteredCount} matching rows</span>
              </div>
              <div className="space-y-2">
                {recentTransactions.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No transactions match the current filters.</p>}
                {recentTransactions.map(t => {
                  const status = getTransactionStatus(t.d);
                  return (
                    <div key={t.id} className="grid grid-cols-[100px_minmax(0,1fr)_110px_110px] gap-3 items-center bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{t.raw.Date}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{t.raw.Description}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t.raw.Institution} · {t.raw.Account_Type} · {t.raw.Account_Name}</p>
                      </div>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${status === 'kept' ? 'text-emerald-600 dark:text-emerald-400' : status === 'discarded' ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>{status}</span>
                      <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">{fmt(t.raw.Amount)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
