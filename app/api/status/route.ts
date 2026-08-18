import { getD1 } from "../../../db";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getD1().prepare(`
    SELECT
      id,
      label,
      publisher,
      dataset_url AS datasetUrl,
      resource_url AS resourceUrl,
      license,
      source_updated_at AS sourceUpdatedAt,
      imported_at AS importedAt,
      record_count AS recordCount
    FROM source_snapshots
    ORDER BY source_updated_at DESC
  `).all();

  const sources = result.results;
  const source = sources.find((item) => item.id === "tse-candidatos-2026") ?? null;

  return Response.json({
    live: Boolean(source),
    source,
    sources,
    coverage: {
      candidates: source?.recordCount ?? 0,
      details: sources.find((item) => item.id === "tse-candidatos-complementares-2026")?.recordCount ?? 0,
      assets: sources.find((item) => item.id === "tse-bens-candidatos-2026")?.recordCount ?? 0,
      socialLinks: sources.find((item) => item.id === "tse-redes-candidatos-2026")?.recordCount ?? 0,
    },
  });
}
