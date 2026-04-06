// ===== SPLIT EDITOR =====
// Inline editor for splitting a transaction across people.
// Supports three modes: percentage, equal, and absolute ($).
// Validates that participant shares sum to the target before allowing Keep.
function SplitEditor({ splitConfig, amount, people, onChange }) {
  const cfg = splitConfig || { type: 'percentage', participants: [{ name: 'Me', value: 50 }, { name: people[0] || 'Other', value: 50 }] };
  const absAmount = Math.abs(amount);

  const setType = (type) => {
    let parts = cfg.participants;
    if (type === 'equal') parts = parts.map(p => ({ ...p, value: +(absAmount / parts.length).toFixed(2) }));
    else if (type === 'percentage') parts = parts.map(p => ({ ...p, value: +(100 / parts.length).toFixed(1) }));
    onChange({ ...cfg, type, participants: parts });
  };

  const setValue = (i, val) => {
    const parts = [...cfg.participants];
    parts[i] = { ...parts[i], value: parseFloat(val) || 0 };
    onChange({ ...cfg, participants: parts });
  };

  const addParticipant = (name) => {
    if (cfg.participants.some(p => p.name === name)) return;
    const parts = [...cfg.participants, { name, value: 0 }];
    if (cfg.type === 'equal') {
      const each = +(absAmount / parts.length).toFixed(2);
      onChange({ ...cfg, participants: parts.map(p => ({ ...p, value: each })) });
    } else onChange({ ...cfg, participants: parts });
  };

  const removeParticipant = (i) => {
    if (cfg.participants.length <= 2) return;
    const parts = cfg.participants.filter((_, j) => j !== i);
    if (cfg.type === 'equal') {
      const each = +(absAmount / parts.length).toFixed(2);
      onChange({ ...cfg, participants: parts.map(p => ({ ...p, value: each })) });
    } else onChange({ ...cfg, participants: parts });
  };

  const total = cfg.participants.reduce((s, p) => s + p.value, 0);
  const target = cfg.type === 'percentage' ? 100 : absAmount;
  const isValid = Math.abs(total - target) < 0.02;
  const availablePeople = ['Me', ...people].filter(n => !cfg.participants.some(p => p.name === n));

  return (
    <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4 space-y-3 border border-violet-200 dark:border-violet-800">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-violet-800 dark:text-violet-400">Split Configuration</h3>
        <div className="flex bg-violet-100 dark:bg-violet-900/40 rounded-lg p-0.5 gap-0.5">
          {['percentage', 'equal', 'absolute'].map(t => (
            <button key={t} onClick={() => setType(t)} className={`px-3 py-1 rounded-md text-xs font-medium transition ${cfg.type === t ? 'bg-violet-600 dark:bg-violet-700 text-white shadow dark:shadow-md' : 'text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-800'}`}>
              {t === 'percentage' ? '%' : t === 'equal' ? 'Equal' : '$'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {cfg.participants.map((p, i) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="text-sm font-medium text-violet-700 dark:text-violet-400 w-24 truncate">{p.name}</span>
            <div className="flex-1 flex items-center gap-1">
              {cfg.type === 'equal' ? (
                <span className="text-sm text-violet-600 dark:text-violet-400 font-mono">{fmt(p.value)}</span>
              ) : (
                <input
                  type="number"
                  step={cfg.type === 'percentage' ? '1' : '0.01'}
                  value={p.value}
                  onChange={e => setValue(i, e.target.value)}
                  className="w-24 border border-violet-300 dark:border-violet-700 dark:bg-violet-900/40 dark:text-violet-100 rounded-lg px-2 py-1 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-violet-400 dark:focus:ring-violet-500"
                />
              )}
              <span className="text-xs text-violet-400 dark:text-violet-600">{cfg.type === 'percentage' ? '%' : 'CAD'}</span>
            </div>
            {cfg.participants.length > 2 && (
              <button onClick={() => removeParticipant(i)} className="text-violet-300 dark:text-violet-700 hover:text-violet-600 dark:hover:text-violet-500 text-lg font-bold leading-none">&times;</button>
            )}
          </div>
        ))}
      </div>

      {availablePeople.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {availablePeople.map(n => (
            <button key={n} onClick={() => addParticipant(n)} className="text-xs bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 px-2 py-1 rounded-full hover:bg-violet-200 dark:hover:bg-violet-800 transition">+ {n}</button>
          ))}
        </div>
      )}

      <div className={`flex items-center justify-between text-xs font-semibold rounded-lg px-3 py-2 ${isValid ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
        <span>Total: {cfg.type === 'percentage' ? `${total.toFixed(1)}%` : fmt(total)}</span>
        <span>Target: {cfg.type === 'percentage' ? '100%' : fmt(target)}</span>
        {isValid ? <span>Valid</span> : <span>Must equal target</span>}
      </div>
    </div>
  );
}
