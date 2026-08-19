// Fonte: fatura de cartão de crédito do C6.
// Colunas do arquivo: Data de Compra; Nome no Cartão; Final do Cartão;
// Categoria; Descrição; Parcela; Valor (em US$); Cotação (em R$); Valor (em R$)
// Separador: ";" (típico de export feito/aberto em Excel no Brasil).

import Papa from 'papaparse';
import { normalizeHeader, parseFlexibleDate, parseSignedValue, reconstructRawLine, stripAccents, stripBom } from '../csvHelpers';
import type { ParseCsvResult, ParseError, ParsedCsvRow } from './types';
import type { TransactionType } from '../types';

// Separador do arquivo desta fonte — reaproveitado tanto pelo Papa.parse
// quanto pra reconstruir o conteúdo bruto de uma linha descartada (ver
// ParseError).
const DELIMITER = ';';

// Linhas com esse texto na Descrição são o próprio pagamento da fatura (a
// pessoa quitando o cartão), não um gasto de verdade — não viram transação.
const INVOICE_PAYMENT_MARKER = 'pag fatura boleto';

function isInvoicePayment(description: string): boolean {
  return stripAccents(description).toLowerCase().includes(INVOICE_PAYMENT_MARKER);
}

export function parseC6Credito(csvText: string): ParseCsvResult {
  const parsed = Papa.parse<Record<string, string>>(stripBom(csvText), {
    header: true,
    skipEmptyLines: true,
    delimiter: DELIMITER,
    transformHeader: normalizeHeader,
  });

  const rows: ParsedCsvRow[] = [];
  const errors: ParseError[] = [];

  parsed.data.forEach((rawRow, index) => {
    const lineNumber = index + 2; // +1 pelo cabeçalho, +1 porque index começa em 0
    const rawDate = rawRow[normalizeHeader('Data de Compra')] ?? '';
    const rawDescription = rawRow[normalizeHeader('Descrição')] ?? '';
    const rawInstallment = rawRow[normalizeHeader('Parcela')] ?? '';
    const rawValue = rawRow[normalizeHeader('Valor (em R$)')] ?? '';

    // Pagamento da própria fatura não é um gasto — a linha é ignorada
    // silenciosamente (não conta como erro, é um descarte esperado).
    if (isInvoicePayment(rawDescription)) {
      return;
    }

    const date = parseFlexibleDate(rawDate);
    const signedValue = parseSignedValue(rawValue);
    const description = rawDescription.trim();
    const installment = rawInstallment.trim() === '' ? null : rawInstallment.trim();

    if (!date) {
      errors.push({ line: lineNumber, raw: reconstructRawLine(rawRow, DELIMITER), reason: `Data inválida ("${rawDate}").` });
      return;
    }
    if (!description) {
      errors.push({ line: lineNumber, raw: reconstructRawLine(rawRow, DELIMITER), reason: 'Descrição em branco.' });
      return;
    }
    if (signedValue === null) {
      errors.push({ line: lineNumber, raw: reconstructRawLine(rawRow, DELIMITER), reason: `Valor inválido ("${rawValue}").` });
      return;
    }

    // Regra de estorno: numa fatura de cartão, compras vêm com valor
    // positivo (você deve esse dinheiro = "saída"); um valor negativo é
    // dinheiro voltando (estorno/reembolso) = "entrada".
    const type: TransactionType = signedValue < 0 ? 'entrada' : 'saida';

    rows.push({
      date,
      type,
      institution: 'C6',
      format: 'Cartão de crédito',
      description,
      installment,
      value: Math.abs(signedValue),
    });
  });

  return { rows, errors };
}
