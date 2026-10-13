// Decide se uma transação é "manual-only": Empresa/Categoria nunca são
// sugeridas automaticamente e a confirmação nunca cria nem aplica regra
// aprendida a partir dela (ver docs/PRD.md, "Pix entre pessoas físicas nunca
// é automática").
//
// Vale só para a Fonte 3 (extrato Nubank) com Formato "pix" ou "outro" e
// Descrição sem CNPJ: a descrição bruta de um Pix entre pessoas físicas (nome,
// CPF mascarado, banco, agência, conta) não é um proxy confiável para
// Empresa/Categoria. Boleto e cartão de débito sem CNPJ passam pelo motor
// normal. O Formato é o já inferido na importação (lib/sources/nubankExtrato.ts).

import { containsCnpj } from './cnpj';

const MANUAL_ONLY_FORMATS = ['pix', 'outro'];

export function isManualOnly(input: {
  isNubankExtrato: boolean;
  format: string;
  description: string;
}): boolean {
  return (
    input.isNubankExtrato &&
    MANUAL_ONLY_FORMATS.includes(input.format) &&
    !containsCnpj(input.description)
  );
}
