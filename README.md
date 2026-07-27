# controle-gastos-familia

## Why & What
Com a família crescendo, fica ainda mais necessário uma boa disciplina financeira até porque os custos futuros vão escalar e muito. Com isso em mente, desenvolvi esse app para registrar todos os gastos que temos como família e assim ter uma forma de analisar nossos gastos. A partir de categorização das transações e análises dessas categorias ao longo do tempo, conseguimos desenhar planos de ação para garantir uma saúde financeira.

Veja o contexto completo do produto em [`docs/PRD.md`](docs/PRD.md).

## How
Por mais que seja um projeto pessoal, eu encarei o desenvolvimento desse app como um produto real. Ou seja, comecei documentando no Notion a visão do produto, validei o mockup, acompanhei o desenvolvimento e testei com dados reais para identificar melhorias e bugs.

### Discovery do problema
Desde que senti a necessidade de acompanhar mais de perto os gastos familiares, procurei por alternativas que entregassem:
* **Riqueza de informação**: para desenhar planos de ação, é preciso ter dados de qualidade e análises que respondessem às minhas perguntas
* **Facilidade de uso**: registrar os gastos deve ser algo fácil de se fazer porque, se apresentar muito atrito, muito provavelmente o hábito não se concretiza
* **Segurança dos dados**: os dados de consumo da família são dados sensíveis e não gostaria que outras empresas pudessem ter essa informação e usar de alguma forma

Cheguei a montar um processo envolvendo Google Sheets e Google Forms, além de procurar por apps prontos, mas nenhum deles satisfez as três principais características que eu buscava. Com a chegada da IA, vi a oportunidade de desenvolver meu próprio app, exatamente como gostaria.

### Discovery da solução
Com a visão do produto descrita no Notion, fiz do Claude um designer e um tech lead para me ajudar a concretizar a visão e me aproximar de um MVP. Simplificamos a forma de registrar os gastos; decidimos regras de categorização e como ela vai aprender com o tempo; e definimos que o resumo mensal por categoria seria a primeira análise que já resolvesse parte do problema. Depois disso, pedi para que o Claude fizesse um mockup em HTML/CSS que me ajudou a identificar alguns ajustes importantes e, com isso, serviu de referência na construção do prompt que enviaria para o Claude Code.
Obs: para o MVP, não usamos o Claude Design por ser um produto pessoal, onde meu foco está muito mais na função do que na forma.

### Delivery com IA
Sendo um PM sem background técnico, a versão desktop do Claude Code foi a interface que escolhi para seguir com o desenvolvimento. E essa escolha envolveu aprender como equilibrar: a concessão de permissões, o controle sobre o produto que estava sendo desenvolvido e uma boa velocidade de entrega. Em termos práticos, eu usei o "plan mode" do Claude Code - que me permite aceitar tudo em um único momento - para garantir que o prompt passou a mensagem correta e que as permissões necessárias estavam alinhadas com o objetivo. Estando correto, o Claude Code atualizava o [`docs/PRD.md`](docs/PRD.md) com o que estava no Notion e escrevia o código. Uma vez implementado, cabia a mim testar, confirmar e pedir o commit + push.

### Iteração com dados reais
Com o produto funcionando, chegou o grande momento de usar faturas e extratos reais para registrar os gastos e começar a formar resumos mensais. Como a quantidade de arquivos a serem baixados era grande, contei com a ajuda do Claude Cowork - sempre se preocupando com o _lethal trifecta_ - para encontrar os emails com as faturas e extratos, baixar cada arquivo para sua pasta respectiva, seguindo a estrutura de nome definida para cada tipo de arquivo, instituição e período.
Assim como tudo que é desenvolvido, foi somente com o uso real do produto que identifiquei alguns bugs e melhorias, sendo os três mais interessantes:
* Dicionário para cada arquivo dos bancos - quando subi os primeiros arquivos, me deparei como cada arquivo era diferente (dados, formato das compras parceladas, separadores) e que seria necessário interpretar cada um deles de uma forma diferente para que se encaixasse no formato que definimos no app. Para resolver isso, agora é necessário selecionar qual tipo de arquivo que está sendo feito o _upload_ para que a interpretação e importação dos dados sejam corretas.
* Agrupamento por fatura - algumas compras parceladas (só que de parcelas diferentes) estavam aparecendo no mesmo mês e foi quando percebi que o agrupamento usava como base a data de compra e não a fatura.
* Normalização de "Empresa" - descobri que usar a descrição bruta como uma forma de identificar a qual empresa pertence aquela transação não funcionaria já que, para uma mesma empresa, a descrição bruta pode variar a cada compra. Resolvi isso com uma normalização desse dado onde por reconhecimento de padrões ensinados ou por sugestão de palavra-chave já seria possível de identificar automaticamente a qual empresa determinada descrição bruta pertence. Consequentemente, essa normalização facilitou na categorização da transação já que a categorização é por empresa e não por transação.

Obs: o ciclo de trabalho com o Claude Code mencionado acima (prompt -> plan mode -> PRD sincronizado -> teste -> commit+push) se perpetuou durante toda a iteração, onde cada commit representou uma entrega.

## Decisões técnicas interessantes
### Cálculo de saldo líquido por categoria
Essa definição é extremamente importante e que torna esse app tão próximo da realidade porque nem todo gasto é somente da família. A vida real significa dividir a conta do jantar com os amigos, da viagem entre família, do plano de saúde dos pais e que, por praticidade, faz mais sentido alguém pagar tudo e receber o pix das outras partes depois. Considerar somente os gastos deixaria um _gap_ significativo no saldo da família, gerando conclusões e planos de ação incorretos.

### Categorização por empresa e não por transação individual
Essa foi uma decisão deliberada desde o início por reduzir significativamente o esforço de categorização manual. A categorização automática imprecisa tem baixa frequência pelos hábitos de consumo da família e baixo impacto já que, se for algo relevante, será identificado nas análises e ignorado na hora da construção do plano de ação da família. Caso isso se torne frequente, é algo que também podemos pensar em outras formas de lidar com isso no futuro.

### Dados financeiros fora do Git
Segurança dos dados é uma das três principais características que esse projeto deve ter e, antecipando o momento em que tornaria esse repositório público, os dados financeiros estão em `.gitignore` por preservação de privacidade.

### Sem banco de dados, só JSON local
Por mais elegante e educativa que seja a construção de um banco de dados, para o MVP e considerando o contexto de uso atual, isso não é um _must have_. Eu sou o único responsável por esse assunto na família, o volume de registros ainda não é um problema para a performance, as consultas iniciais são filtros simples (mês e categoria), não existe a necessidade de tabelas relacionais por enquanto e conseguimos outras formas de fazer o backup dos dados. Por isso, um JSON local é perfeito para o MVP.

## Stack
* Next.js
* TypeScript
* Tailwind CSS
* JSON local
* papaparse
* recharts

## Como rodar localmente

Pré-requisito: Node.js (recomendado via nvm)

```bash
# 1. Clone o repositório
git clone https://github.com/tkangbw/controle-gastos-familia.git
cd controle-gastos-familia

# 2. Instale as dependências
npm install

# 3. Rode o servidor de desenvolvimento
npm run dev
```

Depois disso, acesse http://localhost:3000/transacoes no navegador.

Nota: os dados ficam salvos localmente em arquivos JSON (pasta data/), que não são versionados no Git por conterem informações financeiras reais. Ao rodar pela primeira vez, esses arquivos são criados automaticamente.
