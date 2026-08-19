// Fonte: extrato da conta corrente do Nubank (Pix, boletos, transferências).
// Colunas do arquivo: Data, Valor, Identificador, Descrição. Separador: ",".
// Diferente das faturas de cartão, aqui não existe uma coluna "Tipo" — o
// sinal do próprio Valor já diz se é entrada ou saída, sem regra de estorno.

import Papa from 'papaparse';
import { normalizeHeader, parseFlexibleDate, parseSignedValue, reconstructRawLine, stripAccents, stripBom } from '../csvHelpers';
import type { ParseCsvResult, ParseError, ParsedCsvRow } from './types';
import type { TransactionType } from '../types';

// Separador do arquivo desta fonte — reaproveitado tanto pelo Papa.parse
// quanto pra reconstruir o conteúdo bruto de uma linha descartada (ver
// ParseError).
const DELIMITER = ',';

// Linhas com esses textos são o pagamento de uma fatura de cartão feito a
// partir dessa conta — esse valor já é contado quando a própria fatura do
// cartão é importada (Fontes 1 e 2), então aqui ele seria um gasto em
// duplicidade. Não viram transação.
const INVOICE_PAYMENT_MARKERS = ['pagamento de fatura', 'pagamento de boleto efetuado - banco c6 s.a.'];

function isCreditCardInvoicePayment(description: string): boolean {
  const normalized = stripAccents(description).toLowerCase();
  return INVOICE_PAYMENT_MARKERS.some((marker) => normalized.includes(marker));
}

// A Descrição não separa "forma da transação" em coluna própria — inferimos
// pelo texto. Qualquer coisa que não seja Pix, boleto ou débito cai em "outro".
function inferFormat(description: string): string {
  const normalized = stripAccents(description).toLowerCase();
  if (normalized.includes('pix')) return 'pix';
  if (normalized.includes('boleto')) return 'boleto';
  if (normalized.includes('debito')) return 'cartão de débito';
  return 'outro';
}

export function parseNubankExtrato(csvText: string): ParseCsvResult {
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
    const rawDate = rawRow[normalizeHeader('Data')] ?? '';
    const rawDescription = rawRow[normalizeHeader('Descrição')] ?? '';
    const rawValue = rawRow[normalizeHeader('Valor')] ?? '';
    // "Identificador" existe no arquivo mas não é usado no MVP.

    // Pagamento da fatura do cartão feito por essa conta não é um gasto novo
    // — já foi contado na importação da fatura em si. A linha é ignorada
    // silenciosamente (não conta como erro, é um descarte esperado).
    if (isCreditCardInvoicePayment(rawDescription)) {
      return;
    }

    const date = parseFlexibleDate(rawDate);
    const signedValue = parseSignedValue(rawValue);
    const description = rawDescription.trim();

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
      installment: null, // Pix/boleto/débito não parcela
      value: Math.abs(signedValue),
    });
  });

  return { rows, errors };
}
