// Lista inicial de palavras-chave usada na PRIORIDADE 2 da sugestão de
// empresa (veja lib/companyNormalization.ts): se a descrição bruta da
// transação contiver uma dessas palavras, sugerimos o nome canônico
// correspondente. Ponto de partida — edite/expanda livremente.
//
// Exemplo do problema que isso resolve: a mesma compra de passagem aérea
// pode aparecer como "Zul 1 Cartao 27352u" ou "Zul 2 Cartoes 25dpg7" —
// descrições diferentes, mesma empresa real ("Azul").
export interface CompanyKeywordRule {
  keyword: string;
  company: string;
}

export const COMPANY_KEYWORD_RULES: CompanyKeywordRule[] = [
  { keyword: 'ZUL', company: 'Azul' },
  { keyword: 'GOL', company: 'Gol' },
  { keyword: 'LATAM', company: 'Latam' },
  { keyword: 'UBER', company: 'Uber' },
  { keyword: 'IFOOD', company: 'iFood' },
  { keyword: 'RAPPI', company: 'Rappi' },
  { keyword: 'NETFLIX', company: 'Netflix' },
  { keyword: 'SPOTIFY', company: 'Spotify' },
];
