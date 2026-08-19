// Lógica de agregação para o "Histórico por categoria": para cada mês com
// dados (usando o mesmo Mês de referência do Resumo mensal e da tela de
// Transações — ver lib/dateUtils.ts), calcula o saldo líquido total e o
// saldo líquido de cada categoria naquele mês. É a base dos dados do
// gráfico de linhas em app/analises/historico-categoria/page.tsx.

import { INTERNAL_TRANSFER_CATEGORY } from './categorization';
import { formatMonthLabel, getGroupingMonthKey } from './dateUtils';
import type { Transaction } from './types';

// Rótulo usado para transações ainda sem Categoria definida — mesma
// convenção já usada no Resumo mensal (app/analises/resumo-mensal/page.tsx)
// e no filtro de Categoria da tela de Transações.
export const NO_CATEGORY_LABEL = 'Sem categoria';

export interface MonthlyCategoryPoint {
  monthKey: string;
  label: string;
  total: number;
  byCategory: Record<string, number>;
}

function netDelta(transaction: Transaction): number {
  return transaction.type === 'saida' ? transaction.value : -transaction.value;
}

// Uma entrada por mês com dados, em ordem cronológica — cobre TODOS os
// meses disponíveis, não só um (diferente do Resumo mensal). O total de
// cada mês inclui transações sem categoria: elas representam gasto real,
// mesmo sem categoria definida (ver docs/PRD.md, "Histórico por
// categoria"). Diferente do Resumo mensal, não há filtro de saldo positivo
// aqui — a proposta é mostrar a evolução real, incluindo meses em que uma
// categoria fechou negativa (ex: um estorno maior que o gasto do mês).
//
// "Transferência interna" é excluída só do TOTAL agregado (mesma regra do
// Resumo mensal e de Transações — é movimentação entre "bolsos", não gasto
// nem renda real, ver INTERNAL_TRANSFER_CATEGORY em lib/categorization.ts).
// Ela NÃO é excluída de byCategory: sem tratamento especial, a categoria
// "Transferência interna" continua com seu próprio saldo líquido real por
// mês, disponível como qualquer outra caso o usuário a selecione no
// dropdown (ver collectKnownCategories em lib/categoryFilter.ts, que
// também não faz exceção pra ela).
export function buildCategoryHistory(transactions: Transaction[]): MonthlyCategoryPoint[] {
  const monthKeys = Array.from(new Set(transactions.map(getGroupingMonthKey))).sort();

  return monthKeys.map((monthKey) => {
    const monthTransactions = transactions.filter((t) => getGroupingMonthKey(t) === monthKey);
    const byCategory: Record<string, number> = {};
    let total = 0;

    for (const transaction of monthTransactions) {
      const delta = netDelta(transaction);
      const categoryLabel = transaction.category || NO_CATEGORY_LABEL;
      byCategory[categoryLabel] = (byCategory[categoryLabel] ?? 0) + delta;
      if (transaction.category !== INTERNAL_TRANSFER_CATEGORY) {
        total += delta;
      }
    }

    return { monthKey, label: formatMonthLabel(monthKey), total, byCategory };
  });
}
