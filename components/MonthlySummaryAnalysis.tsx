'use client';

// Orquestra o drill-down de transações do Resumo mensal: guarda qual
// categoria está selecionada (se alguma) e decide o que mostrar abaixo do
// gráfico. app/analises/page.tsx remonta este componente via key={mês}
// sempre que o usuário troca de mês/fatura — o mesmo padrão já usado em
// TransactionsTable (ver app/transacoes/page.tsx) — o que reseta a seleção
// pro padrão (nenhuma) automaticamente, sem precisar de useEffect.
//
// Também mostra uma barra de resumo fixa (sticky) no topo da tela quando a
// categoria selecionada rola pra fora da área visível — útil porque a
// tabela de transações fica bem abaixo do gráfico. MonthlySummaryChart avisa
// (via onSelectedBarVisibilityChange) quando a barra selecionada entra/sai
// da tela; aqui só decidimos mostrar o resumo fixo quando ela está fora E
// há uma seleção ativa.

import { useMemo, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import type { Transaction } from '@/lib/types';
import MonthlySummaryChart from './MonthlySummaryChart';
import CategoryTransactionsTable from './CategoryTransactionsTable';

interface MonthlySummaryAnalysisProps {
  chartData: { category: string; total: number }[];
  transactions: Transaction[];
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Rola de volta pro topo da área de conteúdo (o <main> definido em
// app/layout.tsx é quem tem o scroll de verdade — o resto da página não
// rola). Só existe um <main> na árvore, então buscar direto pelo elemento é
// seguro aqui.
function scrollContentToTop() {
  document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
}

export default function MonthlySummaryAnalysis({ chartData, transactions }: MonthlySummaryAnalysisProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSelectedBarVisible, setIsSelectedBarVisible] = useState(true);

  function handleCategoryClick(category: string) {
    // Reseta a visibilidade ao trocar de seleção: evita que a barra fixa
    // "pisque" com o valor da categoria anterior por uma fração de segundo
    // até o IntersectionObserver da nova barra reportar o estado real.
    setIsSelectedBarVisible(true);
    setSelectedCategory((current) => (current === category ? null : category));
  }

  // Mesma regra de rótulo usada em app/analises/page.tsx pra montar o
  // gráfico (categoria vazia vira "Sem categoria") — precisa ficar
  // consistente pra clicar numa barra filtrar exatamente as transações que
  // compõem aquele saldo. Inclui entradas E saídas (saldo líquido), e
  // ordena sempre do maior valor pro menor (sem ordenação configurável).
  const categoryTransactions = useMemo(() => {
    if (!selectedCategory) return [];
    return transactions
      .filter((t) => (t.category || 'Sem categoria') === selectedCategory)
      .sort((a, b) => b.value - a.value);
  }, [transactions, selectedCategory]);

  const selectedCategoryTotal = chartData.find((entry) => entry.category === selectedCategory)?.total ?? 0;
  const showStickyBar = selectedCategory !== null && !isSelectedBarVisible;

  return (
    <div>
      {/* position: fixed (não sticky) pra não depender do padding/scroll do
          <main> nem empurrar o resto do conteúdo — fica de fora do fluxo
          normal o tempo todo, só a visibilidade muda. left-60 alinha com a
          largura fixa do Sidebar (w-60 em components/Sidebar.tsx). */}
      <div
        className={`fixed top-0 left-60 right-0 z-30 flex items-center gap-3 border-b border-neutral-200 bg-white px-8 py-3 shadow-sm transition-all dark:border-neutral-800 dark:bg-neutral-900 ${
          showStickyBar ? 'opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
        }`}
      >
        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{selectedCategory}</span>
        <span className="text-neutral-300 dark:text-neutral-700">·</span>
        <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
          {currencyFormatter.format(selectedCategoryTotal)}
        </span>
        <span className="text-neutral-300 dark:text-neutral-700">·</span>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          {categoryTransactions.length} {categoryTransactions.length === 1 ? 'transação' : 'transações'}
        </span>
        <button
          onClick={scrollContentToTop}
          className="ml-auto flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <ArrowUp size={12} />
          Ver gráfico
        </button>
      </div>

      <MonthlySummaryChart
        data={chartData}
        selectedCategory={selectedCategory}
        onCategoryClick={handleCategoryClick}
        onSelectedBarVisibilityChange={setIsSelectedBarVisible}
      />
      {selectedCategory && (
        <div className="mt-6">
          <p className="mb-2 text-sm text-neutral-500 dark:text-neutral-400">
            {categoryTransactions.length}{' '}
            {categoryTransactions.length === 1 ? 'transação' : 'transações'}
          </p>
          <CategoryTransactionsTable transactions={categoryTransactions} />
        </div>
      )}
    </div>
  );
}
