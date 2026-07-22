'use client';

// Menu lateral fixo, presente em todas as telas (é renderizado uma vez no
// app/layout.tsx). Precisa ser 'use client' porque usa usePathname para saber
// qual link destacar como "ativo".

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

const NAV_LINKS = [
  { href: '/transacoes', label: 'Transações' },
  { href: '/analises', label: 'Análises' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-8 px-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Gastos da Família
      </div>

      {/* Botão de upload: fica sempre visível, independente da seção ativa. */}
      <Link
        href="/upload"
        className="mb-6 rounded-lg bg-neutral-900 px-3 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        Enviar fatura
      </Link>

      <nav className="mb-6 flex flex-col gap-1">
        {NAV_LINKS.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <ThemeToggle />
      </div>
    </aside>
  );
}
