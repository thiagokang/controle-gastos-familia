import { readTransactions } from '@/lib/storage';
import { buildCategoryHistory } from '@/lib/categoryHistory';
import { collectKnownCategories } from '@/lib/categoryFilter';
import CategoryHistoryAnalysis from '@/components/CategoryHistoryAnalysis';

// Segunda análise da seção Análises: evolução do saldo líquido por
// categoria ao longo de TODOS os meses disponíveis nos dados — diferente do
// Resumo mensal, que olha um mês por vez (ver docs/PRD.md, "Histórico por
// categoria", e app/analises/layout.tsx para o cabeçalho "Análises"
// compartilhado).
export default async function HistoricoCategoriaPage() {
  const allTransactions = await readTransactions();
  const history = buildCategoryHistory(allTransactions);
  const knownCategories = collectKnownCategories(allTransactions);

  if (history.length === 0) {
    return (
      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Histórico por categoria
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhuma transação registrada ainda.</p>
      </section>
    );
  }

  return (
    <section>
      <CategoryHistoryAnalysis history={history} knownCategories={knownCategories} />
    </section>
  );
}
