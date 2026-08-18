import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

const [detailsPath, assetsPath, socialPath, migrationPath] = process.argv.slice(2);
if (!detailsPath || !assetsPath || !socialPath || !migrationPath) {
  throw new Error("Uso: node scripts/build-tse-enrichment-seed.mjs <complementar.csv> <bens.csv> <redes.csv> <migration.sql>");
}

function parseDelimited(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ";") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else field += character;
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

async function loadCsv(path) {
  const decoded = new TextDecoder("windows-1252").decode(await readFile(path));
  const [headers, ...rows] = parseDelimited(decoded);
  const positions = Object.fromEntries(headers.map((header, index) => [header, index]));
  return { rows, get: (row, column) => row[positions[column]] ?? "" };
}

function clean(value, fallback = "Não informado") {
  return !value || value === "#NULO" || value === "#NE" || value === "-1" ? fallback : value.trim();
}

function yesNo(value) {
  if (value === "S") return "Sim";
  if (value === "N") return "Não";
  return "Não informado";
}

function moneyToCents(value) {
  if (!value || value === "-1" || value === "#NULO" || value === "#NE") return null;
  const normalized = value.includes(",") ? value.replaceAll(".", "").replace(",", ".") : value;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function sql(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "0";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function statementsFor(table, columns, records) {
  const prefix = `INSERT INTO ${table} (${columns.join(",")}) VALUES\n`;
  const statements = [];
  let rows = [];
  let size = Buffer.byteLength(prefix);
  for (const record of records) {
    const row = `(${record.map(sql).join(",")})`;
    const rowSize = Buffer.byteLength(row) + 2;
    if (rows.length && size + rowSize > 80_000) {
      statements.push(`${prefix}${rows.join(",\n")};`);
      rows = [];
      size = Buffer.byteLength(prefix);
    }
    rows.push(row);
    size += rowSize;
  }
  if (rows.length) statements.push(`${prefix}${rows.join(",\n")};`);
  return statements;
}

const detailsCsv = await loadCsv(detailsPath);
const validCandidateIds = new Set(detailsCsv.rows.map((row) => detailsCsv.get(row, "SQ_CANDIDATO")));

const assetsCsv = await loadCsv(assetsPath);
const assets = [];
const assetSummary = new Map();
for (const row of assetsCsv.rows) {
  const candidateId = assetsCsv.get(row, "SQ_CANDIDATO");
  if (!validCandidateIds.has(candidateId)) continue;
  const itemOrder = Number(assetsCsv.get(row, "NR_ORDEM_BEM_CANDIDATO"));
  const valueCents = moneyToCents(assetsCsv.get(row, "VR_BEM_CANDIDATO")) ?? 0;
  assets.push([
    `${candidateId}:${itemOrder}`,
    candidateId,
    itemOrder,
    clean(assetsCsv.get(row, "DS_TIPO_BEM_CANDIDATO")),
    clean(assetsCsv.get(row, "DS_BEM_CANDIDATO")),
    valueCents,
    `${assetsCsv.get(row, "DT_ULT_ATUAL_BEM_CANDIDATO")} ${assetsCsv.get(row, "HH_ULT_ATUAL_BEM_CANDIDATO")}`,
  ]);
  const summary = assetSummary.get(candidateId) ?? { count: 0, total: 0 };
  summary.count += 1;
  summary.total += valueCents;
  assetSummary.set(candidateId, summary);
}

const socialCsv = await loadCsv(socialPath);
const socialLinks = [];
const socialCount = new Map();
for (const row of socialCsv.rows) {
  const candidateId = socialCsv.get(row, "SQ_CANDIDATO");
  if (!validCandidateIds.has(candidateId)) continue;
  const itemOrder = Number(socialCsv.get(row, "NR_ORDEM_REDE_SOCIAL"));
  const rawUrl = clean(socialCsv.get(row, "DS_URL"));
  let platform = "Outro endereço";
  const lower = rawUrl.toLowerCase();
  if (lower.includes("instagram")) platform = "Instagram";
  else if (lower.includes("facebook")) platform = "Facebook";
  else if (lower.includes("youtube") || lower.includes("youtu.be")) platform = "YouTube";
  else if (lower.includes("tiktok")) platform = "TikTok";
  else if (lower.includes("twitter") || lower.includes("x.com")) platform = "X / Twitter";
  else if (lower.includes("linkedin")) platform = "LinkedIn";
  socialLinks.push([`${candidateId}:${itemOrder}`, candidateId, itemOrder, platform, rawUrl]);
  socialCount.set(candidateId, (socialCount.get(candidateId) ?? 0) + 1);
}

const details = detailsCsv.rows.map((row) => {
  const candidateId = detailsCsv.get(row, "SQ_CANDIDATO");
  const summary = assetSummary.get(candidateId) ?? { count: 0, total: 0 };
  const age = Number(detailsCsv.get(row, "NR_IDADE_DATA_POSSE"));
  return [
    candidateId,
    Number.isFinite(age) && age > 0 ? age : null,
    clean(detailsCsv.get(row, "DS_NACIONALIDADE")),
    clean(detailsCsv.get(row, "NM_MUNICIPIO_NASCIMENTO")),
    yesNo(detailsCsv.get(row, "ST_REELEICAO")),
    yesNo(detailsCsv.get(row, "ST_DECLARAR_BENS")),
    moneyToCents(detailsCsv.get(row, "VR_DESPESA_MAX_CAMPANHA")),
    clean(detailsCsv.get(row, "NR_PROCESSO")),
    clean(detailsCsv.get(row, "DS_SITUACAO_JULGAMENTO")),
    clean(detailsCsv.get(row, "DT_ACEITE_CANDIDATURA"), "") || null,
    summary.count,
    summary.total,
    socialCount.get(candidateId) ?? 0,
  ];
});

const detailChunks = statementsFor("candidate_details", ["candidate_id", "age_at_inauguration", "nationality", "birth_city", "is_reelection", "declares_assets", "campaign_expense_limit_cents", "registration_process_number", "judgment_status", "accepted_at", "asset_count", "asset_total_cents", "social_count"], details);
const assetChunks = statementsFor("candidate_assets", ["id", "candidate_id", "item_order", "asset_type", "description", "value_cents", "updated_at"], assets);
const socialChunks = statementsFor("candidate_social_links", ["id", "candidate_id", "item_order", "platform", "url"], socialLinks);

const importedAt = new Date().toISOString();
const sources = [
  ["tse-candidatos-complementares-2026", "Candidatos — informações complementares 2026", "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand_complementar/consulta_cand_complementar_2026.zip", "2026-08-17T22:36:57Z", details.length],
  ["tse-bens-candidatos-2026", "Bens declarados por candidatos 2026", "https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_2026.zip", "2026-08-18T11:35:14Z", assets.length],
  ["tse-redes-candidatos-2026", "Redes sociais declaradas por candidatos 2026", "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/rede_social_candidato_2026.zip", "2026-08-17T22:33:54Z", socialLinks.length],
];
const sourceStatements = sources.map(([id, label, resourceUrl, updatedAt, count]) =>
  `INSERT INTO source_snapshots (id,label,publisher,dataset_url,resource_url,license,source_updated_at,imported_at,record_count) VALUES (${[
    id,
    label,
    "Tribunal Superior Eleitoral",
    "https://dadosabertos.tse.jus.br/dataset/candidatos-2026",
    resourceUrl,
    "Creative Commons Atribuição",
    updatedAt,
    importedAt,
    count,
  ].map(sql).join(",")});`
);

const marker = "-- TSE-ENRICHMENT-2026";
const migration = await readFile(migrationPath, "utf8");
const schemaOnly = migration.split(marker)[0].trimEnd();
const migrationDirectory = dirname(migrationPath);
const separator = "\n--> statement-breakpoint\n";
const assetSplit = Math.ceil(assetChunks.length / 2);
await writeFile(migrationPath, `${schemaOnly}${separator}${marker}-DETAILS\n${[...detailChunks, sourceStatements[0], "PRAGMA optimize;"].join(separator)}\n`, "utf8");
await writeFile(join(migrationDirectory, "0002_seed_assets_a_2026.sql"), `${marker}-ASSETS-A\n${assetChunks.slice(0, assetSplit).join(separator)}\n`, "utf8");
await writeFile(join(migrationDirectory, "0003_seed_assets_b_2026.sql"), `${marker}-ASSETS-B\n${[...assetChunks.slice(assetSplit), sourceStatements[1], "PRAGMA optimize;"].join(separator)}\n`, "utf8");
await writeFile(join(migrationDirectory, "0004_seed_social_2026.sql"), `${marker}-SOCIAL\n${[...socialChunks, sourceStatements[2], "PRAGMA optimize;"].join(separator)}\n`, "utf8");

console.log(`${details.length} detalhes, ${assets.length} bens e ${socialLinks.length} redes divididos a partir de ${basename(migrationPath)}.`);
