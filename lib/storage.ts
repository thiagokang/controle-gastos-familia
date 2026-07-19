// Camada de "banco de dados" do MVP: em vez de um banco de verdade, guardamos
// tudo em arquivos JSON dentro da pasta /data na raiz do projeto.
// - transactions.json: todas as transações já confirmadas pelo usuário.
// - category-rules.json: a "memória" de categorização aprendida (empresa -> categoria).
// - company-rules.json: a "memória" de normalização de empresa aprendida
//   (descrição bruta -> empresa canônica).
//
// Esses arquivos NÃO ficam no git (veja .gitignore) porque contêm dados
// financeiros reais. Este arquivo cria os arquivos automaticamente na
// primeira vez que o app roda, então não é preciso criá-los manualmente.

import { promises as fs } from 'fs';
import path from 'path';
import type { CategoryRules, CompanyRules, Transaction } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');
const CATEGORY_RULES_FILE = path.join(DATA_DIR, 'category-rules.json');
const COMPANY_RULES_FILE = path.join(DATA_DIR, 'company-rules.json');

// Garante que a pasta /data e o arquivo existem antes de ler/escrever.
// Se o arquivo não existir ainda, cria com o conteúdo padrão informado.
async function ensureFile(filePath: string, defaultContent: string): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, defaultContent, 'utf-8');
  }
}

export async function readTransactions(): Promise<Transaction[]> {
  await ensureFile(TRANSACTIONS_FILE, '[]');
  const raw = await fs.readFile(TRANSACTIONS_FILE, 'utf-8');
  return JSON.parse(raw) as Transaction[];
}

export async function writeTransactions(transactions: Transaction[]): Promise<void> {
  await ensureFile(TRANSACTIONS_FILE, '[]');
  await fs.writeFile(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2), 'utf-8');
}

export async function readCategoryRules(): Promise<CategoryRules> {
  await ensureFile(CATEGORY_RULES_FILE, '{}');
  const raw = await fs.readFile(CATEGORY_RULES_FILE, 'utf-8');
  return JSON.parse(raw) as CategoryRules;
}

export async function writeCategoryRules(rules: CategoryRules): Promise<void> {
  await ensureFile(CATEGORY_RULES_FILE, '{}');
  await fs.writeFile(CATEGORY_RULES_FILE, JSON.stringify(rules, null, 2), 'utf-8');
}

export async function readCompanyRules(): Promise<CompanyRules> {
  await ensureFile(COMPANY_RULES_FILE, '{}');
  const raw = await fs.readFile(COMPANY_RULES_FILE, 'utf-8');
  return JSON.parse(raw) as CompanyRules;
}

export async function writeCompanyRules(rules: CompanyRules): Promise<void> {
  await ensureFile(COMPANY_RULES_FILE, '{}');
  await fs.writeFile(COMPANY_RULES_FILE, JSON.stringify(rules, null, 2), 'utf-8');
}
