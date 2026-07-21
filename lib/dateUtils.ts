// Utilitários para trabalhar com datas e "meses de fatura" em português.
// Guardamos a data da transação sempre como string ISO "AAAA-MM-DD" (lib/csv.ts
// cuida dessa conversão na entrada), o que deixa ordenar e agrupar por mês trivial:
// basta comparar/cortar a string, sem precisar de biblioteca de datas.

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// Extrai a chave de mês "AAAA-MM" a partir de uma data ISO "AAAA-MM-DD".
// Essa chave é usada para agrupar transações e para navegar entre meses na UI.
export function getMonthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

// Mês usado para AGRUPAR/PAGINAR uma transação por fatura (tela de
// Transações e Resumo mensal). Para transações com "Mês de referência"
// definido (faturas de cartão — Fontes 1 e 2, ver lib/types.ts), usa esse
// campo; senão (Fonte 3, extrato/Pix, que não tem conceito de fatura
// fechada) cai para o mês da própria Data. Sem isso, parcelas de uma mesma
// compra — que sempre têm a mesma Data de Compra — ficariam todas
// agrupadas no mês da compra original, em vez de cada uma na fatura em que
// de fato foi cobrada.
export function getGroupingMonthKey(transaction: { date: string; referenceMonth: string | null }): string {
  return transaction.referenceMonth ?? getMonthKey(transaction.date);
}

// Transforma "2026-07" em "Julho 2026", para exibir no navegador de meses.
export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return `${MONTH_NAMES_PT[month - 1]} ${year}`;
}

// Move uma chave de mês "AAAA-MM" para frente ou para trás (delta pode ser negativo).
export function shiftMonthKey(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  const newYear = date.getUTCFullYear();
  const newMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${newYear}-${newMonth}`;
}

// Formata "2026-07-15" como "15/07/2026" para exibição na tabela de transações.
export function formatDateBR(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

// Chave de mês referente a hoje, usada como fallback quando ainda não há
// nenhuma transação salva (para o navegador de meses ter algo para mostrar).
export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
