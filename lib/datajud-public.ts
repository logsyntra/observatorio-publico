export const DATAJUD_DOCUMENTATION_URL = "https://datajud-wiki.cnj.jus.br/api-publica/";

const DATAJUD_PUBLIC_KEY = "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";
const COURT_CODES: Record<string, string> = { "01": "AC", "02": "AL", "03": "AP", "04": "AM", "05": "BA", "06": "CE", "07": "DF", "08": "ES", "09": "GO", "10": "MA", "11": "MT", "12": "MS", "13": "MG", "14": "PA", "15": "PB", "16": "PR", "17": "PE", "18": "PI", "19": "RJ", "20": "RN", "21": "RS", "22": "RO", "23": "RR", "24": "SC", "25": "SE", "26": "SP", "27": "TO" };

export type DataJudEndpoint = { label: string; url: string };
export type PublicDataJudRecord = {
  tribunal: string;
  number: string;
  formattedNumber: string;
  filedAt: string | null;
  grade: string | null;
  class: { codigo?: number; nome?: string } | null;
  subjects: Array<{ codigo?: number; nome?: string }>;
  courtUnit: { codigo?: number; nome?: string } | null;
  updatedAt: string | null;
  movements: Array<{ codigo?: number; nome?: string; dataHora?: string }>;
  movementTotal: number;
  movementsTruncated: boolean;
};

type DataJudSource = {
  tribunal?: string;
  numeroProcesso?: string;
  dataAjuizamento?: string;
  grau?: string;
  classe?: { codigo?: number; nome?: string };
  assuntos?: Array<{ codigo?: number; nome?: string }>;
  orgaoJulgador?: { codigo?: number; nome?: string };
  movimentos?: Array<{ codigo?: number; nome?: string; dataHora?: string }>;
  "@timestamp"?: string;
};

export async function queryPublicDataJud(number: string, endpoint: DataJudEndpoint): Promise<PublicDataJudRecord[]> {
  const response = await fetch(endpoint.url, {
    method: "POST",
    headers: { Authorization: `APIKey ${DATAJUD_PUBLIC_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ size: 5, query: { match: { numeroProcesso: number } } }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`DataJud respondeu ${response.status}`);

  const payload = await response.json() as { hits?: { hits?: Array<{ _source?: DataJudSource }> } };
  return (payload.hits?.hits ?? []).map(({ _source = {} }) => {
    const movements = (_source.movimentos ?? []).sort((a, b) => String(b.dataHora ?? "").localeCompare(String(a.dataHora ?? "")));
    return ({
    tribunal: _source.tribunal ?? endpoint.label,
    number: _source.numeroProcesso ?? number,
    formattedNumber: formatCnjNumber(_source.numeroProcesso ?? number),
    filedAt: _source.dataAjuizamento ?? null,
    grade: _source.grau ?? null,
    class: _source.classe ?? null,
    subjects: (_source.assuntos ?? []).slice(0, 8),
    courtUnit: _source.orgaoJulgador ?? null,
    updatedAt: _source["@timestamp"] ?? null,
    movements: movements.slice(0, 200),
    movementTotal: movements.length,
    movementsTruncated: movements.length > 200,
  });
  });
}

export function electoralDataJudEndpoint(state: string, office: string): DataJudEndpoint | null {
  if (state === "BR" || /PRESIDENTE/.test(office)) return { label: "Tribunal Superior Eleitoral", url: dataJudUrl("tse") };
  if (!Object.values(COURT_CODES).includes(state)) return null;
  return { label: `Tribunal Regional Eleitoral — ${state}`, url: dataJudUrl(`tre-${state === "DF" ? "dft" : state.toLowerCase()}`) };
}

export function endpointFromCnjNumber(number: string): DataJudEndpoint | null {
  const digits = number.replace(/\D/g, "");
  if (digits.length !== 20) return null;
  const branch = digits[13];
  const courtCode = digits.slice(14, 16);
  const region = Number(courtCode);
  const state = COURT_CODES[courtCode];

  if (branch === "3") return { label: "Superior Tribunal de Justiça", url: dataJudUrl("stj") };
  if (branch === "4" && region >= 1 && region <= 6) return { label: `Tribunal Regional Federal da ${region}ª Região`, url: dataJudUrl(`trf${region}`) };
  if (branch === "5" && region >= 1 && region <= 24) return { label: `Tribunal Regional do Trabalho da ${region}ª Região`, url: dataJudUrl(`trt${region}`) };
  if (branch === "6" && courtCode === "00") return { label: "Tribunal Superior Eleitoral", url: dataJudUrl("tse") };
  if (branch === "6" && state) return { label: `Tribunal Regional Eleitoral — ${state}`, url: dataJudUrl(`tre-${state === "DF" ? "dft" : state.toLowerCase()}`) };
  if (branch === "8" && state) return { label: state === "DF" ? "Tribunal de Justiça do Distrito Federal e Territórios" : `Tribunal de Justiça — ${state}`, url: dataJudUrl(state === "DF" ? "tjdft" : `tj${state.toLowerCase()}`) };
  if (branch === "9") return { label: "Superior Tribunal Militar", url: dataJudUrl("stm") };
  if (branch === "7" && ["MG", "RS", "SP"].includes(state ?? "")) return { label: `Tribunal de Justiça Militar — ${state}`, url: dataJudUrl(`tjm${state.toLowerCase()}`) };
  return null;
}

export function formatCnjNumber(number: string) {
  const digits = number.replace(/\D/g, "");
  if (digits.length !== 20) return number || "Não informado";
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`;
}

function dataJudUrl(alias: string) {
  return `https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`;
}
