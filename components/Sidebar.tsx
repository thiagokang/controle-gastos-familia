'use client';

// Menu lateral fixo, presente em todas as telas (é renderizado uma vez no
// app/layout.tsx). Precisa ser 'use client' porque usa usePathname para saber
// qual link destacar como "ativo".
//
// "Análises" é um agrupador visual, não um link: não navega e não tem
// comportamento de recolher/expandir — os itens filhos (Resumo mensal,
// Histórico por categoria) ficam sempre visíveis. O destaque acontece em
// dois níveis independentes: o grupo "Análises" fica em destaque sempre que
// a rota atual é QUALQUER uma das análises (mesmo padrão que já existia
// entre Transações e Análises); dentro da lista, o item filho da análise
// exibida no momento recebe seu próprio destaque, pra indicar qual das duas
// está ativa.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

const ANALYSIS_LINKS = [
  { href: '/analises/resumo-mensal', label: 'Resumo mensal' },
  { href: '/analises/historico-categoria', label: 'Histórico por categoria' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isAnalysesActive = pathname.startsWith('/analises');

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
        <Link
          href="/transacoes"
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            pathname.startsWith('/transacoes')
              ? 'bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
          }`}
        >
          Transações
        </Link>

        {/* Agrupador "Análises": só texto, não é um <Link> nem tem onClick —
            clicar aqui não faz nada, só os itens filhos abaixo navegam. */}
        <div
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            isAnalysesActive
              ? 'bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
              : 'text-neutral-600 dark:text-neutral-400'
          }`}
        >
          Análises
        </div>
        <div className="flex flex-col gap-0.5 pl-3">
          {ANALYSIS_LINKS.map((link) => {
            const isChildActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  isChildActive
                    ? 'bg-neutral-100 font-semibold text-neutral-900 dark:bg-neutral-800/60 dark:text-neutral-100'
                    : 'font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="mt-auto">
        <ThemeToggle />
      </div>
    </aside>
  );
}
