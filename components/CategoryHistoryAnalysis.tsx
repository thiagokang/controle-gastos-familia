'use client';

// Orquestra o "Histórico por categoria": guarda quais categorias estão
// selecionadas (multi-select) e monta o índice de cor estável por categoria
// (ver comentário em CategoryHistoryChart) antes de passar pro gráfico.

import { useMemo, useState } from 'react';
import type { MonthlyCategoryPoint } from '@/lib/categoryHistory';
import { NO_CATEGORY_LABEL } from '@/lib/categoryHistory';
import CategoryHistoryChart from './CategoryHistoryChart';
import CategoryMultiSelect from './CategoryMultiSelect';

interface CategoryHistoryAnalysisProps {
  history: MonthlyCategoryPoint[];
  knownCategories: string[];
}

export default function CategoryHistoryAnalysis({ history, knownCategories }: CategoryHistoryAnalysisProps) {
  // "Sem categoria" entra como mais uma opção da lista, na primeira posição
  // — mesmo padrão de posição já usado no filtro de Categoria da tela de
  // Transações (ver components/TransactionsTable.tsx).
  const selectableCategories = useMemo(() => [NO_CATEGORY_LABEL, ...knownCategories], [knownCategories]);

  // Índice FIXO por categoria (não muda conforme a seleção) — é o que
  // garante que uma categoria sempre apareça na mesma cor no gráfico, mesmo
  // quando outras categorias são selecionadas/desmarcadas ao redor dela
  // (ver comentário em CategoryHistoryChart).
  const categoryColorIndex = useMemo(() => {
    const map = new Map<string, number>();
    selectableCategories.forEach((category, index) => map.set(category, index));
    return map;
  }, [selectableCategories]);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Histórico por categoria
        </h2>
        <CategoryMultiSelect
          categories={selectableCategories}
          selected={selectedCategories}
          onChange={setSelectedCategories}
        />
      </div>

      <CategoryHistoryChart
        data={history}
        selectedCategories={selectedCategories}
        categoryColorIndex={categoryColorIndex}
      />
    </div>
  );
}
