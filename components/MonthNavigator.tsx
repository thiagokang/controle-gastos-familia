// Navegador "< Mês Ano >" reutilizado em Transações e Análises. É um
// Server Component (sem 'use client') porque só precisa gerar links — o
// próprio Next.js cuida da navegação, sem precisar de JavaScript no cliente.

import Link from 'next/link';
import { formatMonthLabel, shiftMonthKey } from '@/lib/dateUtils';

interface MonthNavigatorProps {
  basePath: string;
  monthKey: string;
  extraParams?: Record<string, string>;
}

export default function MonthNavigator({ basePath, monthKey, extraParams = {} }: MonthNavigatorProps) {
  const buildHref = (targetMonthKey: string) => {
    const params = new URLSearchParams({ ...extraParams, month: targetMonthKey });
    return `${basePath}?${params.toString()}`;
  };

  return (
    <div className="flex items-center gap-4">
      <Link
        href={buildHref(shiftMonthKey(monthKey, -1))}
        className="rounded-md px-2 py-1 text-neutral-600 transition-colors hover:bg-neutral-100"
        aria-label="Mês anterior"
      >
        ←
      </Link>
      <span className="min-w-[10rem] text-center text-base font-medium text-neutral-900">
        {formatMonthLabel(monthKey)}
      </span>
      <Link
        href={buildHref(shiftMonthKey(monthKey, 1))}
        className="rounded-md px-2 py-1 text-neutral-600 transition-colors hover:bg-neutral-100"
        aria-label="Próximo mês"
      >
        →
      </Link>
    </div>
  );
}
