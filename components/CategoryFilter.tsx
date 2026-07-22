'use client';

// Dropdown de filtro por categoria na tela de Transações. Precisa ser
// 'use client' porque muda a URL (e por consequência os dados exibidos)
// assim que o usuário troca a seleção, via useRouter.

import { useRouter } from 'next/navigation';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string; // 'all', 'none' (sem categoria) ou o nome de uma categoria
  monthKey: string;
}

export default function CategoryFilter({ categories, selectedCategory, monthKey }: CategoryFilterProps) {
  const router = useRouter();

  return (
    <select
      value={selectedCategory}
      onChange={(e) => {
        const params = new URLSearchParams({ month: monthKey });
        if (e.target.value !== 'all') params.set('category', e.target.value);
        router.push(`/transacoes?${params.toString()}`);
      }}
      className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
    >
      <option value="all">Todas as categorias</option>
      <option value="none">Sem categoria</option>
      {categories.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </select>
  );
}
