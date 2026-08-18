import { getTseCandidates2026Status } from "../../../../lib/connectors/tse";

export async function GET() {
  try {
    const dataset = await getTseCandidates2026Status();
    return Response.json({ ok: true, dataset }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida";
    return Response.json({ ok: false, source: "Tribunal Superior Eleitoral", error: message }, { status: 502 });
  }
}
