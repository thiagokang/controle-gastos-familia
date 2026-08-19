import { readTransactions } from '@/lib/storage';
import { currentMonthKey, getGroupingMonthKey } from '@/lib/dateUtils';
import { INTERNAL_TRANSFER_CATEGORY } from '@/lib/categorization';
import { collectKnownCategories } from '@/lib/categoryFilter';
import MonthNavigator from '@/components/MonthNavigator';
import TransactionsTable from '@/components/TransactionsTable';

interface TransacoesPageProps {
  // "category" só é lida na primeira renderização da tabela (ver
  // initialCategoryFilter em components/TransactionsTable.tsx) — usada
  // quando se chega aqui a partir de um link externo já filtrado (ex: o
  // aviso de categorias com saldo negativo do Resumo mensal).
  searchParams: Promise<{ month?: string; category?: string }>;
}

// Tela principal: lista as transações já confirmadas, de um mês por vez. O
// mês selecionado vive na URL (?month=2026-07), então dá pra voltar/avançar
// no navegador e compartilhar o link de um mês específico. Ordenação e
// filtro por coluna (ver docs/PRD.md) já vivem como estado local dentro de
// TransactionsTable — o key={selectedMonth} abaixo garante que esse estado
// reseta pro padrão toda vez que o usuário troca de mês/fatura.
export default async function TransacoesPage({ searchParams }: TransacoesPageProps) {
  const { month, category } = await searchParams;
  const allTransactions = await readTransactions();

  const monthKeysWithData = Array.from(new Set(allTransactions.map(getGroupingMonthKey))).sort();
  const mostRecentMonth = monthKeysWithData[monthKeysWithData.length - 1] ?? currentMonthKey();
  const selectedMonth = month ?? mostRecentMonth;

  // Fonte compartilhada com o dropdown de seleção do Histórico por
  // categoria (ver lib/categoryFilter.ts) — garante que as duas listas
  // nunca divirjam.
  const allCategories = collectKnownCategories(allTransactions);

  const allCompanies = Array.from(
    new Set(allTransactions.map((t) => t.company).filter((c) => c !== ''))
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const monthTransactions = allTransactions.filter((t) => getGroupingMonthKey(t) === selectedMonth);

  // Saldo líquido do mês = soma das saídas − soma das entradas de TODAS as
  // transações do mês (independente do filtro selecionado na tabela),
  // SEMPRE excluindo "Transferência interna" — é movimentação entre
  // "bolsos", não gasto nem renda real (ver INTERNAL_TRANSFER_CATEGORY em
  // lib/categorization.ts). A transação continua aparecendo normalmente na
  // tabela abaixo, só não entra nessa soma. Mesmo cálculo usado no Resumo
  // mensal (ver app/analises/resumo-mensal/page.tsx).
  const monthNetTotal = monthTransactions
    .filter((t) => t.category !== INTERNAL_TRANSFER_CATEGORY)
    .reduce((total, t) => total + (t.type === 'saida' ? t.value : -t.value), 0);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">Transações</h1>
      <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
        Saldo líquido do mês:{' '}
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          {monthNetTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      </p>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <MonthNavigator basePath="/transacoes" monthKey={selectedMonth} />
      </div>

      <TransactionsTable
        key={`${selectedMonth}:${category ?? ''}`}
        transactions={monthTransactions}
        knownCompanies={allCompanies}
        knownCategories={allCategories}
        initialCategoryFilter={category}
      />
    </div>
  );
}
