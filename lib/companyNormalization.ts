// ============================================================================
// NORMALIZAÇÃO DE EMPRESA: sugestão + aprendizado retroativo, espelhando
// exatamente a lógica de Categoria em lib/categorization.ts — só que um
// passo antes na cadeia (Descrição bruta -> Empresa -> Categoria).
// ============================================================================
//
// Por quê: a mesma empresa real pode aparecer com descrições brutas
// diferentes na fatura (ex: "Zul 1 Cartao 27352u" e "Zul 2 Cartoes 25dpg7"
// são ambas a companhia aérea "Azul"). Se usássemos a descrição bruta direto
// como empresa, a mesma empresa apareceria duplicada com nomes diferentes,
// e a categorização (que depende da empresa) ficaria inconsistente.
//
// Prioridade da sugestão (idêntica à de Categoria):
//   1. "Aprendida": essa descrição bruta já apareceu antes e o usuário
//      definiu manualmente qual é a empresa -> reaproveita.
//   2. "Palavra-chave": a descrição bruta contém uma palavra-chave conhecida
//      (lib/companyKeywords.ts), ex: "ZUL" -> "Azul".
//   3. "Sem sugestão": deixa em branco para o usuário decidir.

import { COMPANY_KEYWORD_RULES } from './companyKeywords';
import type { CompanyRules, SuggestionSource, Transaction } from './types';

// Normaliza a descrição bruta para usar como chave de comparação/armazenamento,
// do mesmo jeito que normalizeCompanyName faz para nomes de empresa.
export function normalizeDescriptionKey(description: string): string {
  return description.trim().toUpperCase().replace(/\s+/g, ' ');
}

// Dada uma descrição bruta e as regras já aprendidas, decide qual empresa
// sugerir e de onde essa sugestão veio (mostrado na tela de revisão).
export function suggestCompany(
  description: string,
  learnedRules: CompanyRules
): { company: string; source: SuggestionSource } {
  const normalizedDescription = normalizeDescriptionKey(description);

  // Prioridade 1: empresa já aprendida para essa descrição bruta.
  const learnedCompany = learnedRules[normalizedDescription];
  if (learnedCompany) {
    return { company: learnedCompany, source: 'aprendida' };
  }

  // Prioridade 2: alguma palavra-chave conhecida aparece na descrição.
  const keywordMatch = COMPANY_KEYWORD_RULES.find((rule) =>
    normalizedDescription.includes(rule.keyword.toUpperCase())
  );
  if (keywordMatch) {
    return { company: keywordMatch.company, source: 'palavra-chave' };
  }

  // Prioridade 3: não há nada para sugerir, o usuário decide.
  return { company: '', source: 'sem-sugestao' };
}

// Aplica a empresa escolhida para uma descrição bruta a TODAS as transações
// com essa mesma descrição (correção retroativa) e atualiza a regra
// aprendida correspondente. Mesmo padrão de learnAndApplyRetroactively em
// lib/categorization.ts, só que a chave é a Descrição em vez da Empresa —
// note que isso só atualiza o campo "company"; a cascata para "category"
// (recalcular a categoria quando a empresa muda) é feita separadamente por
// quem chama esta função, em app/actions.ts.
export function learnAndApplyCompanyRetroactively(
  description: string,
  newCompany: string,
  currentRules: CompanyRules,
  currentTransactions: Transaction[]
): { rules: CompanyRules; transactions: Transaction[]; retroactiveCount: number } {
  const normalizedDescription = normalizeDescriptionKey(description);

  const updatedRules: CompanyRules = {
    ...currentRules,
    [normalizedDescription]: newCompany,
  };

  let retroactiveCount = 0;
  const updatedTransactions = currentTransactions.map((transaction) => {
    const isSameDescription = normalizeDescriptionKey(transaction.description) === normalizedDescription;
    if (isSameDescription && transaction.company !== newCompany) {
      retroactiveCount += 1;
      return { ...transaction, company: newCompany };
    }
    return transaction;
  });

  return { rules: updatedRules, transactions: updatedTransactions, retroactiveCount };
}
