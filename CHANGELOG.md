# Changelog

Versões no formato [SemVer](https://semver.org/lang/pt-BR/). Cada versão é uma release no GitHub (`vX.Y.Z`).

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
