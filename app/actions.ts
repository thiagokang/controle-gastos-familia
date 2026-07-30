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
import { extractMonthKeyFromFilename } from '@/lib/csvHelpers';
import { containsCnpj } from '@/lib/cnpj';
import { getExtratoReferenceMonth } from '@/lib/dateUtils';
import { getLearnedCategory, learnAndApplyRetroactively, suggestCategory } from '@/lib/categorization';
import { learnAndApplyCompanyRetroactively, normalizeDescriptionKey, suggestCompany } from '@/lib/companyNormalization';
import { inferResponsibleFromFilename } from '@/lib/responsible';
import {
  readCategoryRules,
  readCompanyRules,
  readTransactions,
  writeCategoryRules,
  writeCompanyRules,
  writeTransactions,
} from '@/lib/storage';
import type { ReviewRow, Responsible, Transaction, TransactionType } from '@/lib/types';

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

  // Faturas de cartão (Fontes 1 e 2) não trazem, em nenhuma coluna do CSV,
  // a qual fatura/mês elas pertencem — isso só existe no nome do arquivo
  // que o usuário sobe (ex: "Fatura_2026-07-10.csv" -> julho/2026). Já a
  // Fonte 3 (extrato/Pix) não tem fatura própria, mas cada transação tem seu
  // Mês de referência calculado individualmente a partir da própria Data
  // (ver getExtratoReferenceMonth em lib/dateUtils.ts), então aqui fica null
  // por enquanto — resolvido linha a linha mais abaixo.
  let filenameReferenceMonth: string | null = null;
  if (sourceId === 'c6-credito' || sourceId === 'nubank-credito') {
    filenameReferenceMonth = extractMonthKeyFromFilename(file.name);
    if (!filenameReferenceMonth) {
      return {
        rows: [],
        errors: [
          `Não foi possível identificar o mês da fatura no nome do arquivo "${file.name}". Renomeie o arquivo incluindo o ano e o mês (ex: "Fatura_2026-07-10.csv") e envie novamente.`,
        ],
      };
    }
  }

  const csvText = await file.text();
  const { rows: parsedRows, errors } = source.parse(csvText);

  // Responsável (titular do extrato/fatura de origem): Fontes 1 e 2 são
  // sempre "TK" (só existe um cartão de crédito da família). Só a Fonte 3
  // precisa de inferência, a partir do nome do arquivo — cada titular sobe
  // seu próprio extrato (ver lib/responsible.ts).
  const responsible: Responsible =
    sourceId === 'nubank-extrato' ? inferResponsibleFromFilename(file.name) : 'TK';

  const companyRules = await readCompanyRules();
  const categoryRules = await readCategoryRules();

  const reviewRows: ReviewRow[] = parsedRows.map((row) => {
    // Fonte 3 (extrato/Pix) sem CNPJ na descrição = Pix entre pessoas
    // físicas. A descrição bruta desse tipo de Pix (nome, CPF mascarado,
    // banco, agência, conta) não muda dependendo do propósito da transação,
    // então não é um proxy confiável para Empresa/Categoria — o motor de
    // sugestão nem é consultado nesse caso, mesmo que já exista uma regra
    // aprendida para essa mesma descrição de uploads anteriores.
    const isPixPessoaFisica = sourceId === 'nubank-extrato' && !containsCnpj(row.description);

    // Primeiro sugerimos a Empresa a partir da descrição bruta...
    const { company, source: companySource } = isPixPessoaFisica
      ? { company: '', source: 'sem-sugestao' as const }
      : suggestCompany(row.description, companyRules);
    // ...e só então sugerimos a Categoria a partir da Empresa (se a empresa
    // ficou em branco, suggestCategory naturalmente também não acha nada).
    const { category, source: categorySource } = isPixPessoaFisica
      ? { category: '', source: 'sem-sugestao' as const }
      : suggestCategory(company, categoryRules);
    return {
      reviewId: randomUUID(),
      ...row,
      referenceMonth: filenameReferenceMonth ?? getExtratoReferenceMonth(row.date),
      company,
      companySource,
      category,
      categorySource,
      isPixPessoaFisica,
      responsible,
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
  referenceMonth: string | null;
  type: TransactionType;
  institution: string;
  format: string;
  description: string;
  company: string;
  installment: string | null;
  category: string;
  value: number;
  isPixPessoaFisica: boolean;
  responsible: Responsible;
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
    // Pix entre pessoas físicas (Fonte 3 sem CNPJ): o usuário pode nomear a
    // Empresa manualmente (ex: "Irmã X - Plano Saúde Mãe"), mas isso nunca
    // vira uma regra aprendida nem se aplica retroativamente a outras
    // transações — cada Pix desses é categorizado transação a transação (ver
    // docs/PRD.md). A transação em si ainda é salva normalmente logo abaixo,
    // só com os campos que o usuário definiu.
    if (!row.isPixPessoaFisica) {
      // Se o usuário não definiu empresa/categoria, não há o que aprender —
      // a transação é salva mesmo assim, só que com esses campos em branco.
      if (row.company.trim() !== '') {
        const companyResult = learnAndApplyCompanyRetroactively(row.description, row.company, companyRules, transactions);
        companyRules = companyResult.rules;
        transactions = companyResult.transactions;
      }
      // Sem empresa definida não há o que aprender nem aplicar
      // retroativamente — a categoria escolhida vale só para esta linha (ela
      // já é gravada com sua própria categoria mais abaixo, independente
      // deste bloco).
      if (row.category.trim() !== '' && row.company.trim() !== '') {
        const categoryResult = learnAndApplyRetroactively(row.company, row.category, categoryRules, transactions);
        categoryRules = categoryResult.rules;
        transactions = categoryResult.transactions;
      }
    }

    newTransactions.push({
      id: randomUUID(),
      date: row.date,
      referenceMonth: row.referenceMonth,
      type: row.type,
      institution: row.institution,
      format: row.format,
      description: row.description,
      company: row.company,
      installment: row.installment,
      category: row.category,
      value: row.value,
      responsible: row.responsible,
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
//
// Exceção: se a transação editada não tem Empresa definida, não existe
// "empresa" nenhuma para aprender ou para casar com outras transações — a
// mudança de categoria vale só para esta transação específica (edição
// direta por id), sem tocar em category-rules.json nem em nenhuma outra
// transação (mesmo que também estejam sem empresa: não têm relação entre si
// só por isso).
export async function updateTransactionCategoryAction(
  transactionId: string,
  newCategory: string
): Promise<void> {
  const transactions = await readTransactions();

  const target = transactions.find((t) => t.id === transactionId);
  if (!target) return;

  if (target.company.trim() === '') {
    const updatedTransactions = transactions.map((t) =>
      t.id === transactionId ? { ...t, category: newCategory } : t
    );
    await writeTransactions(updatedTransactions);
    revalidatePath('/transacoes');
    revalidatePath('/analises');
    return;
  }

  const rules = await readCategoryRules();
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
