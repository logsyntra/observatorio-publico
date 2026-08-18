import type { CandidateProfile } from "./candidate-profile";

const DIVULGA_BASE = "https://divulgacandcontas.tse.jus.br/divulga/rest";
export const TSE_ELECTION_CODE_2026 = "20322002026";

type RawFile = { idArquivo?: number; nome?: string; url?: string; tipo?: string; codTipo?: string };
type RawFormalRelation = {
  sq_CANDIDATO?: number | string;
  nm_CANDIDATO?: string;
  nm_URNA?: string;
  ds_CARGO?: string;
  sg_PARTIDO?: string;
  nm_PARTIDO?: string;
  descricaoTotalizacao?: string;
  urlFoto?: string;
};
type RawPreviousElection = {
  nrAno?: number | string;
  id?: number | string;
  nomeUrna?: string;
  nomeCandidato?: string;
  idEleicao?: number | string;
  sgUe?: string;
  local?: string;
  cargo?: string;
  partido?: string;
  situacaoTotalizacao?: string;
  nrCandidato?: number | string;
  txLink?: string;
};
type RawCandidate = {
  descricaoSituacao?: string;
  descricaoSituacaoCandidato?: string;
  dataUltimaAtualizacao?: string;
  fotoUrl?: string;
  fotoUrlPublicavel?: boolean;
  numeroProcesso?: string | null;
  numeroProcessoDrap?: string | null;
  numeroProcessoPrestContas?: string | null;
  processosCassacao?: unknown[];
  processosDesconstituicao?: unknown[];
  arquivos?: RawFile[];
  vices?: RawFormalRelation[];
  eleicoesAnteriores?: RawPreviousElection[];
};

export type TseCandidateDossier = {
  state: "found" | "unavailable";
  status: string | null;
  registrationStatus: string | null;
  updatedAt: string | null;
  photoUrl: string;
  publicProfileUrl: string;
  processes: Array<{ kind: "registration" | "drap" | "accounts" | "cassation" | "disconstitution"; label: string; number: string }>;
  certificates: Array<{ id: number; name: string; category: string; documentUrl: string }>;
  counts: { cassation: number; disconstitution: number };
  formalRelations: Array<{
    candidateId: string;
    fullName: string;
    ballotName: string;
    role: string;
    partyAcronym: string;
    partyName: string;
    status: string | null;
    photoUrl: string | null;
    evidenceLabel: string;
  }>;
  previousElections: Array<{
    year: number;
    candidateId: string;
    electionId: string;
    electoralUnit: string;
    location: string;
    office: string;
    partyAcronym: string;
    candidateNumber: string;
    result: string;
    sourceUrl: string | null;
  }>;
};

export function tseCandidatePhotoUrl(candidate: Pick<CandidateProfile, "sourceRecordId" | "state">) {
  return `${DIVULGA_BASE}/arquivo/img/${TSE_ELECTION_CODE_2026}/${candidate.sourceRecordId}/${candidate.state}`;
}

export function tseCandidatePublicUrl(candidate: Pick<CandidateProfile, "sourceRecordId" | "state">) {
  return `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/${regionFor(candidate.state)}/${candidate.state}/${TSE_ELECTION_CODE_2026}/${candidate.sourceRecordId}/2026/${candidate.state}`;
}

export async function fetchTseCandidateDossier(candidate: CandidateProfile): Promise<TseCandidateDossier> {
  const endpoint = `${DIVULGA_BASE}/v1/candidatura/buscar/2026/${candidate.state}/${TSE_ELECTION_CODE_2026}/candidato/${candidate.sourceRecordId}`;
  const response = await fetch(endpoint, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error(`DivulgaCand respondeu ${response.status}`);
  const source = await response.json() as RawCandidate;

  const processes: TseCandidateDossier["processes"] = [];
  addProcess(processes, "registration", "Registro individual da candidatura", source.numeroProcesso ?? candidate.registrationProcessNumber);
  addProcess(processes, "drap", "DRAP do partido, federação ou coligação", source.numeroProcessoDrap);
  addProcess(processes, "accounts", "Prestação de contas eleitoral", source.numeroProcessoPrestContas);
  for (const number of extractProcessNumbers(source.processosCassacao)) addProcess(processes, "cassation", "Processo de cassação informado pelo TSE", number);
  for (const number of extractProcessNumbers(source.processosDesconstituicao)) addProcess(processes, "disconstitution", "Processo de desconstituição informado pelo TSE", number);

  const certificates = (source.arquivos ?? [])
    .filter((file) => file.idArquivo && file.url?.includes(`/candidatos/${candidate.sourceRecordId}/`) && ["11", "12", "13", "14", "15"].includes(String(file.codTipo)))
    .map((file) => ({
      id: Number(file.idArquivo),
      name: cleanFileName(file.nome ?? "Certidão apresentada"),
      category: certificateCategory(String(file.codTipo)),
      documentUrl: `${DIVULGA_BASE}/arquivo/doc/${file.idArquivo}`,
    }));

  const formalRelations = (source.vices ?? []).flatMap((relation) => {
    const candidateId = String(relation.sq_CANDIDATO ?? "").replace(/\D/g, "");
    const fullName = String(relation.nm_CANDIDATO ?? "").trim();
    if (!candidateId || !fullName) return [];
    return [{
      candidateId,
      fullName,
      ballotName: String(relation.nm_URNA ?? fullName).trim(),
      role: String(relation.ds_CARGO ?? "Integrante da chapa").trim(),
      partyAcronym: String(relation.sg_PARTIDO ?? "").trim(),
      partyName: String(relation.nm_PARTIDO ?? "").trim(),
      status: relation.descricaoTotalizacao ? String(relation.descricaoTotalizacao) : null,
      photoUrl: safeTseUrl(relation.urlFoto),
      evidenceLabel: "Composição formal da chapa publicada pelo TSE",
    }];
  });

  const previousElections = (source.eleicoesAnteriores ?? []).flatMap((election) => {
    const year = Number(election.nrAno);
    const candidateId = String(election.id ?? "").replace(/\D/g, "");
    const electionId = String(election.idEleicao ?? "").replace(/\D/g, "");
    if (!Number.isInteger(year) || !candidateId || !electionId) return [];
    return [{
      year,
      candidateId,
      electionId,
      electoralUnit: String(election.sgUe ?? "").trim(),
      location: String(election.local ?? "").trim(),
      office: String(election.cargo ?? "Cargo não informado").trim(),
      partyAcronym: String(election.partido ?? "").trim(),
      candidateNumber: String(election.nrCandidato ?? "").trim(),
      result: String(election.situacaoTotalizacao ?? "Situação não informada").trim(),
      sourceUrl: safeTseUrl(election.txLink),
    }];
  }).sort((a, b) => b.year - a.year);

  return {
    state: "found",
    status: source.descricaoSituacao ?? null,
    registrationStatus: source.descricaoSituacaoCandidato ?? null,
    updatedAt: source.dataUltimaAtualizacao ?? null,
    photoUrl: source.fotoUrlPublicavel === false ? tseCandidatePhotoUrl(candidate) : safeTseUrl(source.fotoUrl) ?? tseCandidatePhotoUrl(candidate),
    publicProfileUrl: tseCandidatePublicUrl(candidate),
    processes,
    certificates,
    counts: { cassation: source.processosCassacao?.length ?? 0, disconstitution: source.processosDesconstituicao?.length ?? 0 },
    formalRelations,
    previousElections,
  };
}

function addProcess(target: TseCandidateDossier["processes"], kind: TseCandidateDossier["processes"][number]["kind"], label: string, value: string | null | undefined) {
  const number = String(value ?? "").replace(/\D/g, "");
  if (number.length === 20 && !target.some((process) => process.number === number)) target.push({ kind, label, number });
}

function extractProcessNumbers(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => typeof item === "string" || typeof item === "number" ? [String(item)] : item && typeof item === "object" ? Object.values(item as Record<string, unknown>).flatMap((field) => typeof field === "string" || typeof field === "number" ? [String(field)] : []) : []).map((number) => number.replace(/\D/g, "")).filter((number) => number.length === 20);
}

function certificateCategory(code: string) {
  return ({ "11": "Justiça Federal · 1º grau", "12": "Justiça Federal · 2º grau", "13": "Justiça Estadual/Eleitoral · 1º grau", "14": "Justiça Estadual/Eleitoral · 2º grau", "15": "Certidão eleitoral" } as Record<string, string>)[code] ?? "Certidão criminal";
}

function cleanFileName(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\d{10,}/g, "").replace(/\.pdf$/i, "").replace(/\s+/g, " ").trim();
}

function safeTseUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname.endsWith("tse.jus.br") ? url.toString() : null; } catch { return null; }
}

function regionFor(state: string) {
  if (state === "BR") return "BR";
  if (["AC", "AP", "AM", "PA", "RO", "RR", "TO"].includes(state)) return "NORTE";
  if (["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"].includes(state)) return "NORDESTE";
  if (["DF", "GO", "MT", "MS"].includes(state)) return "CENTRO-OESTE";
  if (["ES", "MG", "RJ", "SP"].includes(state)) return "SUDESTE";
  return "SUL";
}
