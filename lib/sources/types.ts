import type { TransactionType } from '../types';

// Identificador de cada fonte suportada. O usuário escolhe uma dessas na
// tela de upload, ANTES de escolher o arquivo — é essa escolha que diz ao
// app qual conjunto de colunas esperar (bancos diferentes exportam CSVs
// completamente diferentes entre si, então não dá pra "adivinhar" a fonte
// só olhando o arquivo).
export type SourceId = 'c6-credito' | 'nubank-credito' | 'nubank-extrato';

// Uma linha já convertida para o formato interno do app, independente de
// qual fonte ela veio. Só tem a descrição BRUTA (texto original do arquivo)
// — ainda não tem empresa nem categoria, essas duas são decididas depois em
// lib/companyNormalization.ts e lib/categorization.ts, do mesmo jeito para
// qualquer fonte.
export interface ParsedCsvRow {
  date: string; // "AAAA-MM-DD"
  type: TransactionType;
  institution: string;
  format: string;
  description: string;
  installment: string | null;
  value: number; // sempre positivo
}

// Um descarte de linha durante o parsing do CSV — a linha não pôde virar
// transação. "line" é o número da linha no arquivo (null quando a falha é
// do arquivo inteiro, antes até de processar linha a linha — ex: fonte não
// reconhecida, mês não identificável no nome do arquivo). "raw" é a melhor
// reconstrução possível do conteúdo original da linha (colunas brutas
// juntadas pelo separador da própria fonte) — serve de apoio visual pro
// usuário identificar qual linha era; não é garantidamente idêntica
// byte-a-byte ao arquivo original. "reason" é o motivo específico do
// descarte, sem repetir "Linha N:" (isso já é o campo "line", separado).
export interface ParseError {
  line: number | null;
  raw: string;
  reason: string;
}

export interface ParseCsvResult {
  rows: ParsedCsvRow[];
  errors: ParseError[];
}

// O "contrato" que cada fonte precisa cumprir: um rótulo pra aparecer no
// dropdown da tela de upload, e uma função que lê o texto cru do CSV e
// devolve linhas já no formato interno do app.
export interface CsvSource {
  id: SourceId;
  label: string;
  parse: (csvText: string) => ParseCsvResult;
}
