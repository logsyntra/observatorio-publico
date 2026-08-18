import { getCandidateProfile } from "../../../../../lib/candidate-profile";
import { getPublicPersonBySlug, type PublicRelation } from "../../../../../lib/public-relations";
import { getStoredPublicEntityBySlug } from "../../../../../lib/relation-store";
import { tseCandidatePublicUrl } from "../../../../../lib/tse-divulga";

export const dynamic = "force-dynamic";

const FIRST_YEAR = 2000;
const GOOGLE_NEWS_RSS = "https://news.google.com/rss/search";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const candidateMatch = slug.match(/^candidate-(\d{6,18})$/);
  const candidate = candidateMatch ? await getCandidateProfile(candidateMatch[1]) : null;
  const person = candidate ? candidateAsRelation(candidate) : await getStoredPublicEntityBySlug(slug) ?? getPublicPersonBySlug(slug);
  if (!person) return Response.json({ error: "Pessoa ou entidade relacionada não cadastrada." }, { status: 404 });
  if (!person.publicFigure && person.entityType === "person") return Response.json({ person, items: [], coverage: { state: "relation_only" }, methodology: { warning: "O vínculo é público, mas não há atuação pública suficiente para abrir um dossiê ampliado." } });

  const currentYear = new Date().getUTCFullYear();
  const years = Array.from({ length: currentYear - FIRST_YEAR + 1 }, (_, index) => FIRST_YEAR + index);
  const responses: Array<{ ok: boolean; items: NewsItem[] }> = [];
  for (let offset = 0; offset < years.length; offset += 8) {
    const batch = await Promise.all(years.slice(offset, offset + 8).map(async (year) => {
      const url = new URL(GOOGLE_NEWS_RSS);
      url.searchParams.set("q", `"${person.fullName.replaceAll('"', "")}" after:${year}-01-01 before:${year + 1}-01-01`);
      url.searchParams.set("hl", "pt-BR"); url.searchParams.set("gl", "BR"); url.searchParams.set("ceid", "BR:pt-419");
      try {
        const response = await fetch(url, { headers: { Accept: "application/rss+xml", "User-Agent": "ObservatorioPublico/0.2 (+public-evidence-index)" } });
        if (!response.ok) return { ok: false, items: [] };
        return { ok: true, items: parseRss(await response.text()) };
      } catch { return { ok: false, items: [] }; }
    }));
    responses.push(...batch);
  }
  const seen = new Set<string>();
  const items = responses.flatMap((item) => item.items).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).filter((item) => { const key = normalize(item.title); if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 300);
  const categoryTotals = items.reduce((totals, item) => ({ ...totals, [item.category]: (totals[item.category] ?? 0) + 1 }), {} as Record<NewsItem["category"], number>);
  return Response.json({ person, items, categoryTotals, officialRecords: { justice: "requires_exact_case_identifier", police: "no_unified_public_national_name_search", contracts: person.identifierType === "cnpj" ? "cnpj_confirmed_connector_pending" : "requires_confirmed_cnpj", legislative: person.candidateId ? "candidate_profile_available" : "role_connector_required" }, coverage: { state: "news_index", requestedFrom: FIRST_YEAR, requestedTo: currentYear, yearsRetrieved: responses.filter((item) => item.ok).length, total: items.length }, methodology: { warning: "Notícia é pista, não prova. Processos, inquéritos e prisões só podem ser atribuídos por número oficial, papel processual e identidade confirmada." } }, { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } });
}

function candidateAsRelation(candidate: NonNullable<Awaited<ReturnType<typeof getCandidateProfile>>>): PublicRelation {
  return {
    slug: `candidate-${candidate.sourceRecordId}`,
    fullName: candidate.fullName,
    displayName: candidate.ballotName,
    entityType: "person",
    relationType: "politica",
    relationLabel: candidate.office,
    publicRole: `${candidate.office} · ${candidate.state} · ${candidate.partyAcronym}`,
    publicFigure: true,
    candidateId: candidate.sourceRecordId,
    profileUrl: tseCandidatePublicUrl(candidate),
    officialIdentifier: candidate.sourceRecordId,
    identifierType: "tse_candidate_id",
    evidence: [{ title: "Candidatura publicada pelo TSE", publisher: "Tribunal Superior Eleitoral", url: tseCandidatePublicUrl(candidate) }],
  };
}

type NewsItem = { id: string; title: string; url: string; publisher: string; publishedAt: string; category: "justica" | "contratos" | "atuacao" | "controversia" | "geral" };
function parseRss(xml: string): NewsItem[] {
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)).flatMap((match, index) => {
    const block = match[1]; const title = clean(field(block, "title")); const url = safe(field(block, "link")); const date = new Date(field(block, "pubDate"));
    const source = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i); if (!title || !url || Number.isNaN(date.getTime())) return [];
    return [{ id: `${date.getTime()}-${index}`, title, url, publisher: source ? clean(source[1]) : "Veículo não informado", publishedAt: date.toISOString(), category: classify(title) }];
  });
}
function field(block: string, tag: string) { return block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] ?? ""; }
function clean(value: string) { return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim(); }
function safe(value: string) { try { const url = new URL(value.replace(/^http:/i, "https:")); return url.protocol === "https:" ? url.toString() : null; } catch { return null; } }
function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function classify(title: string): NewsItem["category"] { const value = normalize(title); if (/process|inquerit|investig|policia|pris|denunci|reu|stf|stj|ministerio publico|operacao/.test(value)) return "justica"; if (/contrat|licitac|fornecedor|empresa|patrimonio|despesa|cnpj/.test(value)) return "contratos"; if (/vot|projet|camara|senado|deputad|senador|eleic|mandato|comissao/.test(value)) return "atuacao"; if (/polemic|controvers|critic|repercuss|protest|questionad/.test(value)) return "controversia"; return "geral"; }
