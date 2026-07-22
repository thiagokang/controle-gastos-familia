'use client';

// Fonte da verdade do tema em React. A classe "dark" já foi aplicada no
// <html> por um script inline (ver app/layout.tsx) antes da primeira
// pintura, para não piscar o tema errado — este provider só sincroniza o
// estado do React com o que já está no DOM, e cuida de:
//   - reagir a mudanças do tema do sistema operacional em tempo real,
//     quando a preferência do usuário é "system";
//   - persistir a escolha manual em localStorage;
//   - expor `resolvedTheme` (claro/escuro efetivo) para componentes que não
//     conseguem usar classes `dark:` do Tailwind, como o gráfico de
//     Análises (Recharts usa cores via props inline).

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type ThemePreference = 'system' | 'light' | 'dark';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  cyclePreference: () => void;
}

const STORAGE_KEY = 'theme';
const CYCLE_ORDER: ThemePreference[] = ['system', 'light', 'dark'];

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyResolvedTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

function readStoredPreference(): ThemePreference {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Inicializa a partir do que já está no DOM/localStorage: o script inline
  // em app/layout.tsx já aplicou a classe "dark" certa no <html> antes deste
  // componente montar (renderiza só no cliente — no servidor cai no
  // fallback, que não afeta o HTML gerado por este provider). Usar
  // inicializador lazy do useState em vez de um efeito evita o
  // re-render em cascata de um setState síncrono dentro de useEffect.
  const [preference, setPreference] = useState<ThemePreference>(() =>
    typeof window === 'undefined' ? 'system' : readStoredPreference()
  );
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    typeof window === 'undefined'
      ? 'light'
      : document.documentElement.classList.contains('dark')
        ? 'dark'
        : 'light'
  );

  // RootLayout (app/layout.tsx) é Server Component: a cada navegação entre
  // páginas, o React re-renderiza o <html> a partir do payload vindo do
  // servidor, que não sabe nada sobre a classe "dark" aplicada via JS no
  // cliente — isso apaga a classe (some o tema escuro) toda vez que o
  // usuário troca de página. Reaplicar aqui, disparado pela mudança de rota,
  // corrige isso sem precisar tornar o próprio <html> um Client Component.
  const pathname = usePathname();
  useEffect(() => {
    applyResolvedTheme(resolvedTheme);
  }, [pathname, resolvedTheme]);

  // Enquanto a preferência for "system", acompanha mudanças do tema do SO
  // em tempo real (ex: usuário muda o modo escuro do macOS com o app aberto).
  useEffect(() => {
    if (preference !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    function syncWithSystem() {
      const resolved: ResolvedTheme = systemPrefersDark() ? 'dark' : 'light';
      setResolvedTheme(resolved);
      applyResolvedTheme(resolved);
    }
    syncWithSystem();
    media.addEventListener('change', syncWithSystem);
    return () => media.removeEventListener('change', syncWithSystem);
  }, [preference]);

  function cyclePreference() {
    const nextPreference = CYCLE_ORDER[(CYCLE_ORDER.indexOf(preference) + 1) % CYCLE_ORDER.length];
    const nextResolved: ResolvedTheme =
      nextPreference === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : nextPreference;

    if (nextPreference === 'system') {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, nextPreference);
    }
    applyResolvedTheme(nextResolved);
    setPreference(nextPreference);
    setResolvedTheme(nextResolved);
  }

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, cyclePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme precisa ser usado dentro de um ThemeProvider');
  return context;
}
