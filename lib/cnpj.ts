// Detecção de CNPJ na Descrição bruta de uma transação — usado para
// distinguir Pix para uma empresa (tem CNPJ) de Pix entre pessoas físicas
// (não tem), já que só o segundo caso não deve seguir o motor normal de
// aprendizado de Empresa/Categoria (ver lib/companyNormalization.ts e
// app/actions.ts).

// Formato XX.XXX.XXX/XXXX-XX, com cada separador opcional (bancos variam a
// pontuação usada na descrição do Pix — alguns mandam sem pontuação nenhuma).
const CNPJ_PATTERN = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/;

export function containsCnpj(description: string): boolean {
  return CNPJ_PATTERN.test(description);
}
