import { getCandidateProfile } from "../../../../../lib/candidate-profile";
import { getPublicRelations } from "../../../../../lib/public-relations";
import { getStoredPublicRelations } from "../../../../../lib/relation-store";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const candidate = await getCandidateProfile(id);
  if (!candidate) return Response.json({ error: "Candidatura não encontrada." }, { status: 404 });
  const stored = await getStoredPublicRelations(id);
  const curated = getPublicRelations(candidate.fullName);
  const relations = Array.from([...stored, ...curated].reduce((map, item) => map.set(`${item.relationType}:${item.slug}:${item.relationLabel}`, item), new Map<string, typeof curated[number]>()).values());
  return Response.json({
    candidate: { id, fullName: candidate.fullName, ballotName: candidate.ballotName },
    relations,
    coverage: { total: relations.length, expandedProfiles: relations.filter((item) => item.publicFigure).length, mode: "curadoria_documental" },
    methodology: {
      warning: "Parentesco não transfere responsabilidade. O dossiê ampliado só é habilitado para agente público ou pessoa com atuação pública documentada.",
      excluded: ["menores", "endereços", "documentos pessoais", "familiares sem relevância pública além do vínculo"],
      checkedAt: new Date().toISOString(),
    },
  }, { headers: { "Cache-Control": "private, max-age=3600" } });
}
