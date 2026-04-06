// ===== DARK MODE TOGGLE =====
function DarkModeToggle() {
  const [, setTrigger] = useState(0);

  const isDark = document.documentElement.classList.contains('dark');

  const toggleDark = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    }
    setTrigger(prev => prev + 1);
  };

  return (
    <button
      onClick={toggleDark}
      className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
      title="Toggle dark mode"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
