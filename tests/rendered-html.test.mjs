import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html", host: "localhost" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Observatório Público experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Observatório Público — informação verificável<\/title>/i);
  assert.match(html, /A vida pública/);
  assert.match(html, /documentada/);
  assert.match(html, /Quem você quer pesquisar/);
  assert.match(html, /Identidade, atuação, Justiça e notícias/);
  assert.match(html, /Base oficial TSE/);
  assert.match(html, /Pesquise uma candidatura/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("keeps evidence language and the TSE connector explicit", async () => {
  const [app, connector, route, justiceDomain, justiceRoute, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/observatorio-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/connectors/tse.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/sources/tse/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/domain/judicial-record.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/schema/justice/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(app, /Nomes, números e relações abaixo são fictícios/);
  assert.match(app, /Responsabilidade não é transferida/);
  assert.match(app, /Sem nota ou ranking/);
  assert.match(app, /B\.O\. não comprova que o fato ocorreu/);
  assert.match(app, /Desfecho favorável em destaque/);
  assert.match(app, /Investigado ≠ acusado/);
  assert.match(app, /Prisão cautelar ≠ pena/);
  assert.match(connector, /dadosabertos\.tse\.jus\.br\/api\/3\/action\/package_show/);
  assert.match(route, /getTseCandidates2026Status/);
  assert.match(justiceDomain, /canPublishJudicialRecord/);
  assert.match(justiceDomain, /minimumIdentityConfidence: 0\.95/);
  assert.match(justiceRoute, /PROCEDURAL_STATES/);
  assert.match(layout, /openGraph/);
  assert.match(layout, /twitter/);
  assert.match(packageJson, /"name": "observatorio-publico"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("wires the official 2026 candidate search to durable, minimized data", async () => {
  const [schema, searchRoute, profileRoute, filtersRoute, statusRoute, justiceRoute, processRoute, chamberRoute, senateRoute, executiveRoute, newsRoute, dataJudConnector, tseDivulga, justiceHistory, candidatePage, app, hosting, migration, enrichmentDetails, enrichmentAssetsA, enrichmentAssetsB, enrichmentSocial, relationsRoute, relatedPersonRoute, publicRelations, relationMigration] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/candidates/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/candidates/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/filters/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/status/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/justice/candidate/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/justice/process/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/legislative/camara/candidate/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/legislative/senado/candidate/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/executive/presidency/candidate/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/news/candidate/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/datajud-public.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/tse-divulga.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/public-justice-history.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/candidato/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/observatorio-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0000_spooky_star_brand.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0001_gifted_silk_fever.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0002_seed_assets_a_2026.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0003_seed_assets_b_2026.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0004_seed_social_2026.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/relations/candidate/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/relations/person/[slug]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/public-relations.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0006_public_relation_graph.sql", import.meta.url), "utf8"),
  ]);
  const enrichment = [enrichmentDetails, enrichmentAssetsA, enrichmentAssetsB, enrichmentSocial].join("\n");

  assert.match(hosting, /"d1": "DB"/);
  assert.match(schema, /sqliteTable\("candidates"/);
  assert.doesNotMatch(schema, /cpf|email|titulo_eleitoral|birth_date/i);
  assert.match(searchRoute, /getD1\(\)\.prepare/);
  assert.match(searchRoute, /\.bind\(/);
  assert.match(profileRoute, /source_record_id = \?/);
  assert.match(profileRoute, /safeExternalUrl/);
  assert.match(filtersRoute, /party_acronym/);
  assert.match(statusRoute, /source_snapshots/);
  assert.match(app, /20\.530 candidaturas detalhadas/);
  assert.match(app, /Comparador objetivo/);
  assert.match(app, /Declaração, não avaliação/);
  assert.match(app, /Cobertura não é certidão negativa/);
  assert.match(app, /Nenhum registro retornado para este número/);
  assert.match(app, /\/candidato\/\$\{candidate\.sourceRecordId\}/);
  assert.match(justiceRoute, /queryPublicDataJud/);
  assert.match(justiceRoute, /state: records\.length \? "found"/);
  assert.match(processRoute, /endpointFromCnjNumber/);
  assert.match(dataJudConnector, /api-publica\.datajud\.cnj\.jus\.br/);
  assert.match(dataJudConnector, /numeroProcesso/);
  assert.match(dataJudConnector, /COURT_CODES/);
  assert.match(dataJudConnector, /movementTotal/);
  assert.match(app, /Tem o número CNJ/);
  assert.match(app, /a busca não usa nomes/);
  assert.match(chamberRoute, /nome civil completo \+ UF/);
  assert.match(chamberRoute, /normalizePersonName\(detail\.nomeCivil\)/);
  assert.match(chamberRoute, /supplierDocument\.length === 14/);
  assert.match(chamberRoute, /loadVotes/);
  assert.match(chamberRoute, /requestedYear/);
  assert.match(chamberRoute, /deputados\/\$\{deputyId\}\/historico/);
  assert.match(chamberRoute, /scope.*identity/);
  assert.doesNotMatch(chamberRoute, /cpf:/i);
  assert.match(app, /Mandato federal não vinculado/);
  assert.match(app, /Nomes parecidos não bastam/);
  assert.match(app, /Produção legislativa/);
  assert.match(app, /Cota parlamentar/);
  assert.match(app, /Notícia é pista, não prova/);
  assert.match(app, /Fornecedor não é empresa do político/);
  assert.match(app, /Inquéritos e ações históricas/);
  assert.match(app, /O histórico não reescreve o estado atual/);
  assert.match(justiceRoute, /getPublicJusticeHistory/);
  assert.match(justiceHistory, /5046512-94\.2016\.4\.04\.7000/);
  assert.match(justiceHistory, /Condenação anulada — sem efeito jurídico/);
  assert.match(justiceHistory, /Absolvido — decisão definitiva/);
  assert.match(tseDivulga, /formalRelations/);
  assert.match(tseDivulga, /previousElections/);
  assert.match(app, /Trajetória eleitoral oficial/);
  assert.match(senateRoute, /\/votacao\?codigoParlamentar=/);
  assert.match(senateRoute, /nome civil completo \+ UF/);
  assert.match(executiveRoute, /materia\/vetos\/\$\{year\}/);
  assert.match(executiveRoute, /não comprova assinatura pessoal/);
  assert.match(app, /Como votou no Senado/);
  assert.match(app, /Vetos presidenciais durante os mandatos/);
  assert.match(app, /Repercussão e controvérsias/);
  assert.match(app, /Relações políticas formais/);
  assert.match(app, /Vínculos públicos documentados/);
  assert.match(app, /Vínculo não transfere responsabilidade/);
  assert.match(relationsRoute, /getPublicRelations/);
  assert.match(relatedPersonRoute, /Notícia é pista, não prova/);
  assert.match(publicRelations, /rosangela-lula-da-silva/);
  assert.match(publicRelations, /carlos-nantes-bolsonaro/);
  assert.match(schema, /sqliteTable\("public_relations"/);
  assert.match(relationMigration, /CREATE TABLE `relation_evidence`/);
  assert.match(app, /Certidões criminais publicadas pelo TSE/);
  assert.match(app, /Movimentações públicas/);
  assert.match(app, /Identidade confirmada\. Carregando o histórico detalhado/);
  assert.match(app, /Foto oficial de/);
  assert.match(tseDivulga, /fotoUrlPublicavel/);
  assert.match(tseDivulga, /candidatos\/\$\{candidate\.sourceRecordId\}/);
  assert.match(tseDivulga, /arquivo\/doc/);
  assert.doesNotMatch(tseDivulga, /cpf|tituloEleitor|dataDeNascimento/);
  assert.match(newsRoute, /after:\$\{year\}-01-01/);
  assert.match(newsRoute, /nome_completo/);
  assert.match(newsRoute, /sem cópia do conteúdo das matérias/);
  assert.doesNotMatch(newsRoute, /description:/i);
  assert.match(candidatePage, /alternates: \{ canonical:/);
  assert.match(candidatePage, /tseCandidatePhotoUrl/);
  assert.match(candidatePage, /images: \[\{ url: photoUrl/);
  assert.match(app, /CPF, título eleitoral, e-mail e data completa de nascimento não foram importados/);
  assert.match(migration, /TSE-SEED-2026/);
  assert.match(migration, /20530\);/);
  assert.match(enrichment, /TSE-ENRICHMENT-2026/);
  assert.match(enrichment, /tse-bens-candidatos-2026/);
  assert.match(enrichment, /75253\);/);
  assert.match(enrichment, /48127\);/);
});

test("scales verified relations without inferring identity", async () => {
  const [relationsRoute, dossierRoute, relationStore, publicRelations, schema, migration, app] = await Promise.all([
    readFile(new URL("../app/api/relations/candidate/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/relations/person/[slug]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/relation-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/public-relations.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0007_public_entity_identifiers.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/observatorio-app.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(relationsRoute, /fetchTseCandidateDossier/);
  assert.match(relationsRoute, /getFormalCandidateRelations/);
  assert.match(publicRelations, /candidate-\$\{item\.candidateId\}/);
  assert.match(dossierRoute, /candidate-\(\\d\{6,18\}\)/);
  assert.match(dossierRoute, /getStoredPublicEntityBySlug/);
  assert.match(relationStore, /official_identifier/);
  assert.match(schema, /public_entities_official_identifier_idx/);
  assert.match(migration, /ALTER TABLE `public_entities` ADD `official_identifier`/);
  assert.match(app, /As notícias e o dossiê só são carregados depois do clique/);
  assert.match(app, /Nenhuma relação é criada por sobrenome/);
});
