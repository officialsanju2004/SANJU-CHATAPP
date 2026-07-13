import { THEMES, useTheme } from '../context/ThemeContext.jsx';

export default function ThemeSwitcher({ onClose }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="fixed inset-0 z-50 bg-void-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-border rounded-2xl p-5 w-full max-w-xs shadow-neon-lg animate-floatIn">
        <p className="font-display font-semibold text-ember-50 mb-4">Choose a theme</p>
        <div className="space-y-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                theme === t.id ? 'border-ember-500 bg-ember-500/10' : 'border-surface-border hover:bg-void/60'
              }`}
            >
              <span
                className="w-6 h-6 rounded-full border border-white/10"
                style={{ backgroundColor: t.swatch }}
              />
              <span className="text-sm text-ember-50 flex-1 text-left">{t.label}</span>
              {theme === t.id && (
                <svg viewBox="0 0 24 24" width="16" height="16" className="fill-ember-400">
                  <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                </svg>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 text-sm font-medium py-2 rounded-lg border border-surface-border text-ember-50/70 hover:bg-void/60"
        >
          Done
        </button>
      </div>
    </div>
  );
}
