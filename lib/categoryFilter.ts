// Sentinela usada em todo lugar do app que precisa representar o filtro
// "Sem categoria" (categoria vazia) como um valor de string — tanto no
// dropdown de filtro por coluna da tela de Transações (ver
// components/TransactionsTable.tsx) quanto no parâmetro de URL usado pra
// chegar lá já filtrado (ver o aviso de categorias com saldo negativo em
// app/analises/resumo-mensal/page.tsx). Não dá pra usar '' pra isso porque
// '' já significa "nenhum filtro selecionado" nesses mesmos lugares.
export const NO_CATEGORY_FILTER = '__sem_categoria__';
