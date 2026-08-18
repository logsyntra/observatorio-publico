# Publicação no GitHub Pages

O Observatório Público possui rotas de API, renderização no servidor, consultas a fontes externas e banco D1. O GitHub Pages publica apenas arquivos estáticos e, por isso, não pode substituir o backend atual.

## Arquitetura de publicação

1. O repositório GitHub guarda todo o código e executa lint, testes e build.
2. O backend continua em Cloudflare/Sites, onde existem API, D1 e execução no servidor.
3. Um frontend estático separado pode ser publicado no GitHub Pages.
4. Esse frontend deve usar uma URL pública configurável para o backend.
5. O backend deve liberar CORS apenas para a origem exata do GitHub Pages.
6. A página só será ativada depois de busca, perfil, notícias, relações e consulta por número CNJ passarem em testes cruzados.

Publicar o build atual diretamente no Pages produziria uma tela sem backend. Esse atalho não será usado.
