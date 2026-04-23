/**
 * ThemeToggle.tsx
 * Animated Sun / Moon / Monitor toggle — ported from Next.js components/theme/theme-toggle.tsx
 * Cycles through light → dark → system on each click.
 */
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, settings, toggleMode } = useTheme();
  const mode = settings.mode;

  return (
    <button
      onClick={toggleMode}
      aria-label={`Current theme: ${mode}. Click to switch.`}
      title={mode === 'light' ? 'Switch to dark' : mode === 'dark' ? 'Switch to system' : 'Switch to light'}
      className="relative p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground overflow-hidden w-9 h-9 flex items-center justify-center"
    >
      {/* Sun — visible in light mode */}
      <Sun
        className={`
          absolute w-4 h-4 text-yellow-500 transition-all duration-300
          ${mode === 'light'
            ? 'opacity-100 rotate-0 scale-100'
            : 'opacity-0 -rotate-90 scale-50'}
        `}
      />

      {/* Moon — visible in dark mode */}
      <Moon
        className={`
          absolute w-4 h-4 text-indigo-400 transition-all duration-300
          ${mode === 'dark'
            ? 'opacity-100 rotate-0 scale-100'
            : mode === 'light'
            ? 'opacity-0 rotate-90 scale-50'
            : 'opacity-0 -rotate-90 scale-50'}
        `}
      />

      {/* Monitor — visible in system mode */}
      <Monitor
        className={`
          absolute w-4 h-4 transition-all duration-300
          ${theme === 'dark' ? 'text-indigo-300' : 'text-slate-500'}
          ${mode === 'system'
            ? 'opacity-100 rotate-0 scale-100'
            : 'opacity-0 rotate-90 scale-50'}
        `}
      />
    </button>
  );
}

// ─── Compact version (icon-only, no tooltip) used inside sidebar ──────────────
export function ThemeToggleCompact() {
  const { settings, toggleMode, isDark } = useTheme();
  const mode = settings.mode;

  return (
    <button
      onClick={toggleMode}
      aria-label="Toggle theme"
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
    >
      <div className="relative w-4 h-4">
        <Sun
          className={`absolute inset-0 w-4 h-4 text-yellow-400 transition-all duration-300 ${
            mode === 'light' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 scale-0'
          }`}
        />
        <Moon
          className={`absolute inset-0 w-4 h-4 text-indigo-300 transition-all duration-300 ${
            mode === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 scale-0'
          }`}
        />
        <Monitor
          className={`absolute inset-0 w-4 h-4 transition-all duration-300 ${
            isDark ? 'text-indigo-300' : 'text-slate-400'
          } ${mode === 'system' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 scale-0'}`}
        />
      </div>
    </button>
  );
}
