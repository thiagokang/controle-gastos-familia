import { readTransactions } from '@/lib/storage';
import { currentMonthKey, getMonthKey } from '@/lib/dateUtils';
import MonthNavigator from '@/components/MonthNavigator';
import MonthlySummaryChart from '@/components/MonthlySummaryChart';

interface AnalisesPageProps {
  searchParams: Promise<{ month?: string }>;
}

// "Análises" é pensada para no futuro ter mais de uma análise (daí o nome no
// plural). Por enquanto só existe o "Resumo mensal": total gasto por
// categoria no mês selecionado, do maior para o menor.
export default async function AnalisesPage({ searchParams }: AnalisesPageProps) {
  const { month } = await searchParams;
  const allTransactions = await readTransactions();

  const monthKeysWithData = Array.from(new Set(allTransactions.map((t) => getMonthKey(t.date)))).sort();
  const mostRecentMonth = monthKeysWithData[monthKeysWithData.length - 1] ?? currentMonthKey();
  const selectedMonth = month ?? mostRecentMonth;

  // Só "saída" entra no resumo de gastos — "entrada" não tem uma categoria
  // de gasto que faça sentido somar aqui.
  const monthExpenses = allTransactions.filter(
    (t) => getMonthKey(t.date) === selectedMonth && t.type === 'saida'
  );

  const totalsByCategory = new Map<string, number>();
  for (const transaction of monthExpenses) {
    const categoryLabel = transaction.category || 'Sem categoria';
    totalsByCategory.set(categoryLabel, (totalsByCategory.get(categoryLabel) ?? 0) + transaction.value);
  }

  const chartData = Array.from(totalsByCategory.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-neutral-900">Análises</h1>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
            Resumo mensal
          </h2>
          <MonthNavigator basePath="/analises" monthKey={selectedMonth} />
        </div>

        <MonthlySummaryChart data={chartData} />
      </section>
    </div>
  );
}
