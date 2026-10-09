# Raio-X de Vendas

Painel de vendas para quem vende em marketplaces (Shopee, Mercado Livre, TikTok Shop etc.) e usa a **UpSeller**.
Você exporta os pedidos da UpSeller em planilha, envia pelo painel e ele monta os gráficos e o diagnóstico do negócio.

- Roda na VPS (prod-01) em Docker, publicado só pelo Cloudflare Tunnel em `https://dash.toffa.com.br`, com login e senha.
- Os dados ficam no servidor (SQLite) e aparecem em qualquer aparelho em que você entrar.
- A planilha é lida no navegador. Só os campos usados no painel vão para o servidor: telefone, endereço completo, CPF/CNPJ e dados de nota fiscal são descartados antes.
- Sem dependências nativas: Node.js 22 + 2 bibliotecas de frontend (Chart.js e SheetJS), servidas pelo próprio app.

## Rodar no seu computador

Requer Node.js 22.13 ou mais novo.

```bash
npm install
APP_PASSWORD=umasenhaqualquer npm start
```

Abra `http://localhost:3000` e entre com `admin` e a senha acima.

## Produção (prod-01)

Segue o padrão de `/srv/infra` na VPS: sem `ports:`, entrada só pelo `cloudflared` na rede Docker `edge`, versão nova por release do GitHub e volta automática para a anterior se o healthcheck falhar.

| O quê | Onde |
|---|---|
| App | `/srv/apps/dash` (`compose.yml`, `.env` com a versão no ar, `app.env` com os segredos, `data/` com o banco) |
| Imagem | `ghcr.io/foffano/dash:<versão>` |
| Rota no Cloudflare | Tunnels → prod-01 → Public hostnames: `dash.toffa.com.br` → `http://dash:3000` |
| Atualizador | `dash-update.timer` (a cada 5 minutos) → `/srv/infra/scripts/dash-update.py` → `deploy.sh` |

### Lançar uma versão

1. Atualize `version` no `package.json` e anote a mudança no `CHANGELOG.md`.
2. Faça o commit e o push, e publique a release:
   ```bash
   gh release create v1.2.0 --generate-notes
   ```
3. O GitHub Actions gera a imagem no GHCR. Em até 5 minutos a VPS instala a versão nova.

Use versões no formato `vX.Y.Z` ([SemVer](https://semver.org/lang/pt-BR/)). A versão no ar aparece em `/api/health`.

### Operação

```bash
cd /srv/apps/dash
docker compose -p dash ps                      # estado
docker compose -p dash logs -f --tail 100      # logs
column -t -s $'\t' deploys.log                 # histórico de deploys
/srv/infra/scripts/rollback.sh dash            # volta para a versão anterior
sudo /srv/infra/scripts/dash-update.py --tag v1.1.0   # força uma versão
systemctl status dash-update.service           # última checagem do atualizador
sudoedit app.env && docker compose -p dash up -d      # trocar usuário ou senha
```

### Backup

- Pelo painel: **Importar dados → Baixar backup** gera um `.json` com todos os pedidos. Para restaurar, envie o arquivo na mesma tela.
- Pelo servidor: o banco é `/srv/apps/dash/data/raiox.db`.

### Instalação inicial (já feita)

```bash
sudo install -d -o deploy -g deploy -m 2775 /srv/apps/dash
sudo install -d -o 1000 -g 1000 -m 700 /srv/apps/dash/data
sudo install -m 660 -o deploy -g deploy /dev/null /srv/apps/dash/app.env   # preencher com deploy/app.env.example
sudo install -m 755 deploy/dash-update.py /srv/infra/scripts/
sudo install -m 644 deploy/dash-update.service deploy/dash-update.timer /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now dash-update.timer
```

## Configuração (app.env)

| Variável | Padrão | Para que serve |
|---|---|---|
| `APP_USER` | `admin` | Usuário do login |
| `APP_PASSWORD` | obrigatória | Senha do login (mínimo 8 caracteres) |
| `SESSION_DAYS` | `30` | Quantos dias o login fica salvo |
| `SESSION_SECRET` | gerado | Chave das sessões; se vazia, é criada em `data/.session-secret` |

`COOKIE_SECURE`, `DATA_DIR`, `HOST` e `PORT` já vêm definidos no `deploy/compose.yml`.

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
deploy/              compose de produção, atualizador e timer do systemd, modelo do app.env
.github/workflows/   release: gera a imagem no GHCR
CHANGELOG.md         o que mudou em cada versão
```
