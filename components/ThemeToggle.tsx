'use client';

// Botão de três estados no menu lateral: Sistema (segue o SO) → Claro →
// Escuro → Sistema. O ícone mostrado é sempre o da preferência escolhida,
// não o do tema efetivamente exibido — por isso "Sistema" sempre mostra o
// ícone de monitor, mesmo quando o SO estiver no escuro naquele momento.

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

const PREFERENCE_INFO = {
  system: { icon: Monitor, label: 'Sistema', next: 'Claro' },
  light: { icon: Sun, label: 'Claro', next: 'Escuro' },
  dark: { icon: Moon, label: 'Escuro', next: 'Sistema' },
} as const;

export default function ThemeToggle() {
  const { preference, cyclePreference } = useTheme();
  const { icon: Icon, label, next } = PREFERENCE_INFO[preference];

  return (
    <button
      type="button"
      onClick={cyclePreference}
      title={`Tema: ${label} (clique para mudar para ${next})`}
      aria-label={`Tema atual: ${label}. Clique para mudar para ${next}.`}
      className="flex w-full items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
    >
      <Icon size={16} />
      {label}
    </button>
  );
}
