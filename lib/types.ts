// Tipos de dados usados em todo o app.
// Ter esse arquivo centralizado ajuda a garantir que uma "transação" tem
// sempre o mesmo formato, seja ela lida do CSV, salva no JSON, ou exibida na tela.

export type TransactionType = 'entrada' | 'saida';

// Uma transação já confirmada pelo usuário e persistida em data/transactions.json.
//
// "description" vs "company": description é o texto EXATAMENTE como veio do
// arquivo (ex: "Zul 1 Cartao 27352u") — nunca é editado, é só o registro do
// dado original. "company" é o nome canônico/normalizado derivado dele (ex:
// "Azul"), calculado por lib/companyNormalization.ts e que PODE ser editado
// pelo usuário. É "company" que é usado para agrupar transações da mesma
// empresa e para sugerir categoria — nunca o texto bruto.
export interface Transaction {
  id: string;
  date: string; // formato ISO "AAAA-MM-DD", facilita ordenação e agrupamento por mês
  type: TransactionType;
  institution: string;
  format: string;
  description: string; // texto bruto original do arquivo, nunca editado
  company: string; // nome canônico normalizado, editável
  installment: string | null; // ex: "9/10", ou null se não for parcelado
  category: string;
  value: number; // valor absoluto (positivo) dessa transação/parcela
}

// De onde veio uma sugestão (de Empresa OU de Categoria) mostrada na tela de
// revisão/transações. Isso é só para dar contexto visual ao usuário — não
// afeta o cálculo. O mesmo tipo serve para os dois porque a lógica de
// sugestão é idêntica nos dois casos (ver lib/categorization.ts e
// lib/companyNormalization.ts).
export type SuggestionSource = 'aprendida' | 'palavra-chave' | 'sem-sugestao';

// Uma linha ainda EM REVISÃO, antes da confirmação. Tem os mesmos campos de
// uma transação, mais a origem de cada sugestão (Empresa e Categoria são
// sugeridas de forma independente) e um id temporário (usado só para
// controlar a lista na tela, não é o id final salvo).
export interface ReviewRow {
  reviewId: string;
  date: string;
  type: TransactionType;
  institution: string;
  format: string;
  description: string;
  company: string;
  companySource: SuggestionSource;
  installment: string | null;
  category: string;
  categorySource: SuggestionSource;
  value: number;
}

// Mapa "nome normalizado da empresa" -> "categoria escolhida pelo usuário".
// É a "memória" de aprendizado: uma vez que o usuário confirma/corrige a
// categoria de uma empresa, ela fica guardada aqui para ser reaproveitada.
export type CategoryRules = Record<string, string>;

// Mapa "descrição bruta normalizada" -> "empresa canônica escolhida pelo
// usuário". Mesma ideia de CategoryRules, mas para o passo anterior:
// aprender qual empresa real corresponde a um texto bruto de transação.
export type CompanyRules = Record<string, string>;
