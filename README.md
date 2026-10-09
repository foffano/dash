# Raio-X de Vendas

Painel de vendas para quem vende em marketplaces (Shopee, Mercado Livre, TikTok Shop etc.) e usa a **UpSeller**.
Você exporta os pedidos da UpSeller em planilha, envia pelo painel e ele monta os gráficos e o diagnóstico do negócio.

- Roda na sua VPS, com login e senha.
- Os dados ficam no servidor (SQLite) e aparecem em qualquer aparelho em que você entrar.
- A planilha é lida no navegador. Só os campos usados no painel vão para o servidor: telefone, endereço completo, CPF/CNPJ e dados de nota fiscal são descartados antes.
- Sem dependências nativas: Node.js 22 + 2 bibliotecas de frontend (Chart.js e SheetJS), servidas pelo próprio app.

## Instalar na VPS com Docker (recomendado)

Pré-requisitos: Docker com o plugin Compose e um domínio (ex.: `vendas.seudominio.com.br`) com registro DNS tipo A apontando para o IP da VPS.

```bash
git clone https://github.com/foffano/dash.git raiox && cd raiox
cp .env.example .env
nano .env            # defina APP_PASSWORD e DOMAIN
docker compose --profile https up -d --build
```

Pronto: acesse `https://SEU_DOMINIO`. O Caddy gera e renova o certificado HTTPS sozinho (as portas 80 e 443 precisam estar livres e liberadas no firewall).

**Já usa nginx ou outro proxy na VPS?** Suba só o app (`docker compose up -d --build`). Ele fica escutando em `127.0.0.1:3000`. Use `deploy/nginx.conf` como modelo e gere o certificado com `certbot --nginx`.

### Atualizar

```bash
git pull && docker compose --profile https up -d --build
```

### Backup

- Pelo painel: **Importar dados → Baixar backup** gera um `.json` com todos os pedidos. Para restaurar, envie o arquivo na mesma tela.
- Pelo servidor: o banco fica no volume Docker `raiox_data`.
  ```bash
  docker compose cp app:/data/raiox.db ./raiox-$(date +%F).db
  ```

## Instalar sem Docker

Requer Node.js 22.13 ou mais novo.

```bash
git clone https://github.com/foffano/dash.git /opt/raiox && cd /opt/raiox
npm install --omit=dev
cp .env.example .env && nano .env
sudo cp deploy/raiox.service /etc/systemd/system/   # ajuste User e caminhos
sudo systemctl enable --now raiox
```

Coloque um proxy com HTTPS na frente (Caddy ou `deploy/nginx.conf`).

Para testar no seu computador: `npm install` e depois `APP_PASSWORD=umasenhaqualquer npm start`, e abra `http://localhost:3000`.

## Configuração (.env)

| Variável | Padrão | Para que serve |
|---|---|---|
| `APP_USER` | `admin` | Usuário do login |
| `APP_PASSWORD` | obrigatória | Senha do login (mínimo 8 caracteres) |
| `DOMAIN` | | Domínio usado pelo Caddy para o HTTPS |
| `APP_PORT` | `3000` | Porta local do app na VPS |
| `SESSION_DAYS` | `30` | Quantos dias o login fica salvo |
| `COOKIE_SECURE` | automático | `true` força cookie só em HTTPS |
| `SESSION_SECRET` | gerado | Chave das sessões; se vazia, é criada em `data/.session-secret` |
| `DATA_DIR` | `./data` | Pasta do banco SQLite |

## Como usar

1. Na UpSeller, exporte os pedidos marcando as colunas listadas na tela **Importar dados**.
2. Arraste as planilhas (.xlsx, .xls ou .csv) para o painel. Pode importar quantas vezes quiser: pedidos repetidos são atualizados, não duplicados.
3. Use os filtros de período, plataforma e loja no topo.

Enquanto nada for importado, o painel mostra **dados de exemplo** fictícios.

## O que o painel mostra

| Página | Conteúdo |
|---|---|
| Visão geral | Faturamento, pedidos, ticket, lucro, margem, clientes e cancelamentos, comparados ao período anterior |
| Diagnóstico | Leituras automáticas: crescimento, dependência de canal, curva ABC, produtos com margem baixa, pedidos com prejuízo, cancelamentos, atrasos, recompra, geografia, horários de pico, efeito salário, tendências |
| Produtos | Curva ABC, ranking, margem e cancelamento por produto, comprados juntos, em alta e em queda |
| Público | Mapa por estado, penetração vs. população (IBGE 2022), regiões, cidades, clientes novos e recorrentes, frequência de compra, valor do pedido, melhores clientes |
| Quando compram | Mapa de calor dia × hora, dia da semana, hora, dia do mês |
| Financeiro | Do valor dos produtos ao lucro, rentabilidade por plataforma, margem mensal, pedidos com prejuízo |
| Operação | Situação dos pedidos, motivos de cancelamento, tempo até envio, envios no prazo, métodos de envio |

## Como os números são calculados

- **Pedido válido**: qualquer pedido que não esteja cancelado, devolvido ou aguardando pagamento.
- **Faturamento**: coluna "Valor do Pedido" (se ausente, "Valor Total de Produtos" ou preço × quantidade).
- **Lucro estimado**: coluna "Lucro Estimado" da UpSeller. Sem ela, o painel estima: produtos − descontos − comissão − frete pago pelo vendedor − custo.
- **Lucro por produto**: o lucro do pedido é dividido entre os itens proporcionalmente ao valor de cada um.
- **Cliente**: identificado por "ID do Comprador" (por plataforma) ou, na falta dele, nome + CEP.
- **Estado**: coluna "Estado" (sigla ou nome) ou, se vazia, deduzido pelo CEP.
- **KIT SKU**: as várias linhas de um kit são reunidas em um único item do pedido.

## Estrutura

```
server.js            servidor HTTP, login, API e banco SQLite
public/              interface (HTML, CSS e JavaScript)
Dockerfile           imagem do app
docker-compose.yml   app + Caddy (HTTPS)
deploy/              Caddyfile, modelo de nginx e serviço systemd
```
