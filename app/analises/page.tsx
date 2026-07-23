import { readTransactions } from '@/lib/storage';
import { currentMonthKey, getGroupingMonthKey } from '@/lib/dateUtils';
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

  const monthKeysWithData = Array.from(new Set(allTransactions.map(getGroupingMonthKey))).sort();
  const mostRecentMonth = monthKeysWithData[monthKeysWithData.length - 1] ?? currentMonthKey();
  const selectedMonth = month ?? mostRecentMonth;

  // Mesmo agrupamento por "Mês de referência" usado na tela de Transações
  // (ver lib/dateUtils.ts) — sem isso, o Resumo mensal também sofreria do
  // mesmo problema de parcelas caindo todas no mês da compra original.
  const monthTransactions = allTransactions.filter((t) => getGroupingMonthKey(t) === selectedMonth);

  // Saldo líquido por categoria = soma das saídas − soma das entradas.
  // Isso cobre o caso de um estorno cancelar um gasto anterior (ex: uma
  // anuidade de cartão estornada): se a entrada do estorno for categorizada
  // na mesma categoria do gasto original, o saldo líquido reflete
  // corretamente que aquele gasto não se concretizou.
  const netByCategory = new Map<string, number>();
  for (const transaction of monthTransactions) {
    const categoryLabel = transaction.category || 'Sem categoria';
    const delta = transaction.type === 'saida' ? transaction.value : -transaction.value;
    netByCategory.set(categoryLabel, (netByCategory.get(categoryLabel) ?? 0) + delta);
  }

  // Só categorias com saldo positivo aparecem: o resumo é sobre gastos, não
  // sobre entradas de dinheiro — uma categoria com saldo zero ou negativo
  // (ex: uma entrada sem gasto correspondente no mês) não é um gasto.
  const chartData = Array.from(netByCategory.entries())
    .filter(([, total]) => total > 0)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  // Total do mês = soma de todos os saldos líquidos positivos exibidos no
  // gráfico (ou seja, o total gasto no mês, somando todas as categorias
  // mostradas).
  const monthTotal = chartData.reduce((total, { total: categoryTotal }) => total + categoryTotal, 0);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-neutral-900 dark:text-neutral-100">Análises</h1>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Resumo mensal
          </h2>
          <MonthNavigator basePath="/analises" monthKey={selectedMonth} />
        </div>

        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          Total do mês:{' '}
          <span className="font-medium text-neutral-900 dark:text-neutral-100">
            {monthTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </p>

        <MonthlySummaryChart data={chartData} />
      </section>
    </div>
  );
}
