# Raio-X de Vendas

Painel de vendas para quem vende em marketplaces (Shopee, Mercado Livre, TikTok Shop etc.) e usa a **UpSeller**.
Você exporta os pedidos da UpSeller em planilha, envia pelo painel e ele monta os gráficos e o diagnóstico do negócio.

- Roda na VPS (prod-01) em Docker, publicado só pelo Cloudflare Tunnel em `https://dash.toffa.com.br`, com login e senha.
- Os dados ficam no servidor (SQLite) e aparecem em qualquer aparelho em que você entrar.
- Planilhas e notas fiscais são lidas no navegador. Só os campos usados no painel vão para o servidor: telefone e endereço (rua, número, bairro) são descartados antes. Das notas fiscais (XML da NF-e) ficam nome, CPF/CNPJ, cidade, estado, CEP, valor, chave e nº do pedido.
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
| Visão geral | Faturamento, pedidos, ticket, unidades, clientes e taxa de cancelamento, comparados ao período anterior |
| Diagnóstico | Leituras automáticas: crescimento, dependência de canal, curva ABC, cancelamentos, pedidos não pagos, atrasos, recompra, geografia, horários de pico, efeito salário, tendências |
| Produtos | Curva ABC, ranking, cancelamento por produto, comprados juntos, em alta e em queda |
| Público | Gênero estimado pelo nome, tamanho da cidade, perfil por gênero (ticket, recompra, cancelamento, horários, produtos), mapa por estado, penetração vs. população (IBGE 2022), regiões, cidades, clientes novos e recorrentes, frequência de compra, valor do pedido, melhores clientes |
| Quando compram | Mapa de calor dia × hora, dia da semana, hora, dia do mês |
| Operação | Situação dos pedidos, pedidos não pagos à parte, causas e motivos de cancelamento, tempo até envio, envios no prazo, métodos de envio |

## Como os números são calculados

- **Pedido válido**: qualquer pedido que não esteja cancelado, devolvido ou sem pagamento.
- **Não pago**: pedido que o comprador nunca pagou. Pode estar "Não Pago" ou cancelado sem "Hora do Pagamento" (ex.: "Pagamento atrasado por parte do cliente", "Unpaid Order", ou o comprador desistiu antes de pagar). Não conta como venda nem como cancelamento.
- **Taxa de cancelamento**: (cancelados depois de pagos + devolvidos) ÷ pedidos pagos. Os cancelamentos pagos são agrupados por causa: comprador desistiu, problema na entrega, vendedor (estoque, endereço), devolução ou outro.
- **Faturamento**: coluna "Valor do Pedido" (se ausente, "Valor Total de Produtos" ou preço × quantidade).
- **Gênero**: estimado pelo primeiro nome do comprador, com a contagem de pessoas por nome e sexo do Censo 2010 (API de nomes do IBGE). É feminino ou masculino quando 90% ou mais das pessoas com aquele nome são de um sexo; o resto fica "não identificado", assim como pedidos sem nome (Shopee), com apelido de usuário ou nome mascarado. Só o primeiro nome é enviado ao IBGE, pelo servidor, e o resultado fica guardado na tabela `names` do banco.
- **Notas fiscais**: importe os XMLs da NF-e (soltos ou num .zip) na tela **Importar dados**. Cada nota se liga ao pedido pelo "Nº de Pedido" da UpSeller (campo `xPed`). Notas de entrada e não autorizadas são ignoradas. Se o pedido tiver mais de uma nota, vale a mais recente.
- **Cliente**: com nota fiscal, o CPF/CNPJ identifica o cliente em todas as plataformas (recompra, valor por cliente e "mesmo cliente em várias plataformas" passam a juntar Shopee, TikTok, Mercado Livre etc.). Sem nota, vale o ID do comprador da plataforma.
- **Nome e gênero**: o nome da nota tem prioridade sobre o da plataforma; é o que permite estimar o gênero nos pedidos da Shopee, que vêm sem nome.
- **Origem do CPF**: o 9º dígito do CPF indica a região fiscal onde ele foi emitido; o painel compara com o estado de entrega.
- **Tamanho da cidade**: população do município no Censo 2022 (`public/municipios.json`, gerado por `scripts/gerar-municipios.py`).
- **Lucro e margem**: não aparecem. A UpSeller não tem o custo dos produtos cadastrado, então qualquer lucro seria inventado.
- **Cliente sem nota fiscal**: identificado por "ID do Comprador" (por plataforma) ou, na falta dele, nome + CEP.
- **Estado**: coluna "Estado" (sigla ou nome) ou, se vazia, deduzido pelo CEP.
- **KIT SKU**: as várias linhas de um kit são reunidas em um único item do pedido.

## Banco de dados e carregamento

O banco é um arquivo SQLite (`/srv/apps/dash/data/raiox.db`) com quatro tabelas:

| Tabela | Conteúdo |
|---|---|
| `orders` | Um registro por pedido: `key` (nº do pedido), `t` (data, indexada), `data` (o pedido completo em JSON, com itens) e `updated_at`. Importar de novo o mesmo pedido atualiza o registro. |
| `imports` | Histórico de importações (arquivo, data, linhas, novos, atualizados, período). |
| `invoices` | Notas fiscais de venda (NF-e): chave, nº do pedido da UpSeller (`xPed`), data, CPF/CNPJ, nome, cidade, UF, CEP e valor. Ligadas ao pedido pelo nº do pedido na hora de montar a carga do painel. |
| `names` | Cache do IBGE: primeiro nome → quantas mulheres e homens têm esse nome. Cada nome é consultado uma vez só. |

Ao abrir o painel, o navegador faz uma única chamada, `/api/bootstrap`, que traz pedidos, importações e nomes. O servidor monta essa resposta só com os campos usados nos gráficos, em formato compacto (texto repetido vira referência a um dicionário), e a guarda pronta e comprimida na memória. Ela é refeita só quando os dados mudam (importação, apagar dados, nomes novos do IBGE). Se nada mudou desde o último acesso, o servidor responde 304 e o navegador usa a cópia que já tem. JavaScript, CSS e gráficos têm a versão no endereço (`app.js?v=v1.4.0`) e ficam guardados no navegador até a próxima versão. A biblioteca de planilhas só é baixada na hora de importar.

## Estrutura

```
server.js            servidor HTTP, login, API, banco SQLite e carga compacta do painel
public/              interface (HTML, CSS e JavaScript)
Dockerfile           imagem do app
scripts/             gerar-municipios.py (população dos municípios, IBGE)
deploy/              compose de produção, atualizador e timer do systemd, modelo do app.env
.github/workflows/   release: gera a imagem no GHCR
CHANGELOG.md         o que mudou em cada versão
```
