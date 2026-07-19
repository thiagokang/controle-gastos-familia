# controle-gastos-familia

Uma forma de controlar os gastos da família e ter saúde financeira.

Veja o contexto completo do produto em [`docs/PRD.md`](docs/PRD.md).

## Rodando localmente

Pré-requisito: Node.js 18 ou mais recente.

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Dados

Os dados (transações confirmadas e as regras de categorização aprendidas)
ficam salvos localmente em arquivos JSON dentro da pasta `data/` — não há
banco de dados nesse MVP. Essa pasta é ignorada pelo git (veja
`.gitignore`) para não versionar dados financeiros reais da família.
