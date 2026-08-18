import { getCandidateProfile } from "../../../../../../lib/candidate-profile";
import { normalizePersonName } from "../../../../../../lib/normalize-name";

export const dynamic = "force-dynamic";

const API_BASE = "https://legis.senado.leg.br/dadosabertos";
const API_DOCS = "https://legis.senado.leg.br/dadosabertos/api-docs/swagger-ui/index.html";

type CurrentSenator = {
  IdentificacaoParlamentar?: {
    CodigoParlamentar?: string;
    NomeParlamentar?: string;
    NomeCompletoParlamentar?: string;
    SiglaPartidoParlamentar?: string;
    UfParlamentar?: string;
    UrlFotoParlamentar?: string;
    UrlPaginaParlamentar?: string;
  };
  Mandato?: Record<string, unknown>;
};

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const candidate = await getCandidateProfile(id);
  if (!candidate) return Response.json({ error: "Candidatura não encontrada." }, { status: 404 });

  try {
    const current = await getJson<Record<string, unknown>>("/senador/lista/atual");
    const senators = asArray<CurrentSenator>(readPath(current, "ListaParlamentarEmExercicio.Parlamentares.Parlamentar"));
    const matches = senators.filter((senator) => {
      const identity = senator.IdentificacaoParlamentar;
      return normalizePersonName(identity?.NomeCompletoParlamentar ?? "") === normalizePersonName(candidate.fullName)
        && identity?.UfParlamentar === candidate.state;
    });

    if (matches.length !== 1) {
      return Response.json({
        match: {
          state: matches.length > 1 ? "review_required" : "no_current_match",
          method: "nome civil completo + UF",
          explanation: matches.length > 1
            ? "Mais de um registro atual do Senado coincidiu; o vínculo exige revisão humana."
            : "Nenhum mandato atual do Senado coincidiu simultaneamente com o nome civil completo e a UF desta candidatura.",
          checkedAt: new Date().toISOString(),
        },
        coverage: coverage(false),
        source: { publisher: "Senado Federal", documentationUrl: API_DOCS },
      });
    }

    const match = matches[0];
    const identity = match.IdentificacaoParlamentar ?? {};
    const senatorId = String(identity.CodigoParlamentar ?? "");
    const senator = {
      id: senatorId,
      civilName: identity.NomeCompletoParlamentar,
      parliamentaryName: identity.NomeParlamentar,
      state: identity.UfParlamentar,
      party: identity.SiglaPartidoParlamentar,
      photoUrl: safeHttps(identity.UrlFotoParlamentar),
      profileUrl: safeHttps(identity.UrlPaginaParlamentar),
    };
    if (new URL(request.url).searchParams.get("scope") === "identity") {
      return Response.json({ match: { state: "matched", method: "nome civil completo + UF", checkedAt: new Date().toISOString() }, senator, partial: true, coverage: coverage(true), source: { publisher: "Senado Federal", documentationUrl: API_DOCS, apiUrl: API_BASE } });
    }
    const [votes, committees, offices, mandates, affiliations] = await Promise.all([
      getJson<unknown[]>(`/votacao?codigoParlamentar=${encodeURIComponent(senatorId)}`, false),
      getJson<Record<string, unknown>>(`/senador/${senatorId}/comissoes`, false),
      getJson<Record<string, unknown>>(`/senador/${senatorId}/cargos`, false),
      getJson<Record<string, unknown>>(`/senador/${senatorId}/mandatos`, false),
      getJson<Record<string, unknown>>(`/senador/${senatorId}/filiacoes`, false),
    ]);

    const voteRecords = asArray<Record<string, unknown>>(votes).flatMap((vote) => {
      const individual = asArray<Record<string, unknown>>(vote.votos).find((item) => String(item.codigoParlamentar ?? "") === senatorId);
      if (!individual) return [];
      return [{
        id: `${vote.codigoSessaoVotacao ?? vote.sequencialVotacao ?? "voto"}-${vote.dataSessao ?? ""}`,
        date: String(vote.dataSessao ?? ""),
        vote: String(individual.descricaoVotoParlamentar ?? individual.siglaVotoParlamentar ?? "Registro nominal"),
        proposal: String(vote.identificacao ?? "Matéria não identificada"),
        description: String(vote.descricaoVotacao ?? vote.ementa ?? "Descrição não informada"),
        outcome: String(vote.resultadoVotacao ?? "Resultado não informado"),
        secret: String(vote.votacaoSecreta ?? "N") === "S",
        sourceUrl: vote.codigoMateria ? `https://www25.senado.leg.br/web/atividade/materias/-/materia/${vote.codigoMateria}` : null,
      }];
    }).sort((a, b) => b.date.localeCompare(a.date));

    const committeeRecords = asArray<Record<string, unknown>>(readPath(committees, "MembroComissaoParlamentar.Parlamentar.MembroComissoes.Comissao")).map((item) => {
      const detail = item.IdentificacaoComissao as Record<string, unknown> | undefined;
      return { acronym: detail?.SiglaComissao ?? null, name: detail?.NomeComissao ?? null, participation: item.DescricaoParticipacao ?? null, startedAt: item.DataInicio ?? null, endedAt: item.DataFim ?? null };
    });
    const officeRecords = asArray<Record<string, unknown>>(readPath(offices, "CargoParlamentar.Parlamentar.Cargos.Cargo")).map((item) => {
      const detail = item.IdentificacaoComissao as Record<string, unknown> | undefined;
      return { role: item.DescricaoCargo ?? null, organization: detail?.NomeComissao ?? null, acronym: detail?.SiglaComissao ?? null, startedAt: item.DataInicio ?? null, endedAt: item.DataFim ?? null };
    });
    const mandateRecords = asArray<Record<string, unknown>>(readPath(mandates, "MandatoParlamentar.Parlamentar.Mandatos.Mandato"));
    const affiliationRecords = asArray<Record<string, unknown>>(readPath(affiliations, "FiliacaoParlamentar.Parlamentar.Filiacoes.Filiacao")).map((item) => {
      const party = item.Partido as Record<string, unknown> | undefined;
      return { acronym: party?.SiglaPartido ?? null, name: party?.NomePartido ?? null, startedAt: item.DataFiliacao ?? null, endedAt: item.DataDesfiliacao ?? null };
    });

    return Response.json({
      match: { state: "matched", method: "nome civil completo + UF", checkedAt: new Date().toISOString() },
      senator,
      votes: { records: voteRecords, total: voteRecords.length, oldest: voteRecords.at(-1)?.date ?? null, newest: voteRecords[0]?.date ?? null },
      committees: committeeRecords,
      offices: officeRecords,
      mandates: mandateRecords,
      affiliations: affiliationRecords,
      coverage: coverage(true),
      source: { publisher: "Senado Federal", documentationUrl: API_DOCS, apiUrl: API_BASE },
    }, { headers: { "Cache-Control": "private, max-age=900" } });
  } catch {
    return Response.json({ error: "A API oficial do Senado não respondeu agora.", coverage: coverage(false), source: { publisher: "Senado Federal", documentationUrl: API_DOCS } }, { status: 502 });
  }
}

async function getJson<T>(path: string, strict = true): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) {
    if (!strict) return {} as T;
    throw new Error(`Senado respondeu ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function readPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, value);
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return value && typeof value === "object" ? [value as T] : [];
}

function safeHttps(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  try { const url = new URL(value.replace(/^http:/i, "https:")); return url.protocol === "https:" ? url.toString() : null; } catch { return null; }
}

function coverage(linked: boolean) {
  return {
    identity: linked ? "verified" : "not_linked",
    mandate: linked ? "live" : "not_linked",
    votes: linked ? "all_records_returned_by_official_endpoint" : "not_linked",
    committees: linked ? "live_history" : "not_linked",
    offices: linked ? "live_history" : "not_linked",
    affiliations: linked ? "live_history" : "not_linked",
  };
}
