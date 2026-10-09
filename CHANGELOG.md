# Changelog

Versões no formato [SemVer](https://semver.org/lang/pt-BR/). Cada versão é uma release no GitHub (`vX.Y.Z`).

## v1.6.0 — 2026-10-09

- Importação de notas fiscais aceita a pasta inteira (arrastada ou pelo botão "escolha uma pasta"), inclusive com subpastas, como a exportação da UpSeller (`UpSeller Issue/Outbound Invoice/Sale`).
- Corrige o erro "The I/O read operation failed" ao arrastar milhares de XMLs soltos no Safari: os arquivos são lidos e enviados em lotes, com nova tentativa; o que não puder ser lido aparece num resumo, com a orientação de usar a pasta ou o .zip.
- Eventos de cancelamento de NF-e (`-event.xml`) marcam a nota como cancelada, mesmo que cheguem antes da nota; nota cancelada não vale para o pedido.
- Mensagens de importação resumidas (no máximo 3 erros e totais).

## v1.5.0 — 2026-10-09

- Importação de notas fiscais (XML da NF-e, soltos ou em .zip) na tela Importar dados. Cada nota se liga ao pedido pelo "Nº de Pedido" da UpSeller (`xPed`); notas de entrada e não autorizadas são ignoradas.
- Das notas ficam nome, CPF/CNPJ, cidade, UF, CEP, valor e chave (nova tabela `invoices`). Rua, número e bairro não saem do navegador.
- CPF/CNPJ identifica o cliente em todas as plataformas: recompra e valor por cliente juntam Shopee, TikTok, Mercado Livre etc.
- Nome da nota completa o gênero estimado nos pedidos da Shopee; cidade e UF da nota completam pedidos sem endereço.
- Aba Público: origem do CPF (região fiscal de emissão) × estado de entrega, mesmo cliente em várias plataformas, coluna CPF/CNPJ e busca por nome ou CPF nos melhores clientes.
- Backup passa a incluir as notas fiscais.

## v1.4.0 — 2026-10-09

- Painel abre mais rápido: uma única chamada (`/api/bootstrap`) traz pedidos, importações e nomes, em vez de quatro, e sem a checagem de login antes.
- Carga compacta: só os campos usados nos gráficos, com textos repetidos em dicionário (16 MB → ~3 MB antes da compressão).
- A carga fica pronta e comprimida na memória do servidor e só é refeita quando os dados mudam; sem mudança, o navegador recebe 304 e reaproveita a cópia que tem.
- JavaScript, CSS e bibliotecas com a versão no endereço, guardados no navegador até a próxima versão; a biblioteca de planilhas só carrega ao importar.

## v1.3.0 — 2026-10-09

- Perfil do público na aba Público: gênero estimado pelo primeiro nome (Censo 2010, IBGE) e tamanho da cidade (Censo 2022).
- Perfil por gênero: pedidos, faturamento, ticket, itens por pedido, recompra e cancelamento; produtos que mais atraem mulheres e homens; horário de compra por gênero; gênero por tamanho de cidade; % de mulheres por estado.
- Diagnóstico ganha leituras de gênero e de capital × interior.
- O servidor consulta o IBGE só com o primeiro nome e guarda o resultado (tabela `names`).

## v1.2.0 — 2026-10-09

- Pedidos que o comprador nunca pagou (cancelados sem hora de pagamento ou por falta de pagamento) agora ficam à parte: não contam como venda nem entram na taxa de cancelamento.
- Taxa de cancelamento passa a ser (cancelados depois de pagos + devolvidos) ÷ pedidos pagos. A aba Operação mostra os não pagos separados e agrupa os cancelamentos reais por causa (comprador desistiu, problema na entrega, vendedor, devolução).
- Removidos lucro, margem e custo de todo o painel, inclusive a aba Financeiro: sem custo cadastrado na UpSeller esses números eram fictícios.

## v1.1.0 — 2026-10-09

- Publicação no prod-01 no padrão da VPS: imagem no GHCR gerada por release, `deploy/compose.yml` na rede `edge` do Cloudflare Tunnel, sem portas abertas, e atualizador automático (`dash-update.timer`) com volta para a versão anterior se o healthcheck falhar.
- Login atrás do Cloudflare: o limite de tentativas usa o IP real do visitante (`CF-Connecting-IP`) e não pode mais ser contornado forjando `X-Forwarded-For`. Cookie de sessão sempre `Secure` em produção.
- Novo `/api/health` informa a versão no ar.
- Removidos Caddy, modelo de nginx e serviço systemd: a entrada agora é o Cloudflare Tunnel.

## v1.0.0 — 2026-10-09

- Servidor Node com login e SQLite, interface estilo Notion.
