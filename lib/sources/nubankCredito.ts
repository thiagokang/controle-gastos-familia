// Fonte: fatura de cartão de crédito do Nubank.
// Colunas do arquivo: date, title, amount (valor com vírgula decimal, entre
// aspas — as aspas existem justamente por causa da vírgula). Separador: ",".

import Papa from 'papaparse';
import { normalizeHeader, parseFlexibleDate, parseSignedValue, reconstructRawLine, stripAccents, stripBom } from '../csvHelpers';
import type { ParseCsvResult, ParseError, ParsedCsvRow } from './types';
import type { TransactionType } from '../types';

// Separador do arquivo desta fonte — reaproveitado tanto pelo Papa.parse
// quanto pra reconstruir o conteúdo bruto de uma linha descartada (ver
// ParseError).
const DELIMITER = ',';

// Linhas com esse texto no título são o pagamento da própria fatura (a
// pessoa quitando o cartão), não um gasto de verdade — não viram transação.
const INVOICE_PAYMENT_MARKER = 'pagamento recebido';

function isInvoicePayment(title: string): boolean {
  return stripAccents(title).toLowerCase().includes(INVOICE_PAYMENT_MARKER);
}

export function parseNubankCredito(csvText: string): ParseCsvResult {
  const parsed = Papa.parse<Record<string, string>>(stripBom(csvText), {
    header: true,
    skipEmptyLines: true,
    delimiter: DELIMITER,
    transformHeader: normalizeHeader,
  });

  const rows: ParsedCsvRow[] = [];
  const errors: ParseError[] = [];

  parsed.data.forEach((rawRow, index) => {
    const lineNumber = index + 2;
    const rawDate = rawRow[normalizeHeader('date')] ?? '';
    const rawTitle = rawRow[normalizeHeader('title')] ?? '';
    const rawValue = rawRow[normalizeHeader('amount')] ?? '';

    if (isInvoicePayment(rawTitle)) {
      return;
    }

    const date = parseFlexibleDate(rawDate);
    const signedValue = parseSignedValue(rawValue);
    const description = rawTitle.trim();

    if (!date) {
      errors.push({ line: lineNumber, raw: reconstructRawLine(rawRow, DELIMITER), reason: `Data inválida ("${rawDate}").` });
      return;
    }
    if (!description) {
      errors.push({ line: lineNumber, raw: reconstructRawLine(rawRow, DELIMITER), reason: 'Título em branco.' });
      return;
    }
    if (signedValue === null) {
      errors.push({ line: lineNumber, raw: reconstructRawLine(rawRow, DELIMITER), reason: `Valor inválido ("${rawValue}").` });
      return;
    }

    // Mesma regra de estorno da fatura do C6: positivo = "saída" (compra),
    // negativo = "entrada" (estorno/reembolso).
    const type: TransactionType = signedValue < 0 ? 'entrada' : 'saida';

    rows.push({
      date,
      type,
      institution: 'Nubank',
      format: 'Cartão de crédito',
      description,
      installment: null, // o arquivo não traz essa informação
      value: Math.abs(signedValue),
    });
  });

  return { rows, errors };
}
