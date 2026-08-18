import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";

const inputPath = process.argv[2];
const migrationPath = process.argv[3];

if (!inputPath || !migrationPath) {
  throw new Error("Uso: node scripts/build-tse-seed.mjs <consulta_cand_2026_BRASIL.csv> <migration.sql>");
}

const decoder = new TextDecoder("windows-1252");
const csv = decoder.decode(await readFile(inputPath));

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
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ";") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}

function normalizeName(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
}

function clean(value, fallback = "Não informado") {
  return !value || value === "#NULO" || value === "#NE" ? fallback : value.trim();
}

function sql(value) {
  if (value === null) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "0";
  return `'${String(value).replaceAll("'", "''")}'`;
}

const [headers, ...data] = parseDelimited(csv);
const positions = Object.fromEntries(headers.map((header, index) => [header, index]));
const value = (row, column) => row[positions[column]] ?? "";
const resourceUrl = "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip";
const datasetUrl = "https://dadosabertos.tse.jus.br/dataset/candidatos-2026";

const records = data.map((row) => {
  const fullName = clean(value(row, "NM_CANDIDATO"));
  const ballotName = clean(value(row, "NM_URNA_CANDIDATO"), fullName);
  const socialName = clean(value(row, "NM_SOCIAL_CANDIDATO"), "");
  return [
    value(row, "SQ_CANDIDATO"),
    Number(value(row, "ANO_ELEICAO")),
    clean(value(row, "DS_ELEICAO")),
    clean(value(row, "DT_ELEICAO")),
    clean(value(row, "SG_UF")),
    clean(value(row, "NM_UE")),
    clean(value(row, "DS_CARGO")),
    Number(value(row, "NR_CANDIDATO")),
    fullName,
    ballotName,
    socialName || null,
    normalizeName(`${fullName} ${ballotName} ${socialName}`),
    Number(value(row, "NR_PARTIDO")),
    clean(value(row, "SG_PARTIDO")),
    clean(value(row, "NM_PARTIDO")),
    clean(value(row, "DS_SITUACAO_CANDIDATURA")),
    clean(value(row, "DS_OCUPACAO")),
    clean(value(row, "DS_GRAU_INSTRUCAO")),
    `${value(row, "DT_GERACAO")} ${value(row, "HH_GERACAO")}`,
    resourceUrl,
  ];
});

const columns = "source_record_id,election_year,election_name,election_date,state,electoral_unit,office,candidate_number,full_name,ballot_name,social_name,search_name,party_number,party_acronym,party_name,candidacy_status,occupation,education,source_generated_at,source_url";
const chunks = [];
for (let index = 0; index < records.length; index += 120) {
  const rows = records.slice(index, index + 120).map((record) => `(${record.map(sql).join(",")})`).join(",\n");
  chunks.push(`INSERT INTO candidates (${columns}) VALUES\n${rows};`);
}

const sourceUpdatedAt = "2026-08-17T22:36:50Z";
const importedAt = new Date().toISOString();
chunks.push(`INSERT INTO source_snapshots (id,label,publisher,dataset_url,resource_url,license,source_updated_at,imported_at,record_count) VALUES (${[
  "tse-candidatos-2026",
  "Candidatos — Eleições 2026",
  "Tribunal Superior Eleitoral",
  datasetUrl,
  resourceUrl,
  "Creative Commons Atribuição",
  sourceUpdatedAt,
  importedAt,
  records.length,
].map(sql).join(",")});`);
chunks.push("PRAGMA optimize;");

const marker = "-- TSE-SEED-2026";
const migration = await readFile(migrationPath, "utf8");
const schemaOnly = migration.split(marker)[0].trimEnd();
const seeded = `${schemaOnly}\n--> statement-breakpoint\n${marker}\n${chunks.join("\n--> statement-breakpoint\n")}\n`;
await writeFile(migrationPath, seeded, "utf8");

console.log(`${records.length} candidaturas de ${basename(inputPath)} adicionadas a ${basename(migrationPath)}.`);
