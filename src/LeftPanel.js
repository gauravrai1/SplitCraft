// ===== LEFT PANEL =====
// Scrollable transaction list. Highlights the current transaction,
// color-codes kept/discarded, and locks future unprocessed items.
function LeftPanel({ raw, derived, currentIndex, onNavigate }) {
  const listRef = useRef();
  const itemRefs = useRef({});

  useEffect(() => {
    const el = itemRefs.current[currentIndex];
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentIndex]);

  return (
    <div ref={listRef} className="h-full overflow-y-auto bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
      <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 z-10">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Transactions</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{raw.length} total</p>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {raw.map((t, i) => {
          const d = derived.transactions[t.id];
          const status = d?.status || 'pending';
          const isCurrent = i === currentIndex;
          const isLocked = i > currentIndex && status === 'pending';
          const bg = isCurrent ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 dark:border-blue-400' : status === 'kept' ? 'bg-emerald-50/50 dark:bg-emerald-900/20' : status === 'discarded' ? 'bg-rose-50/40 dark:bg-rose-900/20' : '';
          const icon = isCurrent ? '→' : status === 'kept' ? '✓' : status === 'discarded' ? '✗' : '·';
          const iconColor = isCurrent ? 'text-blue-600 dark:text-blue-400' : status === 'kept' ? 'text-emerald-500 dark:text-emerald-400' : status === 'discarded' ? 'text-rose-400 dark:text-rose-500' : 'text-slate-300 dark:text-slate-600';
          return (
            <button
              key={t.id}
              ref={el => (itemRefs.current[i] = el)}
              onClick={() => !isLocked && onNavigate(i)}
              disabled={isLocked}
              className={`w-full text-left px-3 py-2.5 flex items-center gap-2 transition ${bg} ${isLocked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer'}`}
            >
              <span className={`text-sm font-bold w-5 text-center ${iconColor}`}>{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-800 dark:text-slate-200 truncate font-medium">{t.raw.Description}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{t.raw.Date}</p>
              </div>
              <span className={`text-xs font-semibold tabular-nums ${t.raw.Amount < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>{fmt(t.raw.Amount)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
