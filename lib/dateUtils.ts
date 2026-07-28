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
// Transações e Resumo mensal). Sempre usa o campo "Mês de referência" — para
// faturas de cartão (Fontes 1 e 2) ele vem do nome do arquivo; para o
// extrato/Pix (Fonte 3) é calculado a partir da Data pelo fechamento do
// cartão C6 (ver getExtratoReferenceMonth). O fallback para o mês da própria
// Data só existe por segurança, para transações antigas salvas antes desse
// campo existir.
export function getGroupingMonthKey(transaction: { date: string; referenceMonth: string | null }): string {
  return transaction.referenceMonth ?? getMonthKey(transaction.date);
}

// Dia do mês em que a fatura do cartão C6 fecha. A Fonte 3 (extrato/Pix)
// não tem fatura própria, mas o "Mês de referência" dela é alinhado a esse
// mesmo fechamento para que o Resumo mensal fique consistente entre fontes.
const C6_CLOSING_DAY = 3;

// Calcula o "Mês de referência" de uma transação da Fonte 3 (extrato/Pix) a
// partir da própria Data: dias antes do fechamento (1 e 2) ficam no mês da
// Data; do próprio dia do fechamento (3) em diante já avançam para o mês
// seguinte (com rollover de ano em dezembro -> janeiro), pois é isso que
// cairia na fatura fechada nesse dia.
export function getExtratoReferenceMonth(isoDate: string): string {
  const day = Number(isoDate.slice(8, 10));
  const monthKey = getMonthKey(isoDate);
  return day < C6_CLOSING_DAY ? monthKey : shiftMonthKey(monthKey, 1);
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
