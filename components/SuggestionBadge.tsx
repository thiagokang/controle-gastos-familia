import type { SuggestionSource } from '@/lib/types';

// Selo colorido que indica de onde veio uma sugestão — usado tanto para
// Empresa quanto para Categoria (a lógica de sugestão é idêntica nos dois
// casos, só a "coisa sugerida" muda). Dá transparência ao usuário sobre o
// porquê daquela sugestão na tela de revisão e na tela de Transações.
const LABELS: Record<SuggestionSource, { text: string; className: string }> = {
  aprendida: {
    text: 'Aprendida',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  'palavra-chave': {
    text: 'Palavra-chave',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  },
  'sem-sugestao': {
    text: 'Sem sugestão',
    className: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  },
};

export default function SuggestionBadge({ source }: { source: SuggestionSource }) {
  const { text, className } = LABELS[source];
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {text}
    </span>
  );
}
