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

export interface ParseCsvResult {
  rows: ParsedCsvRow[];
  errors: string[]; // mensagens legíveis, referenciando o número da linha do arquivo
}

// O "contrato" que cada fonte precisa cumprir: um rótulo pra aparecer no
// dropdown da tela de upload, e uma função que lê o texto cru do CSV e
// devolve linhas já no formato interno do app.
export interface CsvSource {
  id: SourceId;
  label: string;
  parse: (csvText: string) => ParseCsvResult;
}
