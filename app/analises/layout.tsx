// Layout compartilhado por todas as análises (Resumo mensal, Histórico por
// categoria, e outras que vierem depois) — só o cabeçalho "Análises" em
// comum; cada página cuida do próprio conteúdo abaixo dele.
export default function AnalisesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-neutral-900 dark:text-neutral-100">Análises</h1>
      {children}
    </div>
  );
}
