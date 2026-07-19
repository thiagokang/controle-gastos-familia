'use server';

// Server Actions: funções que rodam só no servidor, mas são chamadas
// diretamente pelos componentes de tela (client components) como se fossem
// funções normais — o Next.js cuida de transformar essas chamadas em
// requisições HTTP por baixo dos panos. É por isso que este projeto não tem
// uma pasta app/api: essas funções fazem o papel que rotas de API fariam em
// outro setup.
//
// A cadeia de derivação de uma transação é sempre: Descrição bruta (do
// arquivo) -> Empresa (normalizada por lib/companyNormalization.ts) ->
// Categoria (sugerida por lib/categorization.ts a partir da Empresa). Cada
// elo dessa cadeia tem sua própria "memória" de aprendizado retroativo
// (company-rules.json e category-rules.json), e editar um elo no meio
// (Empresa) recalcula o elo seguinte (Categoria) — é a "cascata" comentada
// em updateTransactionCompanyAction, abaixo.

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { CSV_SOURCES } from '@/lib/sources';
import type { SourceId } from '@/lib/sources';
import { getLearnedCategory, learnAndApplyRetroactively, suggestCategory } from '@/lib/categorization';
import { learnAndApplyCompanyRetroactively, normalizeDescriptionKey, suggestCompany } from '@/lib/companyNormalization';
import {
  readCategoryRules,
  readCompanyRules,
  readTransactions,
  writeCategoryRules,
  writeCompanyRules,
  writeTransactions,
} from '@/lib/storage';
import type { ReviewRow, Transaction, TransactionType } from '@/lib/types';

// Passo 1 do fluxo de upload: recebe qual é a fonte do arquivo (isso decide
// qual mapeamento de colunas usar — veja lib/sources) e o próprio arquivo,
// faz o parsing e devolve uma lista de linhas "em revisão" já com Empresa e
// Categoria sugeridas. NADA é salvo em disco aqui — a gravação só acontece em
// confirmTransactionsAction, depois que o usuário revisar/editar na tela.
export async function parseCsvAction(
  sourceId: SourceId,
  formData: FormData
): Promise<{ rows: ReviewRow[]; errors: string[] }> {
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { rows: [], errors: ['Nenhum arquivo foi enviado.'] };
  }

  const source = CSV_SOURCES[sourceId];
  if (!source) {
    return { rows: [], errors: ['Fonte do arquivo não reconhecida.'] };
  }

  const csvText = await file.text();
  const { rows: parsedRows, errors } = source.parse(csvText);

  const companyRules = await readCompanyRules();
  const categoryRules = await readCategoryRules();

  const reviewRows: ReviewRow[] = parsedRows.map((row) => {
    // Primeiro sugerimos a Empresa a partir da descrição bruta...
    const { company, source: companySource } = suggestCompany(row.description, companyRules);
    // ...e só então sugerimos a Categoria a partir da Empresa (se a empresa
    // ficou em branco, suggestCategory naturalmente também não acha nada).
    const { category, source: categorySource } = suggestCategory(company, categoryRules);
    return {
      reviewId: randomUUID(),
      ...row,
      company,
      companySource,
      category,
      categorySource,
    };
  });

  return { rows: reviewRows, errors };
}

// Consultada pela tela de revisão (e também poderia ser pela de Transações)
// sempre que o usuário edita a Empresa de uma linha ainda não salva: olha se
// já existe uma categoria APRENDIDA para essa empresa (sem cair para
// palavra-chave — ver comentário de getLearnedCategory) para aplicar
// automaticamente, ou devolve vazio se a empresa é nova.
export async function getLearnedCategoryForCompanyAction(company: string): Promise<string> {
  const categoryRules = await readCategoryRules();
  return getLearnedCategory(company, categoryRules) ?? '';
}

interface ConfirmableRow {
  date: string;
  type: TransactionType;
  institution: string;
  format: string;
  description: string;
  company: string;
  installment: string | null;
  category: string;
  value: number;
}

// Passo 2 do fluxo de upload: recebe as linhas já revisadas/editadas pelo
// usuário e efetivamente grava tudo. Para cada linha:
//   1. aprende a empresa escolhida para a descrição bruta e aplica
//      retroativamente a quaisquer transações já salvas com a mesma descrição;
//   2. aprende a categoria escolhida para a empresa e aplica retroativamente
//      a quaisquer transações já salvas da mesma empresa;
//   3. transforma a linha em uma Transaction definitiva (com id novo).
// Só depois disso as transações aparecem na tela de Transações.
export async function confirmTransactionsAction(
  reviewRows: ConfirmableRow[]
): Promise<{ savedCount: number }> {
  let transactions = await readTransactions();
  let companyRules = await readCompanyRules();
  let categoryRules = await readCategoryRules();

  const newTransactions: Transaction[] = [];

  for (const row of reviewRows) {
    // Se o usuário não definiu empresa/categoria, não há o que aprender —
    // a transação é salva mesmo assim, só que com esses campos em branco.
    if (row.company.trim() !== '') {
      const companyResult = learnAndApplyCompanyRetroactively(row.description, row.company, companyRules, transactions);
      companyRules = companyResult.rules;
      transactions = companyResult.transactions;
    }
    if (row.category.trim() !== '') {
      const categoryResult = learnAndApplyRetroactively(row.company, row.category, categoryRules, transactions);
      categoryRules = categoryResult.rules;
      transactions = categoryResult.transactions;
    }

    newTransactions.push({
      id: randomUUID(),
      date: row.date,
      type: row.type,
      institution: row.institution,
      format: row.format,
      description: row.description,
      company: row.company,
      installment: row.installment,
      category: row.category,
      value: row.value,
    });
  }

  const allTransactions = [...transactions, ...newTransactions];

  await writeCompanyRules(companyRules);
  await writeCategoryRules(categoryRules);
  await writeTransactions(allTransactions);

  // Avisa o Next.js que os dados por trás dessas páginas mudaram, para que
  // elas sejam recarregadas com os dados novos na próxima navegação.
  revalidatePath('/transacoes');
  revalidatePath('/analises');

  return { savedCount: newTransactions.length };
}

// Edição de categoria feita depois, direto na tela de Transações. Segue a
// mesma regra de aprendizado retroativo: corrige essa transação, aprende a
// regra para a empresa, e aplica em todas as outras transações da mesma empresa.
export async function updateTransactionCategoryAction(
  transactionId: string,
  newCategory: string
): Promise<void> {
  const transactions = await readTransactions();
  const rules = await readCategoryRules();

  const target = transactions.find((t) => t.id === transactionId);
  if (!target) return;

  const result = learnAndApplyRetroactively(target.company, newCategory, rules, transactions);

  await writeCategoryRules(result.rules);
  await writeTransactions(result.transactions);

  revalidatePath('/transacoes');
  revalidatePath('/analises');
}

// Edição de Empresa feita na tela de Transações (ou, via ação equivalente no
// front, na tela de revisão do upload). Duas coisas acontecem em sequência:
//   1. Aprendizado retroativo de Empresa: a nova empresa é aplicada a TODAS
//      as transações que têm a mesma descrição bruta que a transação editada
//      (não só a que o usuário mexeu).
//   2. Cascata para Categoria: cada uma dessas transações (que acabaram de
//      trocar de empresa) tem sua categoria recalculada — usa a categoria já
//      aprendida para a empresa nova, se existir, ou fica em branco se a
//      empresa é nova (nunca herda a categoria antiga, que era da empresa
//      errada). Note que isso NÃO usa sugestão por palavra-chave, só a
//      aprendida — ver comentário de getLearnedCategory.
export async function updateTransactionCompanyAction(
  transactionId: string,
  newCompany: string
): Promise<void> {
  const transactions = await readTransactions();
  const companyRules = await readCompanyRules();
  const categoryRules = await readCategoryRules();

  const target = transactions.find((t) => t.id === transactionId);
  if (!target) return;

  const companyResult = learnAndApplyCompanyRetroactively(target.description, newCompany, companyRules, transactions);

  const learnedCategory = getLearnedCategory(newCompany, categoryRules) ?? '';
  const targetDescriptionKey = normalizeDescriptionKey(target.description);
  const finalTransactions = companyResult.transactions.map((transaction) =>
    normalizeDescriptionKey(transaction.description) === targetDescriptionKey
      ? { ...transaction, category: learnedCategory }
      : transaction
  );

  await writeCompanyRules(companyResult.rules);
  await writeTransactions(finalTransactions);

  revalidatePath('/transacoes');
  revalidatePath('/analises');
}
