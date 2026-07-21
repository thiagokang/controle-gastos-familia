// Funções de baixo nível reaproveitadas por todos os parsers de fonte
// (lib/sources/*). Cada fonte (C6, Nubank cartão, Nubank extrato) tem seu
// próprio formato de colunas, mas todas precisam das mesmas conversões
// básicas: tirar acento de cabeçalho, ler data, ler valor numérico.

// Alguns exports (principalmente de planilhas abertas/salvas no Excel)
// começam com um caractere invisível "BOM" (marca de ordem de bytes). Se não
// for removido, ele gruda no nome da primeira coluna do cabeçalho e faz a
// leitura dessa coluna falhar silenciosamente.
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// Remove acentos para comparar textos sem depender de acentuação exata
// (ex: cabeçalho "Descrição" vira "descricao" para comparar).
export function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Normaliza o nome de uma coluna do CSV para comparação: sem acento, sem
// espaços nas pontas, minúsculo. Usada tanto para transformar os cabeçalhos
// lidos do arquivo quanto para gerar a chave de busca a partir do nome
// "oficial" da coluna esperada (ex: normalizeHeader('Data de Compra')) —
// assim os dois lados da comparação passam pela mesma regra.
export function normalizeHeader(header: string): string {
  return stripAccents(header).trim().toLowerCase();
}

// Aceita tanto "AAAA-MM-DD" quanto "DD/MM/AAAA" (formato comum de extratos
// brasileiros) e sempre devolve "AAAA-MM-DD", usado em todo o resto do app
// para ordenar e agrupar transações por mês.
export function parseFlexibleDate(rawDate: string): string | null {
  const trimmed = rawDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${year}-${month}-${day}`;
  }
  return null;
}

// Extrai o mês/ano "AAAA-MM" embutido no NOME do arquivo (não no conteúdo
// do CSV) — usado para inferir o "Mês de referência" das faturas de cartão
// (Fontes 1 e 2, ver app/actions.ts), já que essas faturas não trazem em
// nenhuma coluna a qual fatura/mês elas pertencem. Aceita variações comuns:
// "2026-07-10", "2026_07_10", "20260710" (com dia) ou "2026-07"/"2026_07"
// (sem dia, mas exige separador aqui para não confundir com outro número
// qualquer no nome do arquivo). O ano é restrito a "20xx" de propósito —
// sem essa restrição, um ID/protocolo qualquer no nome do arquivo (ex:
// "NU_68548474_...") pode por coincidência parecer um "AAAA-MM" válido.
// Devolve null se nada bater — quem chama decide como reagir (ver parseCsvAction).
export function extractMonthKeyFromFilename(filename: string): string | null {
  const withDay = filename.match(/(20\d{2})[-_]?(\d{2})[-_]?(\d{2})(?!\d)/);
  if (withDay) {
    const [, year, month] = withDay;
    if (Number(month) >= 1 && Number(month) <= 12) return `${year}-${month}`;
  }

  const withoutDay = filename.match(/(20\d{2})[-_](\d{2})(?!\d)/);
  if (withoutDay) {
    const [, year, month] = withoutDay;
    if (Number(month) >= 1 && Number(month) <= 12) return `${year}-${month}`;
  }

  return null;
}

// Aceita valores com separador decimal "," ou "." (com ou sem separador de
// milhar) e sinal opcional (ex: "-410.00", "1.234,56", "150,00"). Ao
// contrário de um parser de moeda genérico, mantém o sinal — cada fonte
// decide o que o sinal significa (em algumas é estorno, em outras é o
// próprio indicador de entrada/saída) antes de guardar o valor absoluto.
export function parseSignedValue(rawValue: string): number | null {
  let cleaned = rawValue.trim().replace(/^R\$\s*/i, '');
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    // "1.234,56" -> "1234.56": ponto é separador de milhar, vírgula é decimal.
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    // "150,00" -> "150.00"
    cleaned = cleaned.replace(',', '.');
  }

  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
}
