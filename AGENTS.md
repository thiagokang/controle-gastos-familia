<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Sobre o projeto

App de controle de gastos familiares. Next.js (App Router) + React no front, dados salvos em JSON local (`data/`) — sem banco de dados neste MVP. Contexto completo de produto (regras de negócio, fluxo de upload, telas) está em [`docs/PRD.md`](docs/PRD.md) — leia antes de mudar qualquer regra de categorização, normalização de empresa ou agrupamento por mês.

O Notion é a fonte da verdade do produto. docs/PRD.md é uma cópia local, gerada a partir do Notion, nunca editada à mão.

PÁGINAS QUE ENTRAM NA CÓPIA (e somente elas):
- as páginas da visão de Versions deste projeto (https://app.notion.com/p/3a7ee8fb540380d1a9abe4c8f7d47687?v=3a7ee8fb54038049a72c000c9bd384b9) com Status Delivery, Testing ou Done. Páginas em Backlog, To-do ou Discovery ficam de fora (ainda são rascunho)
- outras páginas aprovadas: 'Arquitetura do produto' (page_id 3c0ee8fb-5403-8155-928b-e282aca103b9)

PÁGINAS QUE NUNCA ENTRAM (só link, se citadas):
- o conteúdo da própria página do projeto 'Controle de gastos familiar' (Objetivo, Why, What, Stakeholders) e o database de Tasks
- 'Palavras-chave de Empresa' (page_id 3f4ee8fb-5403-81ea-8be5-cf0bfb92ce64)
- os cases do projeto: EN (406ee8fb5403805ba044d6a91a08620d) e PT (406ee8fb54038053a3a2dc6074537096)

PÁGINAS NOVAS: se houver qualquer página dentro de 'Controle de gastos familiar' (page_id 39fee8fb-5403-801d-8c64-daa6d55e021e) que não esteja em nenhuma das duas listas acima, exceto as páginas do database Versions, me pergunte antes de seguir em qual lista ela entra e atualize este arquivo com a resposta.

No INÍCIO de qualquer tarefa que envolva regra de negócio:
(a) liste quais páginas entraram na cópia;
(b) compare o conteúdo (não a formatação) de docs/PRD.md com essas páginas, nos DOIS sentidos: o que está no Notion e falta no docs/PRD.md, e o que está no docs/PRD.md e falta no Notion;
(c) classifique cada diferença: 'esperada' (corresponde ao que o prompt pede para implementar ou remover) ou 'inesperada' (qualquer outra);
(d) se houver diferença inesperada, PARE e me reporte antes de seguir. Conteúdo que existe só no docs/PRD.md pode ser uma regra apagada por engano no Notion: nunca sobrescreva o arquivo antes de eu decidir;
(e) reporte também se a mesma regra estiver descrita em mais de uma página, ou se duas páginas se contradisserem. Cada fato deve viver num lugar só: 'Arquitetura do produto' diz o que existe e onde encontrar; cada página de versão diz como a funcionalidade funciona;
(f) se só houver diferenças esperadas, sincronize docs/PRD.md a partir do Notion e implemente com base nele.
No FINAL da tarefa, compare de novo; se o Notion mudou durante o trabalho, sincronize docs/PRD.md outra vez e me diga o que mudou.

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
