<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Sobre o projeto

App de controle de gastos familiares. Next.js (App Router) + React no front, dados salvos em JSON local (`data/`) — sem banco de dados neste MVP. Contexto completo de produto (regras de negócio, fluxo de upload, telas) está em [`docs/PRD.md`](docs/PRD.md) — leia antes de mudar qualquer regra de categorização, normalização de empresa ou agrupamento por mês.

# Comandos

- `npm run dev` — servidor local
- `npm run lint` — ESLint
- `npm run build` — build de produção
- Não há suite de testes automatizados neste projeto ainda; validar mudanças rodando o app localmente.

# Dados sensíveis

- `data/*.json` contém dados financeiros reais da família e é ignorado pelo git (`.gitignore`). Nunca remover esse ignore nem commitar esses arquivos.
- Os arquivos `data/transactions.backup-*.json` são backups pontuais, não a fonte de verdade — a fonte de verdade é `data/transactions.json`.

# Regras de negócio fáceis de errar

Estas regras já causaram bugs corrigidos mais de uma vez (ver histórico do git) — preste atenção especial ao mexer em categorização/upload:

- Uma regra aprendida de Categoria só pode ser criada ou aplicada quando a Empresa da transação já está definida. Se o usuário categorizar manualmente uma transação sem Empresa definida, isso vale só para aquela transação — não vira regra e não se propaga.
- Correção de Categoria deve valer retroativamente para todas as transações da mesma Empresa (inclusive durante a revisão de upload, em tempo real, não só após confirmar).
- Agrupamento por mês: todas as fontes usam o **Mês de referência** (nunca a Data pura). Nas Fontes 1 e 2 (fatura de cartão), vem do nome do arquivo; na Fonte 3 (extrato/Pix), é calculado a partir da Data pelo fechamento do cartão C6 (dia 3) — ver `getExtratoReferenceMonth` em `lib/dateUtils.ts`. Resumo mensal e tela de Transações devem usar sempre o mesmo critério.
