// Lista inicial de palavras-chave usada na PRIORIDADE 2 da sugestão de categoria
// (veja lib/categorization.ts): se o nome da empresa contiver uma dessas palavras,
// sugerimos a categoria correspondente. É só um ponto de partida — o usuário pode
// editar esta lista livremente conforme for vendo o que falta.
//
// A comparação é feita em maiúsculas e por "contém" (não precisa ser o nome exato),
// então "UBER TRIP" e "UBER *EATS" caem na mesma regra "UBER".
export interface KeywordRule {
  keyword: string;
  category: string;
}

export const KEYWORD_CATEGORY_RULES: KeywordRule[] = [
  // Transporte
  { keyword: 'UBER', category: 'Transporte' },
  { keyword: '99APP', category: 'Transporte' },
  { keyword: 'POSTO', category: 'Transporte' },
  { keyword: 'SHELL', category: 'Transporte' },
  { keyword: 'IPIRANGA', category: 'Transporte' },
  { keyword: 'ESTACIONAMENTO', category: 'Transporte' },

  // Alimentação
  { keyword: 'IFOOD', category: 'Alimentação' },
  { keyword: 'RAPPI', category: 'Alimentação' },
  { keyword: 'MERCADO', category: 'Alimentação' },
  { keyword: 'SUPERMERCADO', category: 'Alimentação' },
  { keyword: 'PADARIA', category: 'Alimentação' },
  { keyword: 'RESTAURANTE', category: 'Alimentação' },

  // Saúde
  { keyword: 'FARMACIA', category: 'Saúde' },
  { keyword: 'DROGARIA', category: 'Saúde' },
  { keyword: 'HOSPITAL', category: 'Saúde' },
  { keyword: 'CLINICA', category: 'Saúde' },

  // Lazer
  { keyword: 'NETFLIX', category: 'Lazer' },
  { keyword: 'SPOTIFY', category: 'Lazer' },
  { keyword: 'CINEMA', category: 'Lazer' },
  { keyword: 'PRIME VIDEO', category: 'Lazer' },

  // Educação
  { keyword: 'ESCOLA', category: 'Educação' },
  { keyword: 'FACULDADE', category: 'Educação' },
  { keyword: 'UNIVERSIDADE', category: 'Educação' },
  { keyword: 'CURSO', category: 'Educação' },
];
