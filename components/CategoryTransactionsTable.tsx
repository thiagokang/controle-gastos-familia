'use client';

// Tabela de drill-down de uma categoria no Resumo mensal (ver
// MonthlySummaryAnalysis, que já filtra e ordena as transações antes de
// passar pra cá). Mesma estrutura de colunas de components/TransactionsTable
// MENOS a coluna Categoria (redundante — a seleção já indica qual é) e sem
// nenhuma ação: nada aqui é editável, ordenável ou filtrável, é só leitura.

import type { Transaction } from '@/lib/types';
import { formatDateBR } from '@/lib/dateUtils';
import { getResponsible } from '@/lib/responsible';

interface CategoryTransactionsTableProps {
  transactions: Transaction[];
}

export default function CategoryTransactionsTable({ transactions }: CategoryTransactionsTableProps) {
  if (transactions.length === 0) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhuma transação nesta categoria.</p>;
  }

  return (
    <div className="max-h-[50vh] overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
      <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
        <thead className="sticky top-0 z-10 bg-neutral-50 text-left text-xs font-medium uppercase text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
          <tr>
            <th className="px-3 py-2">Data</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2">Instituição</th>
            <th className="px-3 py-2">Responsável</th>
            <th className="px-3 py-2">Formato</th>
            <th className="px-3 py-2">Empresa</th>
            <th className="px-3 py-2">Parcela</th>
            <th className="px-3 py-2">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td className="whitespace-nowrap px-3 py-2">{formatDateBR(transaction.date)}</td>
              <td className="whitespace-nowrap px-3 py-2 capitalize">{transaction.type}</td>
              <td className="whitespace-nowrap px-3 py-2">{transaction.institution}</td>
              <td className="whitespace-nowrap px-3 py-2">{getResponsible(transaction)}</td>
              <td className="whitespace-nowrap px-3 py-2">{transaction.format}</td>
              <td className="px-3 py-2">
                {transaction.company}
                <div
                  className="mt-1 max-w-[220px] truncate text-xs text-neutral-400 dark:text-neutral-500"
                  title={transaction.description}
                >
                  {transaction.description}
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-2">{transaction.installment ?? '—'}</td>
              <td className="whitespace-nowrap px-3 py-2">
                {transaction.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
