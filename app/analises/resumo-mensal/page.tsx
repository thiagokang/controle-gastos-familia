import Link from 'next/link';
import { readTransactions } from '@/lib/storage';
import { currentMonthKey, getGroupingMonthKey } from '@/lib/dateUtils';
import { NO_CATEGORY_FILTER } from '@/lib/categoryFilter';
import MonthNavigator from '@/components/MonthNavigator';
import MonthlySummaryAnalysis from '@/components/MonthlySummaryAnalysis';
import CollapsibleWarning from '@/components/CollapsibleWarning';

interface ResumoMensalPageProps {
  searchParams: Promise<{ month?: string }>;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const NO_CATEGORY_LABEL = 'Sem categoria';

// Primeira análise da seção Análises: total gasto por categoria no mês
// selecionado, do maior para o menor (ver components/Sidebar.tsx para a
// navegação entre esta e as demais análises, e app/analises/layout.tsx para
// o cabeçalho "Análises" compartilhado).
export default async function ResumoMensalPage({ searchParams }: ResumoMensalPageProps) {
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
    const categoryLabel = transaction.category || NO_CATEGORY_LABEL;
    const delta = transaction.type === 'saida' ? transaction.value : -transaction.value;
    netByCategory.set(categoryLabel, (netByCategory.get(categoryLabel) ?? 0) + delta);
  }

  // Só categorias com saldo positivo viram barra: uma barra "pra
  // trás"/negativa competiria visualmente com as barras de gasto normal.
  // Categorias negativas não somem de vista, porém — ver
  // negativeCategories logo abaixo, que alimenta o aviso colapsável.
  const chartData = Array.from(netByCategory.entries())
    .filter(([, total]) => total > 0)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  // Categorias com saldo negativo no mês (ex: reembolso maior que o gasto
  // original) — não aparecem como barra, mas o usuário precisa ter ciência
  // delas pra poder investigar/corrigir a categorização se for o caso.
  // Ordenadas da mais negativa pra menos negativa.
  const negativeCategories = Array.from(netByCategory.entries())
    .filter(([, total]) => total < 0)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => a.total - b.total);

  // Saldo líquido do mês = saldo líquido de TODAS as transações do mês
  // (categorizadas ou não, incluindo "Sem categoria"), sem excluir
  // categorias negativas da soma — mesmo cálculo e mesmo valor exibido em
  // Transações e na linha "Saldo líquido" do Histórico por categoria. Por
  // decisão de produto, esse valor pode divergir da soma visual das barras
  // exibidas (categorias negativas entram aqui, mas não viram barra) — é
  // esperado, não é bug (ver docs/PRD.md, "Resumo mensal").
  const monthNetTotal = monthTransactions.reduce(
    (total, t) => total + (t.type === 'saida' ? t.value : -t.value),
    0
  );

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Resumo mensal
        </h2>
        <MonthNavigator basePath="/analises/resumo-mensal" monthKey={selectedMonth} />
      </div>

      <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
        Saldo líquido do mês:{' '}
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          {currencyFormatter.format(monthNetTotal)}
        </span>
      </p>

      {negativeCategories.length > 0 && (
        <CollapsibleWarning
          summary={`⚠️ ${negativeCategories.length} ${
            negativeCategories.length === 1 ? 'categoria' : 'categorias'
          } com saldo negativo neste mês`}
        >
          <ul className="divide-y divide-amber-200 dark:divide-amber-900">
            {negativeCategories.map(({ category, total }) => (
              <li key={category}>
                <Link
                  href={`/transacoes?month=${selectedMonth}&category=${encodeURIComponent(
                    category === NO_CATEGORY_LABEL ? NO_CATEGORY_FILTER : category
                  )}`}
                  className="flex items-center justify-between gap-3 py-1.5 text-sm hover:underline"
                >
                  <span>{category}</span>
                  <span className="font-medium">{currencyFormatter.format(total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </CollapsibleWarning>
      )}

      <MonthlySummaryAnalysis key={selectedMonth} chartData={chartData} transactions={monthTransactions} />
    </section>
  );
}
