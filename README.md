# Raio-X de Vendas

Painel interativo de vendas para quem vende em marketplaces (Shopee, Mercado Livre, TikTok Shop etc.) e usa a **UpSeller**.
Você exporta os pedidos da UpSeller em planilha, arrasta o arquivo para o painel e ele monta os gráficos e o diagnóstico do negócio.

Tudo roda no navegador: as planilhas não são enviadas para nenhum servidor, e os pedidos ficam guardados no próprio navegador (IndexedDB).

## Como usar

1. Abra `index.html` no navegador (dois cliques no arquivo já funciona; precisa de internet para carregar as bibliotecas).
2. Na UpSeller, exporte os pedidos marcando as colunas listadas na aba **Dados** do painel.
3. Arraste as planilhas (.xlsx, .xls ou .csv) para a aba **Dados**. Pode importar várias vezes: pedidos repetidos são atualizados, não duplicados.
4. Use os filtros de período, plataforma e loja no topo.

Enquanto nenhuma planilha for importada, o painel mostra **dados de exemplo** fictícios.

## O que o painel mostra

| Aba | Conteúdo |
|---|---|
| Visão geral | Faturamento, pedidos, ticket, lucro, margem, clientes, cancelamentos, com comparação ao período anterior |
| Diagnóstico | Leituras automáticas: crescimento, dependência de canal, curva ABC, produtos com margem baixa, pedidos com prejuízo, cancelamentos, atrasos, recompra, geografia, horários de pico, efeito salário, tendências |
| Produtos | Curva ABC, ranking, margem e cancelamento por produto, produtos comprados juntos, em alta e em queda |
| Público | Mapa por estado, penetração vs. população (IBGE 2022), regiões, cidades, clientes novos e recorrentes, frequência de compra, faixa de valor, melhores clientes |
| Quando compram | Mapa de calor dia × hora, dia da semana, hora, dia do mês |
| Financeiro | Do valor dos produtos ao lucro (descontos, comissões, frete, custo), rentabilidade por plataforma, margem mensal, pedidos com prejuízo |
| Operação | Situação dos pedidos, motivos de cancelamento, tempo até envio, envios no prazo, métodos de envio |
| Dados | Importação, histórico de importações, backup em .json e limpeza |

## Como os números são calculados

- **Pedido válido**: qualquer pedido que não esteja cancelado, devolvido ou aguardando pagamento.
- **Faturamento**: coluna "Valor do Pedido" (se ausente, "Valor Total de Produtos" ou preço × quantidade).
- **Lucro estimado**: coluna "Lucro Estimado" da UpSeller. Sem ela, o painel estima: produtos − descontos − comissão − frete pago pelo vendedor − custo.
- **Lucro por produto**: o lucro do pedido é dividido entre os itens proporcionalmente ao valor de cada um.
- **Cliente**: identificado por "ID do Comprador" (por plataforma) ou, na falta dele, nome + CEP.
- **Estado**: coluna "Estado" (sigla ou nome) ou, se vazia, deduzido pelo CEP.
- **KIT SKU**: as várias linhas de um kit são reunidas em um único item do pedido.

Telefone, endereço completo, CPF/CNPJ e dados de nota fiscal não são lidos nem guardados.
