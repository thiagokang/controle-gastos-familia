> **Nota sobre este documento:** o Notion é a fonte da verdade para o PRD — o conteúdo é organizado em múltiplas páginas dentro do roadmap do produto no Notion. Este arquivo (`docs/PRD.md`) é sempre um espelho sincronizado a partir delas — nunca deve ser editado de forma independente. Sempre que o Notion mudar, use um prompt de sincronização dedicado (pedindo para puxar o Notion e realinhar este arquivo) para trazer `docs/PRD.md` de volta ao alinhamento.
>
> Páginas-fonte sincronizadas até agora:
> - [Registrar gasto, categorizar e um resumo mensal](https://app.notion.com/p/39fee8fb540380c1b45fc293cfca611c) (`page_id 39fee8fb-5403-80c1-b45f-c293cfca611c`) — registro de gasto, resumo mensal, ordenação/filtro em Transações, fontes de dados e regras de importação
> - [Histórico por categoria](https://app.notion.com/p/39fee8fb540380179021d340d95101a8) (`page_id 39fee8fb-5403-8017-9021-d340d95101a8`) — segunda análise da seção Análises
> - [Arquitetura do produto](https://app.notion.com/p/3c0ee8fb54038155928be282aca103b9) (`page_id 3c0ee8fb-5403-8155-928b-e282aca103b9`) — formato, stack técnica e navegação (transversal ao produto, movido para fora da página de registro de gasto)
> - [Avaliação da identificação de Empresa (eval)](https://app.notion.com/p/3f0ee8fb54038110b593d52da24721c7) (`page_id 3f0ee8fb-5403-8110-b593-d52da24721c7`) — eval repetível do motor de normalização de Empresa (simulação mês a mês, linha de base antes de mudar a lógica)

# Objetivo

Ter controle dos gastos familiares, podendo analisar por categorias e tipos, para manter uma boa saúde financeira

# Why

Com a chegada do segundo filho, precisamos ser mais disciplinados sobre como os nossos gastos se comparam com o nosso salário para poder se antecipar a grandes gastos no futuro (ex: educação, saúde, viagens, etc).

# What

Considerar todas as nossas transações (entrada e saída) de diferentes canais (pix, cartão de crédito, cartão de débito) e de diferentes instituições (bancos, vales,etc). Por enquanto, não precisamos considerar a receita já que ela é estável (remuneração).

# How

## MVP
### Registro de gasto e categorização

Nesse MVP, a idéia é que eu consiga subir a fatura em CSV para coletar esses dados mais facilmente, para começar a registrar os gastos com os seguintes dados:

- Data: seria a data da transação
- Mês de referência: a qual fatura/mês essa transação pertence (diferente da Data — uma parcela pode ter Data de Compra em um mês e Mês de referência em outro, já que ela aparece em faturas diferentes ao longo do parcelamento). Para as Fontes 1 e 2 (faturas de cartão), vem do nome do arquivo. Para a Fonte 3 (extrato/Pix), que não tem fatura de verdade, o Mês de referência é calculado alinhando ao fechamento do cartão principal (C6, dia 3): se o dia da Data for < 3, o Mês de referência é o mesmo mês da Data; se for ≥ 3 (incluindo o próprio dia 3), é o mês seguinte. Isso é uma aproximação deliberada (o fechamento real do Nubank é dia 8, diferente do C6) para manter um alinhamento único de período entre todas as fontes
- Tipo: Entrada ou saída de dinheiro
- Instituição: Por onde foi feita a transação (ex: Nubank, C6)
- Formato: De qual forma foi feita a transação (ex: pix, cartão de crédito)
- Empresa: De onde ou para onde foi o dinheiro
    - A descrição bruta do arquivo (ex: "Zul 1 Cartao 27352u") não vira Empresa diretamente — ela passa por um motor de normalização (mesma lógica de aprendizado da Categoria: regra aprendida + sugestão por palavra-chave) que converte para um nome canônico (ex: "Azul"). Isso evita ter a mesma empresa duplicada com nomes diferentes
    - A descrição bruta original é preservada e exibida como texto secundário abaixo do nome da Empresa, tanto na tela de revisão quanto na de Transações — serve de apoio para identificar/conferir a empresa
    - Se o usuário editar a Empresa de uma transação, a Categoria é recalculada automaticamente: se a nova Empresa já tem uma categoria aprendida, ela é aplicada; se for uma Empresa nova, a Categoria fica em branco para categorização manual
    - Importante: o motor de aprendizado de Categoria só deve criar ou aplicar regras quando a Empresa estiver definida. Se o usuário categorizar manualmente uma transação cuja Empresa ainda está em branco, essa escolha vale só para aquela transação — não deve criar uma regra salva, nem se propagar para outras transações que também estejam sem Empresa definida (elas não compartilham identidade só por estarem ambas em branco)
- Parcela: Indicar se é uma compra parcelada ou não
    - Obs: No MVP, não precisamos conectar as compras parceladas entre si
- Categoria: Qual a origem do gasto (Ex: alimentação, educação, saúde, lazer, transporte, etc)
    - Identificar a qual categoria determinada transação pertence vai ser um trabalho gradual onde a cada fatura que subo eu devo categorizar o que ainda não se sabe. Uma vez categorizado, essa informação deve ser salva num lugar para que seja reaproveitada na interpretação de uma outra fatura. Vale também considerar a possibilidade que eu vou errar de categoria e vou querer corrigir depois, sendo que essa correção deve valer de forma retroativa
    - Para reduzir meu trabalho, se for possível de se já trazer sugestões a partir de algumas palavras-chave (ex: "Uber" → "transporte"), pode trazer a sugestão
- Valor: O valor gasto
    - Obs: no caso de uma compra parcelada, seria o valor de uma única parcela

### Resumo mensal

Vamos começar com um resumo dos gastos feitos naquele mês, onde cada categoria deve ser representada por uma barra e o gráfico deve ser ordenado de forma decrescente.

**Qual "mês" considerar:** o mesmo critério usado na tela de Transações — todas as fontes (1, 2 e 3) usam o **Mês de referência**, não a Data. Isso garante que o mês exibido no Resumo bata exatamente com o que aparece na página daquele mesmo mês em Transações.

**Regra de cálculo:** para cada categoria, o valor exibido é o **saldo líquido** = soma das saídas − soma das entradas daquela categoria, no mês. Isso cobre casos como um estorno cancelando um gasto anterior (ex: anuidade do cartão estornada) — desde que a entrada seja categorizada na mesma categoria do gasto original, o saldo líquido reflete corretamente que aquele gasto não se concretizou.

Só categorias com saldo líquido positivo aparecem como barra no gráfico. Categorias com saldo líquido zero ou negativo (ex: reembolso maior que o gasto do mês naquela categoria, ou uma entrada de dinheiro sem gasto correspondente) não aparecem misturadas como barra — uma barra "pra trás"/negativa competiria visualmente com as barras de gasto normal.

**Saldo líquido do mês:** exibido junto ao gráfico, é o saldo líquido de **todas** as transações do mês (categorizadas ou não, incluindo "Sem categoria"), sem excluir categorias negativas da soma — exceto transações categorizadas como "Transferência interna", que são sempre excluídas dessa soma (ver regra dedicada mais abaixo). Mesmo cálculo e mesmo valor exibido em Transações e na linha "Saldo líquido" do gráfico de Histórico por categoria. Por decisão de produto, esse valor pode divergir da soma visual das barras exibidas (já que categorias negativas entram no cálculo do total mas não aparecem como barra) — isso é esperado, não é um bug.

**Aviso de categorias com saldo negativo:** quando existe 1+ categoria com saldo líquido negativo no mês (portanto ausente do gráfico de barras), um aviso aparece acima do gráfico mostrando a contagem (ex: "⚠️ 2 categorias com saldo negativo neste mês"). O aviso começa recolhido; ao clicar, expande e lista as categorias negativas, ordenadas por valor (mais negativa primeiro), com seus respectivos valores. Cada categoria listada é clicável e leva diretamente para a aba Transações, já filtrada por essa categoria + mês, para o usuário investigar e corrigir a categorização se necessário (a correção em si acontece só na aba Transações, nunca dentro de Análises). Se não houver nenhuma categoria negativa no mês, o aviso não aparece.

**Drill-down de transações por categoria:** clicar em uma barra do gráfico mostra, na mesma tela (sem navegação), a lista das transações daquela categoria naquele mês, logo abaixo do gráfico.

- A tabela inclui tanto saídas quanto entradas da categoria — precisa refletir o saldo líquido já exibido no gráfico (ex: um estorno/reembolso categorizado ali aparece na lista).
- Estrutura de colunas igual à tela de Transações — Data, Tipo, Instituição, Formato, Empresa, Parcela, Valor, Responsável —, exceto a coluna Categoria (redundante, já que a seleção já indica qual é).
- Acima da tabela é exibida a contagem de transações (ex: "12 transações"); não é exibida soma de valores, já mostrada no gráfico.
- Ordenação fixa por Valor, do maior para o menor — sem ordenação ou filtro configurável pelo usuário nessa tabela.
- Nenhuma ação é permitida na tabela (sem editar categoria, sem navegar a partir dela) — é só visualização.
- Interação: as barras têm indicativo visual de que são clicáveis (cursor e destaque de hover); clicar destaca a barra selecionada e abre a tabela; clicar na mesma categoria de novo fecha a tabela; clicar em outra categoria troca a seleção e atualiza a tabela direto, sem precisar fechar antes; trocar de mês reseta a seleção (a tela sempre abre sem categoria selecionada).

**Barra de resumo fixa (sticky):** como a tabela aparece bem abaixo do gráfico, ao rolar a página e a categoria selecionada sair da área visível, uma barra fina e fixa aparece grudada no topo absoluto da tela, mostrando: nome da categoria, valor líquido e contagem de transações. A barra inclui um botão "Ver gráfico ↑" que rola a página de volta ao topo absoluto (onde fica o cabeçalho "Análises" e a navegação de mês). A barra desaparece automaticamente quando a categoria selecionada volta a ficar visível na tela, ou quando a seleção é limpa (fechada).

Esse comportamento de drill-down + barra fixa é específico do Resumo mensal — não se aplica a outras análises, a menos que explicitamente estendido no futuro.

> Especificações de Formato, Stack técnica e Navegação (transversais ao produto, não específicas dessa feature) foram movidas para a seção [Arquitetura do produto](#arquitetura-do-produto).

### Histórico por categoria

Segunda análise da seção Análises, ao lado do Resumo mensal: gráfico de linhas mostrando a evolução do saldo líquido por categoria ao longo dos meses. Motivação: até aqui só existe uma visualização de um único mês por vez (Resumo mensal); esta análise mostra se um gasto está crescendo, diminuindo, ou teve um pico em algum mês específico.

- **Eixo X:** tempo — cada ponto é um mês (**Mês de referência**, mesmo critério usado no Resumo mensal e na tela de Transações), considerando todos os meses disponíveis nos dados.
- **Eixo Y:** valor — **saldo líquido** = soma das saídas − soma das entradas, mesmo cálculo já usado no Resumo mensal.
- **Estado default:** uma única linha, representando o saldo líquido total de todas as categorias, por mês.
- **Cálculo do total:** inclui também transações que ainda não foram categorizadas — elas representam gasto real, mesmo sem categoria definida. Exceção: transações categorizadas como "Transferência interna" são sempre excluídas do total agregado — é dinheiro mudando de "bolso" (Pix pessoa-a-pessoa entre o casal, transferências entre contas próprias), não gasto nem renda real. Isso não afeta a categoria em si: "Transferência interna" continua aparecendo normalmente no dropdown de seleção, sem tratamento especial (mesma fonte de dados do filtro de Categoria em Transações — ver abaixo), e se selecionada mostra seu próprio saldo líquido real por mês, como qualquer outra categoria — só o total agregado a ignora.
- **Seleção de categoria(s):** dropdown com checkboxes (multi-select) — não chips clicáveis, já que hoje existem 27 categorias (com tendência de crescer) e isso ficaria poluído. Cada categoria selecionada vira sua própria linha no gráfico, com cor distinta. O dropdown também inclui a opção "Sem categoria" (mesmo padrão já usado no filtro de Categoria da tela de Transações), permitindo visualizar a evolução do saldo líquido das transações ainda não categorizadas como sua própria linha.
- **Linha "Saldo líquido":** visibilidade depende do estado de seleção:
    - Sem categoria selecionada: exibe a linha "Saldo líquido" (agregada, de todas as categorias) com estilo principal.
    - Com 1+ categoria(s) selecionada(s): a linha "Saldo líquido" desaparece completamente (não fica em estilo secundário/referência) — motivo: sua ordem de grandeza costuma ser muito maior que a das categorias individuais, o que fazia as flutuações das categorias parecerem "flat" visualmente quando exibidas junto com ela.
    - Desmarcar todas as categorias volta a exibir automaticamente a linha "Saldo líquido", sem necessidade de ação explícita (ex: botão "limpar seleção").
- **Tooltip:** ao passar o mouse sobre um ponto do eixo X (mês), mostra o mês e o valor de cada linha visível naquele ponto (Saldo líquido + categorias selecionadas, ou só as categorias selecionadas quando a linha "Saldo líquido" estiver escondida).
- **Escala do eixo Y:** compartilhada entre todas as linhas visíveis, com auto-ajuste ao intervalo de valores exibido no momento (comportamento padrão do recharts). Como a linha "Saldo líquido" some quando há categoria(s) selecionada(s), o eixo se reajusta à faixa de valores das categorias exibidas — evitando que a escala fique "achatada" pela ordem de grandeza do agregado.
- **Fonte da lista de categorias no dropdown:** a mesma fonte de dados usada no filtro de Categoria da aba Transações, evitando listas duplicadas ou divergentes entre as duas telas.
- **Nomenclatura:** a linha agregada é rotulada como "Saldo líquido" (não "Total") na legenda e no tooltip, padronizando com o termo usado em Transações e no Resumo mensal.

**Por que linha simples, não empilhada (stacked) nem preenchida (area):**

- Um gráfico empilhado só faz sentido visualmente quando as partes selecionadas somam o total — funciona bem apenas se todas as categorias forem selecionadas ao mesmo tempo. Como é possível selecionar um subconjunto, empilhar sugeriria visualmente que a soma das categorias selecionadas bate com o total, o que nem sempre é verdade.
- Área preenchida com múltiplas categorias sobrepostas tem problema de oclusão visual — a categoria de maior valor tende a esconder as de menor valor, mesmo com transparência, principalmente a partir de 3 categorias selecionadas simultaneamente.
- Linha simples escala melhor visualmente para múltiplas séries exibidas ao mesmo tempo, sem esses problemas de leitura.

Usa recharts (`LineChart`), mesma biblioteca já usada no Resumo mensal — mantendo consistência de paleta de cores e suporte a dark mode.

### Ordenação e filtro na tela de Transações

Cada coluna da tabela (Data, Tipo, Instituição, Formato, Empresa, Categoria, Valor, Responsável) pode ser ordenada e/ou filtrada, mas **apenas uma ordenação e um filtro ficam ativos por vez** (nunca múltiplos filtros ou múltiplas ordenações simultâneos). Ordenação e filtro podem, no entanto, coexistir entre si (ex: filtrar por Categoria = Mercado **e** ordenar por Valor decrescente ao mesmo tempo).

- **Ordenação:** clicar no ícone de ordenação do header alterna a direção (crescente/decrescente); selecionar outra coluna substitui a ordenação anterior.
- **Filtro por coluna:**

| Coluna | Tipo de filtro |
| --- | --- |
| Categoria | Seleção única via dropdown (inclui opção "Sem categoria"). Passa a viver no header da tabela — antes ficava em outro local da tela |
| Instituição | Seleção única via dropdown (novo — não existe hoje) |
| Formato | Seleção única via dropdown (novo — não existe hoje) |
| Empresa | Seleção única via campo de busca com autocomplete (combobox) sobre a lista de Empresas já normalizadas |
| Tipo | Seleção única (Todos / Entrada / Saída) |
| Valor | Filtro por faixa (mínimo/máximo) |
| Data | Filtro por intervalo de dias, restrito ao mês/fatura já selecionado na tela (não permite escolher outro mês) |
| Descrição | Sem filtro, ordenação ou busca dedicados. O campo de busca de Empresa pesquisa apenas o campo Empresa (nome canônico já normalizado) — não varre o campo de Descrição bruta |
| Responsável | Seleção única via dropdown (mesmo padrão de Instituição e Formato) — valores fixos: "TK" e "Deby" |

- **Indicador visual:** coluna com ordenação ativa mostra seta única indicando a direção; coluna com filtro ativo mostra ícone de filtro preenchido/destacado. Um chip acima da tabela mostra o filtro ativo, com opção de removê-lo.
- **Troca de fatura:** ao navegar para outra fatura/mês, filtro e ordenação ativos são resetados — a tela sempre inicia "limpa" na fatura nova.

### Fontes de dados e regras de importação (adaptador por fonte)

O app suporta múltiplas fontes de fatura/extrato. Antes do upload, o usuário seleciona qual é a fonte do arquivo — essa escolha determina qual mapeamento de colunas abaixo será aplicado.

Cada tabela abaixo mostra, para cada **campo do app**, de onde ele vem no arquivo original ou qual regra é usada para preenchê-lo quando não existe uma coluna correspondente direta.

#### Linhas inválidas durante a importação

Quando uma linha do CSV importado não pode ser lida (data inválida, valor ilegível, etc.), ela é descartada e não gera transação. Na tela de revisão do upload, se houver linhas descartadas, um aviso aparece sempre visível (mesmo padrão de aviso colapsável usado no Resumo mensal) mostrando a contagem (ex: "⚠️ 3 linha(s) não puderam ser lidas"). Ao clicar, expande e lista cada linha descartada com: o conteúdo bruto da linha (ou o máximo recuperável dela) + o motivo específico do descarte (ex: "Data inválida: '32/13/2026'", "Valor não numérico: 'R$ abc'"), em vez do texto genérico atual.

#### Fonte 1: C6 (cartão de crédito)

Colunas do arquivo: `Data de Compra` · `Nome no Cartão` · `Final do Cartão` · `Categoria` · `Descrição` · `Parcela` · `Valor (em US$)` · `Cotação (em R$)` · `Valor (em R$)` — separador `;`

| Campo do app | Origem / regra |
| --- | --- |
| Data | ← coluna `Data de Compra` |
| Mês de referência | Inferido do nome do arquivo (o usuário garante que o mês/ano da fatura esteja identificável no nome, ex: "Fatura_2026-07-10.csv" → referência julho/2026) |
| Tipo | Regra: "saída" por padrão; se `Valor (em R$)` for negativo → "entrada" (ver regra de Estorno abaixo)
Antes disso, linhas que representam pagamento da própria fatura (ex: descrição contendo "Pag fatura boleto") são descartadas e não geram transação |
| Instituição | Fixo: "C6" (não vem do arquivo, vem da fonte escolhida) |
| Formato | Fixo: "Cartão de crédito" (não vem do arquivo) |
| Descrição (bruta) | ← coluna `Descrição` |
| Empresa | Normalizada a partir da Descrição bruta pelo motor de normalização (regra aprendida + sugestão por palavra-chave) |
| Parcela | ← coluna `Parcela` |
| Categoria | Recalculada pelo motor de categorização (regras aprendidas + palavra-chave); a coluna `Categoria` do arquivo é ignorada. Não há categoria fixa para estorno — o usuário categoriza como preferir (ex: criando uma categoria "Estorno" própria, se quiser) |
| Valor | ← coluna `Valor (em R$)` |
| *(ignorados)* | `Nome no Cartão`, `Final do Cartão`, `Valor (em US$)`, `Cotação (em R$)` — não usados no MVP |

#### Fonte 2: Nubank (cartão de crédito)

Colunas do arquivo: `date` · `title` · `amount` (valor com vírgula decimal, entre aspas) — separador `,`

| Campo do app | Origem / regra |
| --- | --- |
| Data | ← coluna `date` |
| Mês de referência | Inferido do nome do arquivo (mesmo mecanismo da Fonte 1) |
| Tipo | Regra: "saída" por padrão; se `amount` for negativo → "entrada" (ver regra de Estorno abaixo). Antes disso, linhas que representam pagamento da própria fatura (ex: título contendo "Pagamento recebido") são descartadas e não geram transação |
| Instituição | Fixo: "Nubank" |
| Formato | Fixo: "Cartão de crédito" |
| Descrição (bruta) | ← coluna `title` |
| Empresa | Normalizada a partir da Descrição bruta pelo motor de normalização (regra aprendida + sugestão por palavra-chave) |
| Parcela | Vazio por padrão (arquivo não tem essa coluna). Se uma compra parcelada aparecer no futuro, a informação provavelmente virá embutida no texto de `title` — vai exigir ajuste na lógica de extração nesse momento |
| Categoria | Recalculada pelo motor de categorização (arquivo não traz coluna de categoria). Não há categoria fixa para estorno — o usuário categoriza como preferir |
| Valor | ← coluna `amount` |

#### Fonte 3: Nubank (extrato conta corrente / Pix)

Colunas do arquivo: `Data` · `Valor` · `Identificador` · `Descrição` — separador `,`

| Campo do app | Origem / regra |
| --- | --- |
| Data | ← coluna `Data` |
| Mês de referência | Calculado a partir da Data, alinhado ao fechamento do C6 (dia 3): se dia da Data < 3, mesmo mês da Data; se dia ≥ 3 (incluindo o próprio dia 3), mês seguinte |
| Tipo | Regra: definido diretamente pelo sinal de `Valor` (negativo = "saída", positivo = "entrada"). Não se aplica a regra de Estorno aqui — o próprio dado já resolve
Antes disso, linhas que representam o pagamento de uma fatura de cartão feito a partir dessa conta (ex: Descrição contendo "Pagamento de fatura" ou "Pagamento de boleto efetuado - Banco C6 S.A.") são descartadas e não geram transação — evita contar como gasto algo que já foi registrado na própria fatura do cartão (Fontes 1 e 2) |
| Instituição | Fixo: "Nubank" |
| Formato | Regra: inferido do texto de `Descrição` (contém "Pix" → "pix"; contém "boleto" → "boleto"; contém "débito" → "cartão de débito"; caso contrário, "outro") |
| Descrição (bruta) | ← coluna `Descrição` |
| Empresa | Normalizada a partir da Descrição bruta pelo motor de normalização (regra aprendida + sugestão por palavra-chave) |
| Parcela | Sempre vazio (Pix/boleto não parcela) |
| Categoria | Recalculada pelo motor de categorização |
| Responsável | Inferido do **nome do arquivo**: se o nome contém "deby" (case-insensitive) → "Deby"; caso contrário → "TK" (valor padrão). Exemplo de nome de arquivo da Deby: `nubank_pix_deby_jun_2026`. Essa distinção só se aplica à Fonte 3 — ver regra geral de Responsável logo abaixo |
| Valor | ← coluna `Valor` (valor absoluto — o sinal já foi usado para definir o Tipo) |
| *(ignorado)* | `Identificador` — não usado no MVP |

#### Regra geral de Responsável (titular do extrato)

O campo **Responsável** identifica de quem é o extrato/fatura de origem daquela transação — importante porque tanto Thiago quanto a esposa (Deby) sobem seus próprios extratos de conta corrente/Pix para o app, e essa informação ajuda na categorização manual de Pix (ver regra de Pix pessoa física abaixo).

- **Fonte 3 (Nubank extrato/Pix):** Responsável é inferido do nome do arquivo, conforme regra na tabela da Fonte 3 acima (contém "deby" → "Deby"; caso contrário → "TK").
- **Fontes 1 e 2 (faturas de cartão de crédito):** Responsável é sempre fixo = "TK", já que hoje só existe um cartão de crédito da família, de titularidade do Thiago. Não há necessidade de inferência aqui.
- Valores possíveis hoje: "TK" e "Deby" (fixos, sem opção de campo livre). Não há seletor manual no fluxo de upload — o valor é sempre derivado automaticamente pelas regras acima.
- **Coluna na tela de Transações:** Responsável aparece como coluna, com ordenação e filtro de seleção única via dropdown, seguindo o mesmo padrão das demais colunas (Instituição, Formato) — ver seção "Ordenação e filtro na tela de Transações".
- **Tela de revisão do upload:** a tela de revisão compartilha a mesma estrutura de tabela da tela de Transações — Responsável aparece como coluna ali também, do mesmo jeito, servindo de apoio à categorização manual de Pix. Não há necessidade de ordenação adicional baseada em Responsável — a ordenação já existente (Pix pessoa física no topo) é suficiente.

#### Regra geral de estorno/reembolso

Aplica-se apenas às fontes 1 e 2 (faturas de cartão). Quando uma transação vem com valor negativo, ela é tratada como **Tipo = "entrada"**. Não existe uma categoria fixa/hard-coded para esse caso — a categoria continua sendo definida pelo motor normal de categorização (ou manualmente pelo usuário), da mesma forma que qualquer outra transação.

#### Regra de normalização: apps de delivery não devem se fundir com o estabelecimento presencial

Quando a descrição bruta de uma transação contém um prefixo de app de delivery/intermediário (ex: "IFD*", "UBER*", "RAPPI*"), o motor de normalização de Empresa não deve remover esse prefixo ao gerar o nome canônico. Isso é importante porque um mesmo estabelecimento pode gerar duas Empresas diferentes e legítimas:

- Cobrança direta no estabelecimento (presencial) → Empresa = nome do estabelecimento (ex: "Restaurante X")
- Cobrança via app de delivery → Empresa = nome do estabelecimento + indicação do app (ex: "Restaurante X (iFood)")

Se as duas formas fossem normalizadas para a mesma Empresa, a regra de Categoria aprendida se propagaria retroativamente entre elas (ex: categorizar um pedido de delivery como "Delivery" faria as idas presenciais ao mesmo restaurante também virarem "Delivery", e vice-versa) — o que não é o comportamento desejado, já que essas duas modalidades normalmente pertencem a categorias diferentes (ex: "Restaurante" vs. "Delivery").

#### Regra de categorização: Pix entre pessoas físicas nunca é automática

Pix trocados com outra pessoa física (ex: dividir plano de saúde com familiares, rateio de restaurante entre amigos) não seguem o motor normal de aprendizado de Categoria, mesmo que a Empresa já tenha sido nomeada antes para aquela mesma pessoa em uma transação anterior. Isso porque a descrição bruta desses Pix (nome da pessoa, CPF mascarado, banco, agência, conta) não muda dependendo do propósito da transação — a mesma pessoa pode mandar Pix por motivos completamente diferentes (plano de saúde em um mês, rateio de restaurante no outro), então a Descrição não é um proxy confiável para Categoria nesses casos, ao contrário de estabelecimentos/merchants.

**Como distinguir Pix pessoa física de Pix para empresa:** via regex, checando se a descrição bruta contém um CNPJ (formato `XX.XXX.XXX/XXXX-XX`, com ou sem pontuação — considerando variações de formatação bancária). Se contém CNPJ → é uma empresa, motor de aprendizado funciona normalmente. Se não contém CNPJ → trata como Pix pessoa física, cai na regra abaixo.

**Comportamento para Pix pessoa física (sem CNPJ):**

- Nunca aplica automaticamente uma Empresa/Categoria com base em regra aprendida, mesmo que exista uma regra salva para aquela pessoa a partir de uma transação anterior.
- Sempre exige que o usuário defina manualmente a Empresa (nomeada de forma a refletir o propósito da transação, ex: "Irmã X - Plano Saúde Mãe", "Ana - Restaurante") e a Categoria correspondente, transação a transação.
- Na tela de revisão do upload, essas transações (Pix sem CNPJ) aparecem ordenadas no topo da lista, antes das demais transações já categorizadas automaticamente — sem necessidade de agrupamento visual separado, só ordenação simples. Isso porque o usuário sempre revisa a lista transação a transação, e esses Pix são justamente os que sempre vão exigir atenção manual.

**Reembolsos/estornos entre pessoas (ex: adiantar uma conta de restaurante e ser reembolsado pelos amigos via Pix):** o Pix recebido como reembolso deve ser categorizado na mesma Categoria do gasto original (ex: Restaurante), não em uma categoria à parte. Como o Resumo Mensal já calcula saldo líquido por categoria (saídas − entradas), isso neutraliza automaticamente o gasto adiantado sem exigir lógica adicional de cálculo — só a categorização manual correta no momento da revisão.

#### Regra de categorização: Transferência interna é sempre excluída dos totais, e nunca é automática

A categoria "Transferência interna" marca dinheiro que muda de "bolso" sem ser gasto nem renda real: Pix pessoa-a-pessoa entre o casal (ex: transferir para o fundo comum) ou transferências entre contas próprias.

**Totalmente excluída de qualquer cálculo agregado:** uma transação nessa categoria não vira barra/linha no Resumo mensal nem no Histórico por categoria, não entra na soma total do mês nem no saldo líquido geral do mês (nem em Transações, nem no Resumo mensal), e não entraria em nenhum agregado por Tipo (Entrada/Saída) ou rollup por Instituição/Formato, caso venham a existir no futuro. Na prática, a transação fica invisível para qualquer soma ou média — mas continua aparecendo normalmente na aba Transações, com ordenação e filtro funcionando normalmente para ela (inclusive filtrar por Categoria = "Transferência interna"). Antes de receber essa categoria, uma transação se comporta como "Sem categoria" normalmente (conta para "Sem categoria" até a categorização manual acontecer).

**Categorização é sempre manual, transação a transação:** "Transferência interna" nunca participa do motor de aprendizado/propagação automática por Empresa, mesmo vindo repetidamente do mesmo remetente/Empresa (mesma exceção que já vale para Pix pessoa física, na regra acima). Isso vale nos dois sentidos — atribuir essa categoria nunca cria nem aplica uma regra aprendida a outras transações da mesma Empresa, e uma transação já marcada manualmente como "Transferência interna" nunca é sobrescrita por uma correção retroativa de categoria disparada por outra transação da mesma Empresa.

#### Criação de categoria nova

O seletor de categoria (na revisão do upload e na tela de Transações) inclui uma opção "+ Nova categoria" ao final da lista. Ao escolher essa opção, o usuário digita o nome da nova categoria, que passa a existir e ficar disponível em todos os seletores dali em diante.

# Avaliação da identificação de Empresa (eval)

## Objetivo

Medir, de forma repetível, quanto o motor de normalização acerta a Empresa ao importar um mês novo. Serve de linha de base antes de mudar a lógica (ex: sugestões por IA), permitindo comparar o antes e o depois.

**Por que Empresa, e não Categoria:** a Categoria é derivada da Empresa (regras aprendidas por Empresa). Um erro de Empresa é a causa raiz dos erros de categoria.

## Como funciona (simulação mês a mês)

Para cada Mês de referência X, em ordem cronológica, a partir do segundo mês com dados:

1. Reconstrói o conhecimento do motor usando **apenas** transações de meses anteriores a X (regras aprendidas + sugestões por palavra-chave)
2. Roda o motor de normalização sobre as descrições brutas do mês X
3. Compara a Empresa prevista com a Empresa final confirmada pelo usuário (o gabarito)

O gabarito são as Empresas já confirmadas ou corrigidas pelo usuário. Nenhuma rotulagem nova é necessária.

## Classificação de cada transação

| Resultado | Definição | Impacto |
| --- | --- | --- |
| ✅ Match correto | Empresa prevista = Empresa final, e ela já existia antes de X | Nenhum trabalho; categoria herdada |
| 🆕 Nova correta | Empresa final não existia antes de X, e o motor não a associou a nenhuma Empresa existente | Trabalho inevitável |
| ✂️ Separação indevida | Empresa final já existia antes de X, mas o motor não a reconheceu | Trabalho manual extra |
| 🔀 Fusão indevida | O motor associou a uma Empresa existente diferente da Empresa final | Erro silencioso: distorce totais |

**Fora da pontuação:** Pix pessoa física (sem CNPJ), cuja Empresa é sempre manual por regra. Aparece apenas como contagem separada.

## Métricas principais

% de match correto, % de fusão indevida (meta: o mais perto possível de zero), % de separação indevida e % de nova correta, por mês e no total.

## Saída

Comando executado via Claude Code (ex: `npm run eval:empresa`), sem tela no app:

- Tabela por mês + total
- Lista dos erros 🔀 e ✂️ com descrição bruta, Empresa prevista e Empresa esperada
- Resultado salvo em `data/evals/` (fora do Git) com a data da execução, para comparar execuções ao longo do tempo

## Regras

- Somente leitura: nunca altera transações, regras ou Empresas
- Determinístico: mesmos dados → mesmo resultado
- Dados permanecem locais (`data/`, fora do Git)

## Fora de escopo nesta versão

- Avaliação de Categoria
- Dashboard (tela no app ou artifact)
- Sugestões de Empresa por IA (próxima etapa, que será medida por este eval)

# Arquitetura do produto

Especificações transversais ao produto (não específicas de uma feature/análise em particular).

## Formato

Vamos fazer tudo isso num formato web app. Suporte a modo escuro (dark mode) — detalhes do toggle de tema estão na seção Navegação, já que ele vive no menu lateral

## Stack técnica

Next.js para front e JSON local para armazenamento das transações

## Navegação

O produto terá um menu lateral fixo com duas seções: **Transações** e **Análises**.

- **Transações**: lista de todas as transações já confirmadas, com as colunas Data, Tipo, Instituição, Formato, Empresa, Parcela, Valor, Categoria e Responsável.
- **Análises**: comporta múltiplas análises, sempre visíveis simultaneamente na hierarquia do menu — não há opção de recolher/expandir essa lista. As análises disponíveis hoje são: Resumo mensal (gráfico de barras por categoria) e Histórico por categoria (gráfico de linhas mostrando o saldo líquido por categoria ao longo dos meses, sempre incluindo também a linha do valor total do mês como referência).
    - **Destaque visual em dois níveis:** o item pai "Análises" fica com destaque ativo sempre que o usuário estiver em qualquer uma das análises (mesmo padrão que já existe hoje entre Transações e Análises). Dentro da lista, a análise específica sendo exibida no momento (Resumo mensal ou Histórico por categoria) também recebe destaque visual próprio, para indicar claramente qual das duas está ativa.

Um botão de upload de fatura fica sempre acessível, independente da seção onde o usuário está.

O menu lateral também tem um botão de alternância de tema (claro/escuro), aplicado em todas as telas do app (Transações, Análises e revisão de upload). Ele tem três estados — Sistema (segue automaticamente o tema do sistema operacional), Claro e Escuro —, começando em "Sistema" por padrão. Uma escolha manual (Claro ou Escuro) fica salva e passa a valer nas próximas visitas.

**Fluxo de upload:** (1) o usuário seleciona qual é a fonte do arquivo (ex: C6 (cartão de crédito), Nubank (cartão de crédito), Nubank (extrato conta corrente / Pix)) — isso define qual mapeamento de colunas será usado; (2) faz o upload do CSV; (3) passa pela tela de revisão/categorização (sugestões + edição manual); (4) confirma. As transações só aparecem na aba Transações depois dessa confirmação.

**Tela de Transações:** organizada por fatura (cada fatura/mês é uma página, navegável com setas). O agrupamento por página usa o **Mês de referência** para todas as fontes (1, 2 e 3) — não a Data/Data de Compra. Isso evita que parcelas de uma mesma compra, que têm a mesma Data de Compra mas aparecem em faturas diferentes, caiam todas na mesma página, e mantém as transações de extrato alinhadas ao mesmo período das faturas de cartão. Inclui ordenação e filtro por coluna — ver seção "Ordenação e filtro na tela de Transações" acima, que substitui o filtro simples de categoria/mês do MVP anterior. A categoria de qualquer transação também pode ser editada diretamente aqui (não só na tela de revisão do upload), com o mesmo comportamento retroativo (atualiza todas as transações passadas da mesma empresa).

No topo da página é exibido o **Saldo líquido do mês**: soma das saídas − soma das entradas de todas as transações daquele mês (mesmo cálculo do Resumo mensal), **independente do filtro selecionado** — ou seja, o valor reflete sempre o mês inteiro, mesmo que a tabela esteja filtrada.

# Stakeholders

Só eu vou usar isso, mas vou querer mostrar os resultados para minha esposa e discutirmos em cima das análises. Nesse primeiro momento, não precisamos nos preocupar com outra pessoa acessando isso.
