// ============================================================================
// CORAÇÃO DA LÓGICA DE NEGÓCIO: sugestão de categoria + aprendizado retroativo.
// ============================================================================
//
// Como funciona a categorização (nessa ordem de prioridade):
//   1. "Aprendida": se essa empresa já teve uma categoria escolhida pelo
//      usuário antes (em qualquer upload anterior), usamos essa categoria.
//      Isso é lido de data/category-rules.json (via lib/storage.ts).
//   2. "Palavra-chave": senão, olhamos se o nome da empresa contém alguma
//      palavra-chave conhecida (lib/keywords.ts), tipo "UBER" -> "Transporte".
//   3. "Sem sugestão": senão, deixamos a categoria em branco para o usuário
//      escolher manualmente na tela de revisão.
//
// Como funciona a correção retroativa:
//   Toda vez que o usuário confirma ou edita a categoria de uma transação
//   (seja na tela de revisão do upload, seja depois na tela de Transações),
//   duas coisas acontecem juntas:
//   a) a regra "empresa -> categoria" é salva/atualizada (isso é o "aprendizado"),
//   b) TODAS as transações já salvas dessa mesma empresa são atualizadas para
//      a nova categoria — não só a que o usuário editou.
//   Assim, uma única correção conserta o histórico inteiro de uma vez.

import { KEYWORD_CATEGORY_RULES } from './keywords';
import type { CategoryRules, SuggestionSource, Transaction } from './types';

// Normaliza o nome da empresa para usar como chave de comparação/armazenamento.
// Sem isso, "Uber", "UBER" e " uber " seriam tratados como empresas diferentes
// e o aprendizado de categoria não funcionaria de forma confiável.
export function normalizeCompanyName(company: string): string {
  return company.trim().toUpperCase().replace(/\s+/g, ' ');
}

// Dado o nome de uma empresa e as regras já aprendidas, decide qual categoria
// sugerir e de onde essa sugestão veio (para mostrar na tela de revisão).
export function suggestCategory(
  company: string,
  learnedRules: CategoryRules
): { category: string; source: SuggestionSource } {
  const normalizedCompany = normalizeCompanyName(company);

  // Empresa em branco não é uma chave válida — não faz sentido procurar
  // regra aprendida nem palavra-chave para "nenhuma empresa".
  if (normalizedCompany === '') {
    return { category: '', source: 'sem-sugestao' };
  }

  // Prioridade 1: categoria já aprendida para essa empresa.
  const learnedCategory = learnedRules[normalizedCompany];
  if (learnedCategory) {
    return { category: learnedCategory, source: 'aprendida' };
  }

  // Prioridade 2: alguma palavra-chave conhecida aparece no nome da empresa.
  const keywordMatch = KEYWORD_CATEGORY_RULES.find((rule) =>
    normalizedCompany.includes(rule.keyword.toUpperCase())
  );
  if (keywordMatch) {
    return { category: keywordMatch.category, source: 'palavra-chave' };
  }

  // Prioridade 3: não há nada para sugerir, o usuário decide.
  return { category: '', source: 'sem-sugestao' };
}

// Busca SÓ a categoria já aprendida para uma empresa (prioridade 1, sem cair
// para palavra-chave). Usada na cascata Empresa -> Categoria (veja
// app/actions.ts): quando o usuário corrige a Empresa de uma transação, a
// categoria deve seguir a empresa nova SE já houver uma categoria aprendida
// para ela — e ficar em branco se não houver, nunca "adivinhar" por
// palavra-chave nesse caso específico (evita aplicar uma categoria errada
// via um match coincidente de palavra-chave logo depois de uma correção manual).
export function getLearnedCategory(company: string, rules: CategoryRules): string | null {
  const normalizedCompany = normalizeCompanyName(company);
  if (normalizedCompany === '') return null;
  return rules[normalizedCompany] ?? null;
}

// Núcleo puro da correção retroativa: aplica newCategory a toda linha cuja
// empresa (normalizada) bate com `company`. Usado tanto para transações já
// salvas (learnAndApplyRetroactively, abaixo — tela de Transações) quanto
// para as linhas ainda em memória da tela de revisão do upload (ver
// handleCategoryChange em components/UploadFlow.tsx) — as duas telas
// aplicam exatamente o mesmo mecanismo, não cópias dele.
//
// IMPORTANTE: empresa em branco nunca é uma chave válida de agrupamento —
// ver comentário de learnAndApplyRetroactively.
export function applyCategoryToSameCompany<T extends { company: string; category: string }>(
  rows: T[],
  company: string,
  newCategory: string
): T[] {
  const normalizedCompany = normalizeCompanyName(company);
  if (normalizedCompany === '') return rows;

  return rows.map((row) =>
    normalizeCompanyName(row.company) === normalizedCompany && row.category !== newCategory
      ? { ...row, category: newCategory }
      : row
  );
}

// Aplica a categoria escolhida para uma empresa a TODAS as transações dessa
// empresa (correção retroativa) e atualiza a regra aprendida correspondente.
// Retorna as listas atualizadas (imutável — não modifica os argumentos originais)
// e quantas transações além da atual foram alteradas, só para feedback ao usuário.
//
// IMPORTANTE: empresa em branco nunca é uma chave válida de aprendizado. Sem
// essa guarda, categorizar manualmente UMA transação sem empresa definida
// criaria uma regra "'' -> categoria" que vazaria essa mesma categoria para
// TODAS as outras transações também sem empresa — mesmo sendo de empresas
// reais diferentes entre si, que só coincidem em não ter empresa nenhuma.
// Por isso esta função é um no-op nesse caso: quem chama continua
// responsável por aplicar a categoria só na transação específica que o
// usuário editou (ver app/actions.ts).
export function learnAndApplyRetroactively(
  company: string,
  newCategory: string,
  currentRules: CategoryRules,
  currentTransactions: Transaction[]
): { rules: CategoryRules; transactions: Transaction[]; retroactiveCount: number } {
  const normalizedCompany = normalizeCompanyName(company);

  if (normalizedCompany === '') {
    return { rules: currentRules, transactions: currentTransactions, retroactiveCount: 0 };
  }

  const updatedRules: CategoryRules = {
    ...currentRules,
    [normalizedCompany]: newCategory,
  };

  const updatedTransactions = applyCategoryToSameCompany(currentTransactions, company, newCategory);
  const retroactiveCount = updatedTransactions.reduce(
    (count, transaction, index) => count + (transaction !== currentTransactions[index] ? 1 : 0),
    0
  );

  return { rules: updatedRules, transactions: updatedTransactions, retroactiveCount };
}
