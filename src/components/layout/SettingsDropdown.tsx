import { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, Sun, Moon, Monitor, Check } from 'lucide-react';
import { useAppStore } from '../../store';
import { cn } from '../../lib/utils';

type Theme = 'dark' | 'light' | 'claude';

interface ThemeOption {
  value: Theme;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const themeOptions: ThemeOption[] = [
  {
    value: 'dark',
    label: 'Dark',
    icon: <Moon className="w-4 h-4" />,
    description: 'Gold & black theme',
  },
  {
    value: 'light',
    label: 'Light',
    icon: <Sun className="w-4 h-4" />,
    description: 'Clean light theme',
  },
  {
    value: 'claude',
    label: 'Claude',
    icon: <Monitor className="w-4 h-4" />,
    description: 'Orange terminal style',
  },
];

export function SettingsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { ui, updateUI, setLoading } = useAppStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Apply theme to document on initial load
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', ui.theme);
  }, [ui.theme]);

  const handleThemeChange = useCallback(async (theme: Theme) => {
    if (theme === ui.theme) return;

    setIsOpen(false);
    setLoading(true, 'Applying theme...');

    // Small delay to ensure overlay is visible before theme change
    await new Promise(resolve => setTimeout(resolve, 150));

    // Apply theme
    document.documentElement.setAttribute('data-theme', theme);
    updateUI({ theme });

    // Wait for CSS transitions to complete
    await new Promise(resolve => setTimeout(resolve, 250));

    setLoading(false);
  }, [ui.theme, updateUI, setLoading]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'p-2 rounded-lg transition-colors',
          isOpen ? 'bg-accent' : 'hover:bg-accent'
        )}
        title="Settings"
      >
        <Settings className="w-4 h-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-lg shadow-lg z-50 animate-in">
          <div className="p-2">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Theme
            </div>
            <div className="space-y-1">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleThemeChange(option.value)}
                  className={cn(
                    'w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
                    ui.theme === option.value
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50 text-foreground'
                  )}
                >
                  <span className="text-muted-foreground">{option.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </div>
                  {ui.theme === option.value && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border p-2">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              More settings coming soon...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
