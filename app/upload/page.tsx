import UploadFlow from '@/components/UploadFlow';
import { readCategoryRules, readCompanyRules } from '@/lib/storage';
import { KEYWORD_CATEGORY_RULES } from '@/lib/keywords';
import { COMPANY_KEYWORD_RULES } from '@/lib/companyKeywords';

// Server Component: monta as listas de empresas e categorias já conhecidas
// (aprendidas + as das listas de palavras-chave) e entrega para o componente
// de cliente que controla o fluxo de upload/revisão. Ler os dados aqui (no
// servidor) evita ter que expor uma rota de API só para isso.
export default async function UploadPage() {
  const categoryRules = await readCategoryRules();
  const companyRules = await readCompanyRules();

  const knownCategories = Array.from(
    new Set([...Object.values(categoryRules), ...KEYWORD_CATEGORY_RULES.map((r) => r.category)])
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const knownCompanies = Array.from(
    new Set([...Object.values(companyRules), ...COMPANY_KEYWORD_RULES.map((r) => r.company)])
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-neutral-900 dark:text-neutral-100">Enviar fatura</h1>
      <UploadFlow knownCompanies={knownCompanies} knownCategories={knownCategories} />
    </div>
  );
}
