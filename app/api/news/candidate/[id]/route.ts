import { getCandidateProfile } from "../../../../../lib/candidate-profile";

export const dynamic = "force-dynamic";

const FIRST_YEAR = 2000;
const GOOGLE_NEWS_RSS = "https://news.google.com/rss/search";

type NewsItem = {
  id: string;
  title: string;
  url: string;
  publisher: string;
  publisherUrl: string | null;
  publishedAt: string;
  year: number;
  category: "justica" | "contratos" | "atuacao" | "controversia" | "geral";
  confidence: "nome_completo" | "nome_de_urna" | "mencao_ampla";
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const candidate = await getCandidateProfile(id);
  if (!candidate) return Response.json({ error: "Candidatura não encontrada." }, { status: 404 });

  const currentYear = new Date().getUTCFullYear();
  const names = Array.from(new Set([candidate.fullName, candidate.ballotName].map((name) => name.trim()).filter(Boolean)));
  const query = names.map((name) => `"${name.replaceAll('"', "")}"`).join(" OR ");
  const years = Array.from({ length: currentYear - FIRST_YEAR + 1 }, (_, index) => FIRST_YEAR + index);

  const responses: Array<{ year: number; ok: boolean; items: NewsItem[] }> = [];
  for (let offset = 0; offset < years.length; offset += 8) {
    const batch = await Promise.all(years.slice(offset, offset + 8).map(async (year) => {
    const url = new URL(GOOGLE_NEWS_RSS);
    url.searchParams.set("q", `(${query}) after:${year}-01-01 before:${year + 1}-01-01`);
    url.searchParams.set("hl", "pt-BR");
    url.searchParams.set("gl", "BR");
    url.searchParams.set("ceid", "BR:pt-419");
    try {
      const response = await fetch(url, { headers: { Accept: "application/rss+xml, application/xml;q=0.9", "User-Agent": "ObservatorioPublico/0.1 (+private-research-index)" } });
      if (!response.ok) return { year, ok: false, items: [] as NewsItem[] };
      return { year, ok: true, items: parseRss(await response.text(), candidate.fullName, candidate.ballotName) };
    } catch {
      return { year, ok: false, items: [] as NewsItem[] };
    }
    }));
    responses.push(...batch);
  }

  const seen = new Set<string>();
  const items = responses.flatMap((response) => response.items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 15))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .filter((item) => {
      const key = normalize(`${item.title}|${item.publisher}`);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 450);

  return Response.json({
    candidate: { fullName: candidate.fullName, ballotName: candidate.ballotName, state: candidate.state },
    items,
    coverage: {
      requestedFrom: FIRST_YEAR,
      requestedTo: currentYear,
      yearsRequested: years.length,
      yearsRetrieved: responses.filter((response) => response.ok).length,
      total: items.length,
      oldest: items.at(-1)?.publishedAt ?? null,
      newest: items[0]?.publishedAt ?? null,
    },
    methodology: {
      source: "Google Notícias RSS",
      mode: "Índice experimental de títulos, datas, veículos e links; sem cópia do conteúdo das matérias.",
      warning: "Notícia é pista documental, não prova. Nome de urna pode produzir homônimos; cada vínculo precisa ser conferido na matéria original.",
      checkedAt: new Date().toISOString(),
    },
  }, { headers: { "Cache-Control": "private, max-age=900" } });
}

function parseRss(xml: string, fullName: string, ballotName: string): NewsItem[] {
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)).flatMap((match, index) => {
    const block = match[1];
    const title = field(block, "title");
    const url = field(block, "link");
    const published = field(block, "pubDate");
    const sourceMatch = block.match(/<source(?:\s+url="([^"]*)")?>([\s\S]*?)<\/source>/i);
    const publisherUrl = sourceMatch?.[1] ? safeHttpsUrl(decodeXml(sourceMatch[1])) : null;
    const publisher = sourceMatch?.[2] ? cleanText(sourceMatch[2]) : "Veículo não informado";
    const date = new Date(published);
    const safeUrl = safeHttpsUrl(url);
    if (!title || !safeUrl || Number.isNaN(date.getTime())) return [];
    const cleanTitle = cleanText(title);
    return [{
      id: `${date.getTime()}-${index}-${normalize(cleanTitle).slice(0, 48)}`,
      title: cleanTitle,
      url: safeUrl,
      publisher,
      publisherUrl,
      publishedAt: date.toISOString(),
      year: date.getUTCFullYear(),
      category: classify(cleanTitle),
      confidence: confidence(cleanTitle, fullName, ballotName),
    }];
  });
}

function field(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? cleanText(match[1]) : "";
}

function cleanText(value: string) {
  return decodeXml(value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function decodeXml(value: string) {
  return value.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();
}

function confidence(title: string, fullName: string, ballotName: string): NewsItem["confidence"] {
  const normalizedTitle = normalize(title);
  if (normalizedTitle.includes(normalize(fullName))) return "nome_completo";
  if (normalizedTitle.includes(normalize(ballotName))) return "nome_de_urna";
  return "mencao_ampla";
}

function classify(title: string): NewsItem["category"] {
  const value = normalize(title);
  if (/process|inquerit|investig|policia|pris|denunci|reu|stf|stj|ministerio publico|operacao|busca e apreensao|boletim de ocorrencia/.test(value)) return "justica";
  if (/contrat|licitac|fornecedor|empresa|verba|patrimonio|despesa|cnpj/.test(value)) return "contratos";
  if (/vot|projet|camara|senado|deputad|senador|eleic|mandato|comissao/.test(value)) return "atuacao";
  if (/polemic|controvers|critic|repercuss|declaracao|fala sobre|protest|manifestacao|questionad/.test(value)) return "controversia";
  return "geral";
}

function safeHttpsUrl(value: string) {
  try { const url = new URL(value.replace(/^http:/i, "https:")); return url.protocol === "https:" ? url.toString() : null; } catch { return null; }
}
