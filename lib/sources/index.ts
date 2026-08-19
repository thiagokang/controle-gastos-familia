// Registro central das fontes de importação suportadas. A tela de upload
// mostra esse dropdown para o usuário escolher ANTES de subir o arquivo —
// veja components/UploadFlow.tsx. Para adicionar uma fonte nova no futuro:
// criar um arquivo parseXxx.ts (seguindo o padrão dos outros três) e
// registrar aqui.

import { parseC6Credito } from './c6Credito';
import { parseNubankCredito } from './nubankCredito';
import { parseNubankExtrato } from './nubankExtrato';
import type { CsvSource, SourceId } from './types';

export const CSV_SOURCES: Record<SourceId, CsvSource> = {
  'c6-credito': {
    id: 'c6-credito',
    label: 'C6 (cartão de crédito)',
    parse: parseC6Credito,
  },
  'nubank-credito': {
    id: 'nubank-credito',
    label: 'Nubank (cartão de crédito)',
    parse: parseNubankCredito,
  },
  'nubank-extrato': {
    id: 'nubank-extrato',
    label: 'Nubank (extrato conta corrente / Pix)',
    parse: parseNubankExtrato,
  },
};

export const CSV_SOURCE_LIST: CsvSource[] = Object.values(CSV_SOURCES);

export type { CsvSource, ParseError, SourceId } from './types';
