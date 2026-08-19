import type { Transaction } from './types';

// Sentinela usada em todo lugar do app que precisa representar o filtro
// "Sem categoria" (categoria vazia) como um valor de string — tanto no
// dropdown de filtro por coluna da tela de Transações (ver
// components/TransactionsTable.tsx) quanto no parâmetro de URL usado pra
// chegar lá já filtrado (ver o aviso de categorias com saldo negativo em
// app/analises/resumo-mensal/page.tsx). Não dá pra usar '' pra isso porque
// '' já significa "nenhum filtro selecionado" nesses mesmos lugares.
export const NO_CATEGORY_FILTER = '__sem_categoria__';

// Todas as categorias já usadas em alguma transação (não vazia), ordenadas
// alfabeticamente — fonte ÚNICA usada tanto pelo filtro de Categoria da
// tela de Transações (ver app/transacoes/page.tsx) quanto pelo dropdown de
// seleção do Histórico por categoria (ver
// app/analises/historico-categoria/page.tsx), pra garantir que as duas
// listas nunca divirjam. Sem tratamento especial pra nenhuma categoria —
// "Transferência interna" aparece aqui normalmente se houver alguma
// transação categorizada assim, mesmo sendo excluída do saldo líquido
// agregado (ver INTERNAL_TRANSFER_CATEGORY em lib/categorization.ts e o
// comentário de buildCategoryHistory em lib/categoryHistory.ts). "Sem
// categoria" também não entra aqui — é adicionada separadamente por quem
// monta cada seletor (mesmo padrão em TransactionsTable.tsx e
// CategoryHistoryAnalysis.tsx).
export function collectKnownCategories(transactions: Transaction[]): string[] {
  return Array.from(new Set(transactions.map((t) => t.category).filter((c) => c !== ''))).sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );
}
