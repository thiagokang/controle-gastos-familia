// Fonte: extrato da conta corrente do Nubank (Pix, boletos, transferências).
// Colunas do arquivo: Data, Valor, Identificador, Descrição. Separador: ",".
// Diferente das faturas de cartão, aqui não existe uma coluna "Tipo" — o
// sinal do próprio Valor já diz se é entrada ou saída, sem regra de estorno.

import Papa from 'papaparse';
import { normalizeHeader, parseFlexibleDate, parseSignedValue, stripBom } from '../csvHelpers';
import type { ParseCsvResult, ParsedCsvRow } from './types';
import type { TransactionType } from '../types';

// A Descrição não separa "forma da transação" em coluna própria — inferimos
// pelo texto. Qualquer coisa que não seja Pix nem boleto cai em "outro".
function inferFormat(description: string): string {
  const normalized = description.toLowerCase();
  if (normalized.includes('pix')) return 'pix';
  if (normalized.includes('boleto')) return 'boleto';
  return 'outro';
}

export function parseNubankExtrato(csvText: string): ParseCsvResult {
  const parsed = Papa.parse<Record<string, string>>(stripBom(csvText), {
    header: true,
    skipEmptyLines: true,
    delimiter: ',',
    transformHeader: normalizeHeader,
  });

  const rows: ParsedCsvRow[] = [];
  const errors: string[] = [];

  parsed.data.forEach((rawRow, index) => {
    const lineNumber = index + 2;
    const rawDate = rawRow[normalizeHeader('Data')] ?? '';
    const rawDescription = rawRow[normalizeHeader('Descrição')] ?? '';
    const rawValue = rawRow[normalizeHeader('Valor')] ?? '';
    // "Identificador" existe no arquivo mas não é usado no MVP.

    const date = parseFlexibleDate(rawDate);
    const signedValue = parseSignedValue(rawValue);
    const description = rawDescription.trim();

    if (!date) {
      errors.push(`Linha ${lineNumber}: data inválida ("${rawDate}").`);
      return;
    }
    if (!description) {
      errors.push(`Linha ${lineNumber}: descrição em branco.`);
      return;
    }
    if (signedValue === null) {
      errors.push(`Linha ${lineNumber}: valor inválido ("${rawValue}").`);
      return;
    }

    // Aqui o sinal do valor JÁ é a informação de tipo (negativo = saiu da
    // conta, positivo = entrou) — não existe uma regra de estorno separada
    // como nas faturas de cartão.
    const type: TransactionType = signedValue < 0 ? 'saida' : 'entrada';

    rows.push({
      date,
      type,
      institution: 'Nubank',
      format: inferFormat(rawDescription),
      description,
      installment: null, // Pix/boleto não parcela
      value: Math.abs(signedValue),
    });
  });

  return { rows, errors };
}
