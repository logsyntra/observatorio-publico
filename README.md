# Observatório Público

Aplicação de consulta apartidária a informações públicas e verificáveis sobre candidaturas e agentes públicos brasileiros.

## Fonte real ativa

- TSE — Consulta de candidaturas das Eleições 2026
- 20.530 candidaturas e registros complementares
- 75.253 bens declarados e 48.127 endereços de redes sociais
- busca por nome completo, nome social e nome de urna, com filtros de UF, cargo e partido
- perfis com julgamento eleitoral, processo de registro, limite de campanha, patrimônio detalhado e redes declaradas
- favoritos locais, comparação de até três candidaturas, compartilhamento, impressão e exportação JSON

CPF, título eleitoral, e-mail e data completa de nascimento não são importados para a busca. Dados demonstrativos nunca são combinados com pessoas reais.

## Desenvolvimento local

Requer Node.js `>=22.13.0`.

```bash
npm install
npm run db:local
npm run dev
```

Comandos úteis:

- `npm run db:generate`: gera uma migração Drizzle após mudanças no esquema.
- `npm run db:local`: aplica migrações no D1 local.
- `npm test`: compila e executa os testes de renderização e integridade.
- `npm run build`: gera a aplicação de produção.

O banco persistente é Cloudflare D1, declarado como binding `DB` em `.openai/hosting.json`. As consultas da aplicação usam parâmetros preparados.

## Princípios editoriais

- todo fato precisa de fonte, data e estado atual;
- alegação, investigação, acusação e condenação são estados diferentes;
- família, equipe, amizades e empresas só aparecem com relevância pública e evidência própria;
- lacuna de cobertura nunca é apresentada como ausência de registros;
- não há nota, ranking ou recomendação de voto.
