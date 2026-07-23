import { readTransactions } from '@/lib/storage';
import { currentMonthKey, getGroupingMonthKey } from '@/lib/dateUtils';
import MonthNavigator from '@/components/MonthNavigator';
import CategoryFilter from '@/components/CategoryFilter';
import TransactionsTable from '@/components/TransactionsTable';

interface TransacoesPageProps {
  searchParams: Promise<{ month?: string; category?: string }>;
}

// Tela principal: lista as transações já confirmadas, de um mês por vez,
// com filtro opcional por categoria. O mês e a categoria selecionados vivem
// na URL (?month=2026-07&category=Alimentação), então dá pra voltar/avançar
// no navegador e compartilhar o link de uma visão específica.
export default async function TransacoesPage({ searchParams }: TransacoesPageProps) {
  const { month, category } = await searchParams;
  const allTransactions = await readTransactions();

  const monthKeysWithData = Array.from(new Set(allTransactions.map(getGroupingMonthKey))).sort();
  const mostRecentMonth = monthKeysWithData[monthKeysWithData.length - 1] ?? currentMonthKey();
  const selectedMonth = month ?? mostRecentMonth;
  const selectedCategory = category ?? 'all';

  const allCategories = Array.from(
    new Set(allTransactions.map((t) => t.category).filter((c) => c !== ''))
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const allCompanies = Array.from(
    new Set(allTransactions.map((t) => t.company).filter((c) => c !== ''))
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const monthTransactions = allTransactions.filter((t) => getGroupingMonthKey(t) === selectedMonth);

  const visibleTransactions = monthTransactions
    .filter((t) => {
      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'none') return t.category === '';
      return t.category === selectedCategory;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  // Saldo líquido do mês = soma das saídas − soma das entradas de TODAS as
  // transações do mês (independente do filtro de categoria selecionado) —
  // mesmo cálculo usado no Resumo mensal (ver app/analises/page.tsx).
  const monthNetTotal = monthTransactions.reduce(
    (total, t) => total + (t.type === 'saida' ? t.value : -t.value),
    0
  );

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
        <MonthNavigator
          basePath="/transacoes"
          monthKey={selectedMonth}
          extraParams={selectedCategory !== 'all' ? { category: selectedCategory } : {}}
        />
        <CategoryFilter
          categories={allCategories}
          selectedCategory={selectedCategory}
          monthKey={selectedMonth}
        />
      </div>

      <TransactionsTable
        transactions={visibleTransactions}
        knownCompanies={allCompanies}
        knownCategories={allCategories}
      />
    </div>
  );
}
