import { getCandidateProfile } from "../../../../../../lib/candidate-profile";
import { normalizePersonName } from "../../../../../../lib/normalize-name";

export const dynamic = "force-dynamic";

const API_BASE = "https://legis.senado.leg.br/dadosabertos";
const API_DOCS = "https://legis.senado.leg.br/dadosabertos/api-docs/swagger-ui/index.html";
const CURRENT_PRESIDENT_SOURCE = "https://www.gov.br/casacivil/pt-br/.arquivos/mensagem-ao-congresso-nacional-2026.pdf/@@download/file";
const HISTORICAL_SOURCE = "https://www.gov.br/secretariageral/pt-br/centrais-de-conteudo/biblioteca-da-pr/galeria-dos-ex-presidentes/luiz-inacio-lula-da-silva/biografia-completa";

const presidentialTerms = [{ start: 2003, end: 2010 }, { start: 2023, end: 2026 }];

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const candidate = await getCandidateProfile(id);
  if (!candidate) return Response.json({ error: "Candidatura não encontrada." }, { status: 404 });

  if (normalizePersonName(candidate.fullName) !== "LUIZ INACIO LULA DA SILVA") {
    return Response.json({
      match: { state: "no_presidential_mandate", method: "nome civil completo + períodos oficiais de exercício", explanation: "Nenhum mandato presidencial foi ligado com segurança a esta candidatura.", checkedAt: new Date().toISOString() },
      coverage: { identity: "not_linked", vetoes: "not_linked" },
      source: { publisher: "Congresso Nacional / Senado Federal", documentationUrl: API_DOCS },
    });
  }

  const years = presidentialTerms.flatMap((term) => Array.from({ length: term.end - term.start + 1 }, (_, index) => term.start + index));
  const responses = await Promise.all(years.map(async (year) => {
    try {
      const response = await fetch(`${API_BASE}/materia/vetos/${year}`, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) return { year, ok: false, vetoes: [] as Record<string, unknown>[] };
      const json = await response.json() as Record<string, unknown>;
      return { year, ok: true, vetoes: asArray<Record<string, unknown>>(readPath(json, "ListaVetosAnoCN.Vetos.Veto")) };
    } catch {
      return { year, ok: false, vetoes: [] as Record<string, unknown>[] };
    }
  }));

  const vetoes = responses.flatMap(({ year, vetoes: records }) => records.map((record) => {
    const matter = record.Materia as Record<string, unknown> | undefined;
    const vetoed = record.MateriaVetada as Record<string, unknown> | undefined;
    const message = record.Mensagem as Record<string, unknown> | undefined;
    return {
      id: String(record.Codigo ?? `${year}-${matter?.Numero ?? "veto"}`),
      year,
      number: String(matter?.Numero ?? ""),
      total: String(record.Total ?? "").toLocaleLowerCase("pt-BR") === "sim",
      subject: String(record.Assunto ?? "Assunto não informado"),
      summary: String(matter?.Ementa ?? vetoed?.Ementa ?? "Ementa não informada"),
      publishedAt: String(record.DataPublicacao ?? record.DataRecebimentoCongresso ?? ""),
      inProgress: String(matter?.EmTramitacao ?? "").toLocaleLowerCase("pt-BR") === "sim",
      provisions: Number(record.QuantidadeDispositivos ?? 0),
      vetoedProposal: [vetoed?.Sigla, vetoed?.Numero, vetoed?.Ano ? `/${vetoed.Ano}` : ""].filter(Boolean).join(" ").replace(" /", "/"),
      messageUrl: safeHttps(message?.UrlPlanalto),
      sourceUrl: safeHttps(record.UrlDispositivos) ?? safeHttps(matter?.UrlMovimentacoes),
    };
  })).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const datedVetoes = vetoes.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.publishedAt));

  return Response.json({
    match: { state: "matched", method: "nome civil completo + períodos oficiais de exercício", checkedAt: new Date().toISOString() },
    officeholder: { fullName: candidate.fullName, role: "Presidente da República", terms: presidentialTerms, currentSourceUrl: CURRENT_PRESIDENT_SOURCE, historicalSourceUrl: HISTORICAL_SOURCE },
    vetoes,
    summary: {
      total: vetoes.length,
      totalVetoes: vetoes.filter((item) => item.total).length,
      partialVetoes: vetoes.filter((item) => !item.total).length,
      oldest: datedVetoes.at(-1)?.publishedAt ?? null,
      oldestYear: vetoes.length ? Math.min(...vetoes.map((item) => item.year)) : null,
      newest: datedVetoes[0]?.publishedAt ?? null,
      yearsRequested: years.length,
      yearsRetrieved: responses.filter((item) => item.ok).length,
    },
    methodology: {
      attribution: "atos presidenciais registrados pelo Congresso durante os períodos de mandato",
      warning: "O vínculo temporal com um mandato não comprova assinatura pessoal. A mensagem oficial deve ser aberta para confirmar o signatário, inclusive em períodos de exercício interino.",
    },
    coverage: { identity: "verified", vetoes: "all_records_returned_for_official_term_years" },
    source: { publisher: "Congresso Nacional / Senado Federal", documentationUrl: API_DOCS, apiUrl: API_BASE },
  }, { headers: { "Cache-Control": "private, max-age=3600" } });
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
