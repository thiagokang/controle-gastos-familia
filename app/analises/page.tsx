import { redirect } from 'next/navigation';

interface AnalisesPageProps {
  searchParams: Promise<{ month?: string }>;
}

// "/analises" sozinho não é mais uma tela de verdade — vira "Resumo mensal"
// (a primeira análise que existiu). Preserva o ?month= já na URL, se houver,
// pra não quebrar links/favoritos antigos que apontavam pra cá.
export default async function AnalisesPage({ searchParams }: AnalisesPageProps) {
  const { month } = await searchParams;
  redirect(month ? `/analises/resumo-mensal?month=${month}` : '/analises/resumo-mensal');
}
