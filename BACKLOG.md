# Observatório Público — backlog de cobertura

Este arquivo é a lista operacional do produto. “Concluído” significa que o conector funciona dentro do recorte declarado; nunca significa que a fonte pública é completa.

## Concluído

- [x] Busca e perfil das candidaturas de 2026 importadas do TSE.
- [x] Foto, situação, patrimônio, redes declaradas, certidões e processo de registro eleitoral.
- [x] Trajetória eleitoral anterior devolvida pelo DivulgaCand.
- [x] Relações formais de chapa: vice e suplência quando publicadas pelo TSE.
- [x] Câmara dos Deputados: identidade exata, legislaturas 48–57, histórico, projetos, discursos, despesas, comissões e amostra anual distribuída de votos nominais.
- [x] Senado atual: identidade exata, votos nominais, mandatos, cargos, comissões e filiações.
- [x] Presidência: vetos dos períodos presidenciais confirmados de Lula, com mensagem e tramitação.
- [x] Notícias de 2000 até o presente, separadas em Justiça, atuação, contratos, controvérsias e geral.
- [x] Consulta DataJud por número processual CNJ exato.
- [x] Livro judicial histórico revisado de Lula, preservando anulações, absolvições e estado atual.
- [x] Primeiro catálogo de parentesco público documentado: Lula, Janja e filhos; Carlos, Flávio, Jair e Eduardo Bolsonaro.
- [x] Dossiê jornalístico clicável para pessoa relacionada que tenha atuação pública documentada.
- [x] Rede unificada para todas as chapas de 2026: vice, suplentes e integrantes publicados pelo TSE abrem candidatura e dossiê próprios.
- [x] Entidades persistentes preparadas para pessoa, empresa e organização, com identificador oficial ou CNPJ confirmado.
- [x] Carregamento de notícias relacionadas sob demanda, sem bloquear a abertura da ficha.

## Prioridade zero — cobertura nacional

- [ ] Ex-senadores e votos de mandatos encerrados.
- [ ] Presidentes anteriores além do recorte atual e demais atos do Executivo: sanções, decretos, medidas provisórias, nomeações e agendas.
- [ ] TCU: acórdãos e contas julgadas com identidade e papel processual.
- [ ] Justiça Eleitoral, STF, STJ, TRFs e TJs: conectores por número e identificadores oficiais, sem busca nominal conclusiva.
- [ ] Diário Oficial da União: nomeações, exonerações, contratos e atos assinados.
- [ ] Câmara: ampliar a amostra para arquivo anual completo de votações nominais sem exceder os limites da API ao vivo.

## Prioridade alta — estados e municípios

- [ ] Câmara Municipal do Rio: mandatos, proposições, comissões, discursos e votações de Carlos Bolsonaro.
- [ ] ALERJ: mandatos, proposições, votações e despesas de ex-deputados estaduais.
- [ ] Assembleias legislativas das 27 unidades da Federação.
- [ ] Câmaras municipais, começando por capitais e pelos municípios dos candidatos mais consultados.
- [ ] Governadores e prefeitos: vetos, decretos, secretariado, contratos e prestações de contas.

## Prioridade alta — rede de relações

- [ ] Expandir parentesco público documentado para todos os agentes públicos relevantes.
- [ ] Assessores e empregados públicos por atos de nomeação e exoneração.
- [ ] Sócios e empresas por CNPJ e quadro societário público, com período do vínculo.
- [ ] Fornecedores de campanha e do mandato por CNPJ.
- [ ] Doadores, dirigentes partidários, vice, suplentes e coordenadores de campanha.
- [ ] Contratos no PNCP, Portal da Transparência e portais locais, sempre iniciando por CNPJ confirmado.
- [ ] Grafo navegável: pessoa → vínculo → pessoa/empresa → contrato/processo/notícia.
- [ ] Bloqueios de privacidade para menores, vítimas, endereços, documentos pessoais e familiares sem relevância pública.

## Prioridade alta — Justiça e investigação

- [ ] Livro histórico revisado para perfis além de Lula.
- [ ] Separar mencionado, testemunha, investigado, indiciado, denunciado, réu, condenado, absolvido e arquivado.
- [ ] Atualização de desfecho com a mesma visibilidade da acusação original.
- [ ] Ministério Público e polícia: somente atos oficialmente públicos e identificados.
- [ ] B.O.s: não existe base nacional nominal; aceitar apenas documento público pertinente, minimizado e revisado.
- [ ] Fila de revisão humana para homônimo, segredo de Justiça, prisão, cautelar e alegação criminal.

## Produto e operação

- [ ] Linha do tempo única combinando eleição, mandato, voto, veto, processo, contrato e notícia.
- [ ] Data de última coleta, cobertura e falha visíveis por fonte.
- [ ] Correção, contestação e registro de versões de cada evidência.
- [ ] Monitor de conectores e reprocessamento automático.
- [ ] Cache persistente para reduzir lentidão e indisponibilidade das fontes externas.
- [ ] Testes de identidade, atribuição, privacidade, acessibilidade e regressão visual.

## GitHub e hospedagem

- [x] Criar um repositório dedicado `observatorio-publico` na conta do proprietário.
- [x] Enviar o código validado para o novo repositório.
- [x] Adicionar CI para lint, testes e build em cada alteração.
- [x] Manter o backend dinâmico no Sites/Cloudflare: GitHub Pages não executa APIs, D1, SSR ou consultas DataJud/TSE.
- [x] Publicar uma entrada estática no Pages que preserva rota, busca e fragmento ao abrir o backend dinâmico.
- [x] Ativar Pages depois de CI e teste de link direto de candidatura.

## Regra de conclusão

O sistema não usará “nada encontrado” como sinônimo de “nada existe”. Toda tela deve mostrar fonte, recorte, data de consulta e limite conhecido.
