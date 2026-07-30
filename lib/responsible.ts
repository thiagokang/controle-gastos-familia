// Responsável (titular do extrato/fatura de origem) — Thiago ("TK") ou a
// esposa ("Deby"). Ver docs/PRD.md, "Regra geral de Responsável".

import type { Responsible } from './types';

export const RESPONSIBLE_VALUES: Responsible[] = ['TK', 'Deby'];

// Só a Fonte 3 (extrato/Pix) precisa de inferência — cada titular sobe seu
// próprio extrato, então o nome do arquivo é o único sinal disponível. "TK"
// é o valor padrão: cobre tanto os extratos do Thiago quanto qualquer nome
// de arquivo que não identifique claramente a Deby.
export function inferResponsibleFromFilename(filename: string): Responsible {
  return filename.toLowerCase().includes('deby') ? 'Deby' : 'TK';
}

// Transações salvas antes deste campo existir não têm "responsible" no JSON
// (fica undefined) — "TK" é o valor padrão descrito no PRD, então é o
// fallback seguro aqui (mesmo padrão do fallback de referenceMonth em
// getGroupingMonthKey, lib/dateUtils.ts).
export function getResponsible(transaction: { responsible?: Responsible | null }): Responsible {
  return transaction.responsible ?? 'TK';
}
