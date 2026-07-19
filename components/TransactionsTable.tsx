'use client';

// Lista de transações confirmadas do mês selecionado. Empresa e Categoria
// são editáveis ali mesmo:
//   - editar a Categoria chama updateTransactionCategoryAction (aplica a
//     correção retroativamente a todas as transações da mesma empresa);
//   - editar a Empresa chama updateTransactionCompanyAction (aplica
//     retroativamente a todas as transações com a mesma descrição bruta, E
//     recalcula a categoria de cada uma — a "cascata" comentada em
//     app/actions.ts).
// Em ambos os casos, depois de chamar a ação usamos router.refresh() para
// buscar os dados atualizados do servidor — isso é importante porque a
// edição de UMA linha pode mudar várias outras linhas já exibidas na tabela.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateTransactionCategoryAction, updateTransactionCompanyAction } from '@/app/actions';
import type { Transaction } from '@/lib/types';
import { formatDateBR } from '@/lib/dateUtils';
import SuggestionSelect from './SuggestionSelect';

interface TransactionsTableProps {
  transactions: Transaction[];
  knownCompanies: string[];
  knownCategories: string[];
}

function sortAlphabetically(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export default function TransactionsTable({
  transactions,
  knownCompanies: companiesFromServer,
  knownCategories: categoriesFromServer,
}: TransactionsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Opções criadas nesta sessão de tela que o servidor ainda não sabe (o
  // router.refresh() ainda não voltou). Juntamos com o que vem do servidor a
  // cada render — assim uma opção nova aparece de imediato em todos os
  // outros dropdowns, sem esperar o refresh ir e voltar, e sem precisar de
  // um useEffect só para sincronizar estado.
  const [locallyAddedCompanies, setLocallyAddedCompanies] = useState<string[]>([]);
  const [locallyAddedCategories, setLocallyAddedCategories] = useState<string[]>([]);
  const knownCompanies = sortAlphabetically(
    Array.from(new Set([...companiesFromServer, ...locallyAddedCompanies]))
  );
  const knownCategories = sortAlphabetically(
    Array.from(new Set([...categoriesFromServer, ...locallyAddedCategories]))
  );

  function handleCompanyChange(transactionId: string, newCompany: string) {
    setLocallyAddedCompanies((current) =>
      current.includes(newCompany) || companiesFromServer.includes(newCompany)
        ? current
        : [...current, newCompany]
    );
    startTransition(async () => {
      await updateTransactionCompanyAction(transactionId, newCompany);
      router.refresh();
    });
  }

  function handleCategoryChange(transactionId: string, newCategory: string) {
    setLocallyAddedCategories((current) =>
      current.includes(newCategory) || categoriesFromServer.includes(newCategory)
        ? current
        : [...current, newCategory]
    );
    startTransition(async () => {
      await updateTransactionCategoryAction(transactionId, newCategory);
      router.refresh();
    });
  }

  if (transactions.length === 0) {
    return <p className="text-sm text-neutral-500">Nenhuma transação neste mês.</p>;
  }

  return (
    <div>
      <p className="mb-2 text-xs text-neutral-500">
        Editar a Empresa ou a Categoria aqui atualiza retroativamente as demais transações relacionadas
        (mesma descrição bruta, para Empresa; mesma empresa, para Categoria).
      </p>
      <div className={`overflow-x-auto rounded-lg border border-neutral-200 transition-opacity ${isPending ? 'opacity-60' : ''}`}>
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-medium uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Instituição</th>
              <th className="px-3 py-2">Formato</th>
              <th className="px-3 py-2">Empresa</th>
              <th className="px-3 py-2">Parcela</th>
              <th className="px-3 py-2">Valor</th>
              <th className="px-3 py-2">Categoria</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td className="whitespace-nowrap px-3 py-2">{formatDateBR(transaction.date)}</td>
                <td className="whitespace-nowrap px-3 py-2 capitalize">{transaction.type}</td>
                <td className="whitespace-nowrap px-3 py-2">{transaction.institution}</td>
                <td className="whitespace-nowrap px-3 py-2">{transaction.format}</td>
                <td className="px-3 py-2">
                  <SuggestionSelect
                    value={transaction.company}
                    options={knownCompanies}
                    onChange={(newCompany) => handleCompanyChange(transaction.id, newCompany)}
                    newOptionLabel="+ Nova empresa..."
                    newOptionPlaceholder="Nome da empresa"
                  />
                  <div
                    className="mt-1 max-w-[220px] truncate text-xs text-neutral-400"
                    title={transaction.description}
                  >
                    {transaction.description}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2">{transaction.installment ?? '—'}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  {transaction.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <SuggestionSelect
                    value={transaction.category}
                    options={knownCategories}
                    onChange={(newCategory) => handleCategoryChange(transaction.id, newCategory)}
                    newOptionLabel="+ Nova categoria..."
                    newOptionPlaceholder="Nome da categoria"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
