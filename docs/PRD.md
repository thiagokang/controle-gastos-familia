# Objetivo

Ter controle dos gastos familiares, podendo analisar por categorias e tipos, para manter uma boa saúde financeira

# Why

Com a chegada do segundo filho, precisamos ser mais disciplinados sobre como os nossos gastos se comparam com o nosso salário para poder se antecipar a grandes gastos no futuro (ex: educação, saúde, viagens, etc).

# What

Considerar todas as nossas transações (entrada e saída) de diferentes canais (pix, cartão de crédito, cartão de débito) e de diferentes instituições (bancos, vales,etc). Por enquanto, não precisamos considerar a receita já que ela é estável (remuneração).

# How

## MVP
### Registro de gasto e categorização

Nesse MVP, a idéia é que eu consiga subir a fatura para coletar esses dados mais facilmente, para começar a registrar os gastos com os seguintes dados:

- Data: seria a data da transação
- Tipo: Entrada ou saída de dinheiro
- Instituição: Por onde foi feita a transação (ex: Nubank, C6)
- Formato: De qual forma foi feita a transação (ex: pix, cartão de crédito)
- Empresa: De onde ou para onde foi o dinheiro
- Parcela: Indicar se é uma compra parcelada ou não
    - Obs: No MVP, não precisamos conectar as compras parceladas entre si
- Categoria: Qual a origem do gasto (Ex: alimentação, educação, saúde, lazer, transporte, etc)
    - Identificar a qual categoria determinada transação pertence vai ser um trabalho gradual onde a cada fatura que subo eu devo categorizar o que ainda não se sabe. Uma vez categorizado, essa informação deve ser salva num lugar para que seja reaproveitada na interpretação de uma outra fatura. Vale também considerar a possibilidade que eu vou errar de categoria e vou querer corrigir depois, sendo que essa correção deve valer de forma retroativa
    - Para reduzir meu trabalho, se for possível de se já trazer sugestões a partir de algumas palavras-chave (ex: “Uber” → “transporte”), pode trazer a sugestão
- Valor: O valor gasto
    - Obs: no caso de uma compra parcelada, seria o valor de uma única parcela

### Resumo mensal

Vamos começar com um resumo dos gastos feitos naquele mês, onde cada categoria deve ser representada por uma barra e o gráfico deve ser ordenado de forma decrescente.

### Formato

Vamos fazer tudo isso num formato web app

## Stakeholders

Só eu vou usar isso, mas vou querer mostrar os resultados para minha esposa e discutirmos em cima das análises. Nesse primeiro momento, não precisamos nos preocupar com outra pessoa acessando isso.