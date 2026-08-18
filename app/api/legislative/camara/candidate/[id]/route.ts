import { getCandidateProfile } from "../../../../../../lib/candidate-profile";
import { normalizePersonName } from "../../../../../../lib/normalize-name";

export const dynamic = "force-dynamic";

const API_BASE = "https://dadosabertos.camara.leg.br/api/v2";
const API_DOCS = "https://dadosabertos.camara.leg.br/swagger/api.html";

type ApiResponse<T = Record<string, unknown>> = { dados?: T; links?: Array<{ rel?: string; href?: string }> };
type DeputySummary = { id: number; nome: string; siglaPartido: string; siglaUf: string; idLegislatura: number; urlFoto: string; uri: string };
type DeputyDetail = {
  id: number;
  nomeCivil: string;
  ultimoStatus?: DeputySummary & { nomeEleitoral?: string; situacao?: string; condicaoEleitoral?: string; data?: string };
  urlWebsite?: string | null;
};

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const candidate = await getCandidateProfile(id);
  if (!candidate) return Response.json({ error: "Candidatura não encontrada." }, { status: 404 });

  try {
    const legislatureIds = Array.from({ length: 10 }, (_, index) => 48 + index);
    const searches = await Promise.all(legislatureIds.map((legislature) => getJson<ApiResponse<DeputySummary[]>>(`/deputados?${new URLSearchParams({ nome: candidate.ballotName, idLegislatura: String(legislature), itens: "100", ordem: "ASC", ordenarPor: "nome" })}`, false)));
    const uniqueSummaries = Array.from(searches.flatMap((search) => search.dados ?? []).reduce((map, item) => map.set(item.id, item), new Map<number, DeputySummary>()).values());
    const sameState = uniqueSummaries.filter((item) => item.siglaUf === candidate.state);
    const details = await Promise.all(sameState.map((item) => getJson<ApiResponse<DeputyDetail>>(`/deputados/${item.id}`).then((payload) => payload.dados).catch(() => null)));
    const exactMatches = details.filter((detail): detail is DeputyDetail => Boolean(detail && normalizePersonName(detail.nomeCivil) === normalizePersonName(candidate.fullName) && detail.ultimoStatus?.siglaUf === candidate.state));

    if (exactMatches.length !== 1) {
      return Response.json({
        match: {
          state: exactMatches.length > 1 ? "review_required" : "no_current_match",
          method: "nome civil completo + UF",
          explanation: exactMatches.length > 1
            ? "Mais de um registro oficial coincidiu; o vínculo exige revisão humana."
            : "Nenhum mandato da Câmara nas legislaturas consultadas coincidiu simultaneamente com o nome civil completo e a UF desta candidatura.",
          checkedAt: new Date().toISOString(),
        },
        candidate: { fullName: candidate.fullName, ballotName: candidate.ballotName, state: candidate.state, partyAcronym: candidate.partyAcronym },
        coverage: coverage(false),
        source: { publisher: "Câmara dos Deputados", documentationUrl: API_DOCS },
      });
    }

    const deputy = exactMatches[0];
    const deputyId = deputy.id;
    const legislatureId = deputy.ultimoStatus?.idLegislatura ?? sameState.find((item) => item.id === deputyId)?.idLegislatura ?? 57;
    const deputyPayload = {
      id: deputy.id,
      civilName: deputy.nomeCivil,
      parliamentaryName: deputy.ultimoStatus?.nomeEleitoral ?? deputy.ultimoStatus?.nome,
      state: deputy.ultimoStatus?.siglaUf,
      party: deputy.ultimoStatus?.siglaPartido,
      legislatureId,
      status: deputy.ultimoStatus?.situacao,
      electoralCondition: deputy.ultimoStatus?.condicaoEleitoral,
      statusDate: deputy.ultimoStatus?.data,
      photoUrl: deputy.ultimoStatus?.urlFoto,
      profileUrl: `https://www.camara.leg.br/deputados/${deputy.id}`,
    };

    if (new URL(request.url).searchParams.get("scope") === "identity") {
      return Response.json({
        match: { state: "matched", method: "nome civil completo + UF", checkedAt: new Date().toISOString() },
        deputy: deputyPayload,
        partial: true,
        coverage: coverage(true),
        source: { publisher: "Câmara dos Deputados", documentationUrl: API_DOCS, apiUrl: API_BASE },
      }, { headers: { "Cache-Control": "private, max-age=300" } });
    }
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const currentYear = now.getUTCFullYear();
    const requestedYear = Number(new URL(request.url).searchParams.get("year") ?? currentYear);
    const year = Number.isInteger(requestedYear) && requestedYear >= 1989 && requestedYear <= currentYear ? requestedYear : currentYear;
    const yearStart = `${year}-01-01`;
    const yearEnd = year === currentYear ? today : `${year}-12-31`;
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);
    // A API da Câmara limita rajadas grandes. Carregamos os votos primeiro para não
    // disputar a cota simultânea com despesas, discursos e os demais módulos.
    const votes = await loadVotes(deputyId, yearStart, yearEnd);

    const [proposals, speeches, events, organizations, externalMandates, currentExpenses, previousExpenses, mandateHistory, occupations, professions, fronts] = await Promise.all([
      getJson<ApiResponse<unknown[]>>(`/proposicoes?${new URLSearchParams({ idDeputadoAutor: String(deputyId), itens: "20", ordem: "DESC", ordenarPor: "id" })}`, false),
      getJson<ApiResponse<unknown[]>>(`/deputados/${deputyId}/discursos?${new URLSearchParams({ idLegislatura: String(legislatureId), dataInicio: yearStart, dataFim: yearEnd, itens: "30", ordem: "DESC", ordenarPor: "dataHoraInicio" })}`, false),
      getJson<ApiResponse<unknown[]>>(`/deputados/${deputyId}/eventos?${new URLSearchParams({ dataInicio: ninetyDaysAgo, dataFim: today, itens: "10", ordem: "DESC", ordenarPor: "dataHoraInicio" })}`, false),
      getJson<ApiResponse<unknown[]>>(`/deputados/${deputyId}/orgaos?${new URLSearchParams({ dataInicio: "1989-01-01", dataFim: today, itens: "100", ordem: "DESC", ordenarPor: "dataInicio" })}`, false),
      getJson<ApiResponse<unknown[]>>(`/deputados/${deputyId}/mandatosExternos`, false),
      getJson<ApiResponse<RawExpense[]>>(`/deputados/${deputyId}/despesas?${new URLSearchParams({ idLegislatura: String(legislatureId), ano: String(year), itens: "100", ordem: "DESC", ordenarPor: "dataDocumento" })}`, false),
      getJson<ApiResponse<RawExpense[]>>(`/deputados/${deputyId}/despesas?${new URLSearchParams({ idLegislatura: String(legislatureId), ano: String(year - 1), itens: "100", ordem: "DESC", ordenarPor: "dataDocumento" })}`, false),
      getJson<ApiResponse<unknown[]>>(`/deputados/${deputyId}/historico?${new URLSearchParams({ itens: "100", ordem: "DESC", ordenarPor: "dataHora" })}`, false),
      getJson<ApiResponse<unknown[]>>(`/deputados/${deputyId}/ocupacoes`, false),
      getJson<ApiResponse<unknown[]>>(`/deputados/${deputyId}/profissoes`, false),
      getJson<ApiResponse<unknown[]>>(`/deputados/${deputyId}/frentes?${new URLSearchParams({ idLegislatura: String(legislatureId), itens: "100" })}`, false),
    ]);

    const expensePayloads = [currentExpenses, previousExpenses];
    const expenseItems = expensePayloads.flatMap((payload) => payload.dados ?? []).map(sanitizeExpense).sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
    const byType = Array.from(expenseItems.reduce((map, item) => map.set(item.type, (map.get(item.type) ?? 0) + item.netValue), new Map<string, number>()).entries())
      .map(([type, value]) => ({ type, value })).sort((a, b) => b.value - a.value);

    return Response.json({
      match: { state: "matched", method: "nome civil completo + UF", checkedAt: new Date().toISOString() },
      deputy: deputyPayload,
      selectedYear: year,
      availableYears: Array.from({ length: currentYear - 1989 + 1 }, (_, index) => currentYear - index),
      proposals: (proposals.dados ?? []).slice(0, 20),
      speeches: (speeches.dados ?? []).slice(0, 30).map(sanitizeSpeech),
      events: (events.dados ?? []).slice(0, 10).map(sanitizeEvent),
      organizations: (organizations.dados ?? []).slice(0, 30),
      externalMandates: (externalMandates.dados ?? []).slice(0, 30),
      mandateHistory: (mandateHistory.dados ?? []).slice(0, 100),
      occupations: (occupations.dados ?? []).slice(0, 100),
      professions: (professions.dados ?? []).slice(0, 100),
      fronts: (fronts.dados ?? []).slice(0, 100),
      expenses: {
        loadedRecords: expenseItems.length,
        hasMore: expensePayloads.some((payload) => payload.links?.some((link) => link.rel === "next")),
        netValue: expenseItems.reduce((sum, item) => sum + item.netValue, 0),
        byType: byType.slice(0, 12),
        recent: expenseItems.slice(0, 20),
        years: [year, year - 1],
      },
      votes,
      coverage: coverage(true),
      source: { publisher: "Câmara dos Deputados", documentationUrl: API_DOCS, apiUrl: API_BASE },
    });
  } catch {
    return Response.json({ error: "A API oficial da Câmara não respondeu agora.", code: "CAMARA_UNAVAILABLE", coverage: coverage(false), source: { publisher: "Câmara dos Deputados", documentationUrl: API_DOCS } }, { status: 502 });
  }
}

type RawExpense = { ano?: number; mes?: number; tipoDespesa?: string; dataDocumento?: string; valorLiquido?: number; valorDocumento?: number; valorGlosa?: number; nomeFornecedor?: string; cnpjCpfFornecedor?: string; urlDocumento?: string; tipoDocumento?: string };

function sanitizeExpense(item: RawExpense) {
  const supplierDocument = String(item.cnpjCpfFornecedor ?? "").replace(/\D/g, "");
  return {
    year: item.ano ?? null,
    month: item.mes ?? null,
    type: item.tipoDespesa ?? "Tipo não informado",
    date: item.dataDocumento ?? null,
    netValue: Number(item.valorLiquido ?? 0),
    documentValue: Number(item.valorDocumento ?? 0),
    disallowedValue: Number(item.valorGlosa ?? 0),
    supplierName: item.nomeFornecedor ?? "Fornecedor não informado",
    supplierCnpj: supplierDocument.length === 14 ? supplierDocument : null,
    documentUrl: safeHttpsUrl(item.urlDocumento),
    documentType: item.tipoDocumento ?? null,
  };
}

function sanitizeSpeech(value: unknown) {
  const item = value as Record<string, unknown>;
  const phase = item.faseEvento as Record<string, unknown> | undefined;
  return { date: item.dataHoraInicio ?? null, type: item.tipoDiscurso ?? null, phase: phase?.titulo ?? null, summary: item.sumario ?? null, keywords: item.keywords ?? null, textUrl: safeHttpsUrl(item.urlTexto), audioUrl: safeHttpsUrl(item.urlAudio), videoUrl: safeHttpsUrl(item.urlVideo) };
}

function sanitizeEvent(value: unknown) {
  const item = value as Record<string, unknown>;
  const location = item.localCamara as Record<string, unknown> | undefined;
  const organizations = Array.isArray(item.orgaos) ? item.orgaos as Array<Record<string, unknown>> : [];
  return { id: item.id, startsAt: item.dataHoraInicio ?? null, endsAt: item.dataHoraFim ?? null, status: item.situacao ?? null, type: item.descricaoTipo ?? null, description: item.descricao ?? null, location: location?.nome ?? item.localExterno ?? null, organizations: organizations.map((org) => ({ acronym: org.sigla, name: org.nome })), recordUrl: safeHttpsUrl(item.urlRegistro) };
}

async function loadVotes(deputyId: number, start: string, end: string) {
  const year = Number(start.slice(0, 4));
  const quarterEnds = [`${year}-03-31`, `${year}-06-30`, `${year}-09-30`, `${year}-12-31`];
  const quarterStarts = [`${year}-01-01`, `${year}-04-01`, `${year}-07-01`, `${year}-10-01`];
  const ranges = quarterStarts.map((rangeStart, index) => ({ start: rangeStart < start ? start : rangeStart, end: quarterEnds[index] > end ? end : quarterEnds[index] })).filter((range) => range.start <= range.end);
  const lists = await Promise.all(ranges.map((range) => getJson<ApiResponse<Array<Record<string, unknown>>>>(`/votacoes?${new URLSearchParams({ idOrgao: "180", dataInicio: range.start, dataFim: range.end, itens: "25", ordem: "DESC", ordenarPor: "data" })}`, false)));
  const votes: Array<Record<string, unknown> | null> = [];
  let failedRequests = 0;
  let sessionsWithIndividualBallots = 0;
  const allSessions = lists.flatMap((list) => list.dados ?? []).sort((a, b) => String(b.data ?? "").localeCompare(String(a.data ?? "")));
  const sessions = lists.flatMap((list) => {
    const quarter = list.dados ?? [];
    const likelyNominal = quarter.filter((vote) => /(?:sim|n[aã]o|absten[cç][aã]o)\s*:/i.test(String(vote.descricao ?? "")));
    const remaining = quarter.filter((vote) => !likelyNominal.includes(vote));
    return [...likelyNominal, ...remaining].slice(0, 6);
  });
  for (let offset = 0; offset < sessions.length; offset += 3) {
    const batch = await Promise.all(sessions.slice(offset, offset + 3).map(async (vote) => {
    try {
      const response = await fetch(`${API_BASE}/votacoes/${vote.id}/votos`, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) { failedRequests += 1; return null; }
      const result = await response.json() as ApiResponse<Array<{ tipoVoto?: string; dataRegistroVoto?: string; deputado_?: { id?: number } }>>;
      if ((result.dados ?? []).length) sessionsWithIndividualBallots += 1;
      const individual = (result.dados ?? []).find((item) => Number(item.deputado_?.id) === deputyId);
      return individual ? { id: vote.id, date: vote.data, recordedAt: individual.dataRegistroVoto, vote: individual.tipoVoto, description: vote.descricao, approved: vote.aprovacao, proposal: vote.proposicaoObjeto, sourceUrl: vote.uri } : null;
    } catch { failedRequests += 1; return null; }
    }));
    votes.push(...batch);
  }
  const records = votes
    .filter((item): item is Record<string, unknown> => item !== null)
    .sort((a, b) => String(b.recordedAt ?? b.date ?? "").localeCompare(String(a.recordedAt ?? a.date ?? "")));
  return { windowStart: start, windowEnd: end, sessionsInspected: sessions.length, sessionsWithIndividualBallots, failedRequests, truncated: allSessions.length > sessions.length || lists.some((list) => list.links?.some((link) => link.rel === "next")), records };
}

async function getJson<T>(path: string, strict = true): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) {
    if (!strict) return { dados: [] } as T;
    throw new Error(`Câmara respondeu ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function safeHttpsUrl(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  try { const url = new URL(value.replace(/^http:/i, "https:")); return url.protocol === "https:" ? url.toString() : null; } catch { return null; }
}

function coverage(linked: boolean) {
  return {
    identity: linked ? "verified" : "not_linked",
    mandate: linked ? "legislatures_48_to_57" : "not_linked",
    proposals: linked ? "live_latest_20" : "not_linked",
    speeches: linked ? "up_to_30_per_selected_year" : "not_linked",
    events: linked ? "live_90_days" : "not_linked",
    expenses: linked ? "sample_up_to_100_per_year" : "not_linked",
    votes: linked ? "up_to_24_likely_nominal_sessions_per_selected_year_across_quarters" : "not_linked",
    history: linked ? "mandates_occupations_professions_fronts" : "not_linked",
    staff: "not_connected",
  };
}
