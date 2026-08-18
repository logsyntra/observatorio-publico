import { getCandidateProfile } from "../../../../../lib/candidate-profile";
import { DATAJUD_DOCUMENTATION_URL, electoralDataJudEndpoint, formatCnjNumber, queryPublicDataJud } from "../../../../../lib/datajud-public";
import { fetchTseCandidateDossier } from "../../../../../lib/tse-divulga";
import { getPublicJusticeHistory } from "../../../../../lib/public-justice-history";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const candidate = await getCandidateProfile(id);
  if (!candidate) return Response.json({ error: "Candidatura não encontrada." }, { status: 404 });

  const importedNumber = (candidate.registrationProcessNumber ?? "").replace(/\D/g, "");
  const dossier = await fetchTseCandidateDossier(candidate).catch(() => null);
  const history = getPublicJusticeHistory(candidate.fullName);
  const liveNumber = dossier?.processes.find((process) => process.kind === "registration")?.number;
  const number = liveNumber ?? importedNumber;
  const registration = {
    type: "Registro de candidatura",
    number,
    formattedNumber: formatCnjNumber(number),
    role: "Requerente / candidato(a)",
    status: dossier?.status ?? candidate.candidacyStatus,
    acceptedAt: number === importedNumber ? candidate.acceptedAt : null,
    source: dossier ? "Tribunal Superior Eleitoral — DivulgaCand atualizado" : "Tribunal Superior Eleitoral — dados abertos",
    sourceUrl: dossier?.publicProfileUrl ?? candidate.sourceUrl,
  };

  const processRefs = dossier?.processes.length ? dossier.processes : number.length === 20 ? [{ kind: "registration" as const, label: "Registro individual da candidatura", number }] : [];
  const endpoint = electoralDataJudEndpoint(candidate.state, candidate.office);

  if (!endpoint || !processRefs.length) {
    return Response.json({ registration, dossier, history, datajud: { state: "unavailable", reason: !endpoint ? "Não foi possível determinar com segurança o tribunal responsável." : "O TSE não informou um número CNJ válido para consulta automática.", processes: [], checkedAt: new Date().toISOString(), documentationUrl: DATAJUD_DOCUMENTATION_URL } });
  }

  const lookups = await Promise.all(processRefs.slice(0, 12).map(async (process) => {
    try {
      const records = await queryPublicDataJud(process.number, endpoint);
      return { ...process, formattedNumber: formatCnjNumber(process.number), state: records.length ? "found" as const : "not_found" as const, records };
    } catch {
      return { ...process, formattedNumber: formatCnjNumber(process.number), state: "error" as const, records: [] };
    }
  }));

  const found = lookups.some((lookup) => lookup.state === "found");
  const allFailed = lookups.every((lookup) => lookup.state === "error");
  return Response.json({
    registration,
    dossier,
    history,
    datajud: {
      state: allFailed ? "error" : found ? "found" : "not_found",
      tribunal: endpoint.label,
      reason: allFailed ? "A API pública do CNJ não respondeu às verificações agora." : undefined,
      processes: lookups,
      records: lookups.flatMap((lookup) => lookup.records),
      checkedAt: new Date().toISOString(),
      documentationUrl: DATAJUD_DOCUMENTATION_URL,
    },
  }, { status: allFailed ? 502 : 200 });
}
