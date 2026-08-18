import { getCandidateProfile } from "../../../../../lib/candidate-profile";
import { getFormalCandidateRelations, getPublicRelations } from "../../../../../lib/public-relations";
import { getStoredPublicRelations } from "../../../../../lib/relation-store";
import { fetchTseCandidateDossier } from "../../../../../lib/tse-divulga";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const candidate = await getCandidateProfile(id);
  if (!candidate) return Response.json({ error: "Candidatura não encontrada." }, { status: 404 });
  const [stored, formalResult] = await Promise.all([
    getStoredPublicRelations(id),
    fetchTseCandidateDossier(candidate).then((dossier) => ({ state: "active" as const, relations: getFormalCandidateRelations(dossier.formalRelations, dossier.publicProfileUrl) })).catch(() => ({ state: "unavailable" as const, relations: [] })),
  ]);
  const curated = getPublicRelations(candidate.fullName);
  const relations = Array.from([...stored, ...curated, ...formalResult.relations].reduce((map, item) => map.set(`${item.relationType}:${item.slug}:${item.relationLabel}`, item), new Map<string, typeof curated[number]>()).values());
  const byType = relations.reduce((totals, item) => ({ ...totals, [item.relationType]: (totals[item.relationType] ?? 0) + 1 }), {} as Record<string, number>);
  return Response.json({
    candidate: { id, fullName: candidate.fullName, ballotName: candidate.ballotName },
    relations,
    coverage: {
      total: relations.length,
      expandedProfiles: relations.filter((item) => item.publicFigure || item.entityType !== "person").length,
      byType,
      mode: "identidade_e_evidencia",
      sources: {
        formalTse: { state: formalResult.state, count: formalResult.relations.length, scope: "vice, suplentes e integrantes publicados na chapa" },
        reviewedGraph: { state: "active", count: stored.length, scope: "familiares, profissionais, empresas e organizações revisados" },
        curatedPublicRecords: { state: "partial", count: curated.length, scope: "relações públicas documentadas individualmente" },
      },
    },
    methodology: {
      warning: "Um vínculo não transfere responsabilidade. O dossiê ampliado só é habilitado para agente público, organização identificada ou pessoa com atuação pública documentada.",
      excluded: ["menores", "endereços", "documentos pessoais", "familiares sem relevância pública além do vínculo"],
      checkedAt: new Date().toISOString(),
    },
  }, { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=21600" } });
}
