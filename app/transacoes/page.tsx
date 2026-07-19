import { readTransactions } from '@/lib/storage';
import { currentMonthKey, getMonthKey } from '@/lib/dateUtils';
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

  const monthKeysWithData = Array.from(new Set(allTransactions.map((t) => getMonthKey(t.date)))).sort();
  const mostRecentMonth = monthKeysWithData[monthKeysWithData.length - 1] ?? currentMonthKey();
  const selectedMonth = month ?? mostRecentMonth;
  const selectedCategory = category ?? 'all';

  const allCategories = Array.from(
    new Set(allTransactions.map((t) => t.category).filter((c) => c !== ''))
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const allCompanies = Array.from(
    new Set(allTransactions.map((t) => t.company).filter((c) => c !== ''))
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const visibleTransactions = allTransactions
    .filter((t) => getMonthKey(t.date) === selectedMonth)
    .filter((t) => selectedCategory === 'all' || t.category === selectedCategory)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-neutral-900">Transações</h1>

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
