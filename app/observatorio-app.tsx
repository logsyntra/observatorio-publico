"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Person = {
  id: string;
  name: string;
  initials: string;
  role: string;
  region: string;
  status: string;
  mandates: number;
  votes: number;
  projects: number;
};

export type OfficialCandidate = {
  sourceRecordId: string;
  electionYear: number;
  electionName: string;
  electionDate: string;
  state: string;
  electoralUnit: string;
  office: string;
  candidateNumber: number;
  fullName: string;
  ballotName: string;
  socialName: string | null;
  partyNumber: number;
  partyAcronym: string;
  partyName: string;
  candidacyStatus: string;
  occupation: string;
  education: string;
  sourceGeneratedAt: string;
  sourceUrl: string;
  ageAtInauguration?: number | null;
  nationality?: string;
  birthCity?: string;
  isReelection?: string;
  declaresAssets?: string;
  campaignExpenseLimitCents?: number | null;
  registrationProcessNumber?: string;
  acceptedAt?: string | null;
  photoUrl?: string;
  officialProfileUrl?: string;
  officialUpdatedAt?: string | null;
  assetCount?: number;
  assetTotalCents?: number;
  socialCount?: number;
  assets?: CandidateAsset[];
  socialLinks?: SocialLink[];
  formalRelations?: FormalRelation[];
  previousElections?: PreviousElection[];
};

type CandidateAsset = { itemOrder: number; assetType: string; description: string; valueCents: number; updatedAt: string };
type SocialLink = { itemOrder: number; platform: string; rawUrl: string; url: string | null };
type FormalRelation = { candidateId: string; fullName: string; ballotName: string; role: string; partyAcronym: string; partyName: string; status: string | null; photoUrl: string | null; evidenceLabel: string };
type PublicRelation = { slug: string; fullName: string; displayName: string; entityType: "person" | "company" | "organization"; relationType: "familia" | "politica" | "profissional" | "societaria"; relationLabel: string; publicRole: string; publicFigure: boolean; candidateId: string | null; profileUrl: string | null; officialIdentifier: string | null; identifierType: "tse_candidate_id" | "cnpj" | "official_registry" | null; evidence: Array<{ title: string; publisher: string; url: string }> };
type RelationCoverage = { total: number; expandedProfiles: number; byType: Record<string, number>; sources: { formalTse: { state: string; count: number; scope: string }; reviewedGraph: { state: string; count: number; scope: string }; curatedPublicRecords: { state: string; count: number; scope: string } } };
type PreviousElection = { year: number; candidateId: string; electionId: string; electoralUnit: string; location: string; office: string; partyAcronym: string; candidateNumber: string; result: string; sourceUrl: string | null };
type FilterOption = { value: string; label?: string; count: number };
type FilterOptions = { states: FilterOption[]; offices: FilterOption[]; parties: FilterOption[]; judgments: FilterOption[] };

type SourceStatus = {
  live: boolean;
  source: null | {
    datasetUrl: string;
    importedAt: string;
    label: string;
    license: string;
    publisher: string;
    recordCount: number;
    resourceUrl: string;
    sourceUpdatedAt: string;
  };
  sources?: Array<SourceStatus["source"] & { id: string }>;
  coverage?: { candidates: number; details: number; assets: number; socialLinks: number };
};

const people: Person[] = [
  { id: "helena-duarte", name: "Helena Duarte", initials: "HD", role: "Deputada federal", region: "SP", status: "Em exercício", mandates: 3, votes: 428, projects: 7 },
  { id: "marcos-tavares", name: "Marcos Tavares", initials: "MT", role: "Senador", region: "MG", status: "Em exercício", mandates: 2, votes: 312, projects: 11 },
  { id: "lucia-monteiro", name: "Lúcia Monteiro", initials: "LM", role: "Candidata a deputada federal", region: "BA", status: "Candidatura registrada", mandates: 0, votes: 0, projects: 0 },
];

const tabs = [
  ["resumo", "Resumo"],
  ["atuacao", "Atuação"],
  ["noticias", "Notícias"],
  ["rede", "Rede de relações"],
  ["recursos", "Bens, empresas e contratos"],
  ["ocorrencias", "Justiça e investigações"],
  ["evidencias", "Evidências"],
] as const;

function initialsFor(value: string) {
  return value.split(/\s+/).map((part) => part.match(/[\p{L}\p{N}]/u)?.[0] ?? "").filter(Boolean).slice(0, 2).join("");
}

function normalizeStatusClass(value: string) {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  if (normalized.includes("nao eleito") || normalized.includes("indefer")) return "notElected";
  if (normalized.includes("eleito")) return "elected";
  return "running";
}

function candidatePhotoUrl(candidate: Pick<OfficialCandidate, "sourceRecordId" | "state" | "photoUrl">) {
  return candidate.photoUrl ?? `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/20322002026/${candidate.sourceRecordId}/${candidate.state}`;
}

function CandidatePhoto({ candidate, className = "" }: { candidate: OfficialCandidate; className?: string }) {
  return <span className={`candidatePhoto ${className}`}><span aria-hidden="true">{initialsFor(candidate.ballotName)}</span><Image src={candidatePhotoUrl(candidate)} alt={`Foto oficial de ${candidate.ballotName}`} width={96} height={96} unoptimized loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /></span>;
}

function formatBRL(cents = 0) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatBRLFromReais(value = 0) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const relations = [
  { id: "assessora", initials: "AS", name: "Ana Siqueira", type: "Assessora parlamentar", period: "2023 — atual", evidence: "Ato de nomeação e cadastro funcional", confidence: "Confirmado" },
  { id: "familiar", initials: "RD", name: "Rafael Duarte", type: "Familiar e sócio histórico", period: "2014 — 2019", evidence: "Quadro societário e declaração eleitoral", confidence: "Revisado" },
  { id: "empresa", initials: "VP", name: "Verde Ponte Serviços", type: "Empresa relacionada", period: "2014 — 2019", evidence: "CNPJ e quadro de sócios", confidence: "Confirmado" },
  { id: "fornecedor", initials: "NC", name: "Norte Comunicação", type: "Fornecedor de campanha", period: "Eleição 2022", evidence: "Prestação de contas eleitoral", confidence: "Confirmado" },
  { id: "partido", initials: "OP", name: "Organização partidária", type: "Filiação institucional", period: "2021 — atual", evidence: "Registro eleitoral", confidence: "Confirmado" },
];

const judicialRecords = [
  {
    id: "inq-001", category: "inquerito", type: "Inquérito policial", number: "IPL 000/2026 — demonstrativo", role: "Investigada", status: "Em andamento", tone: "active",
    authority: "Unidade policial fictícia", jurisdiction: "Federal · demonstração", stage: "Diligências", secrecy: "Somente atos tornados públicos", updatedAt: "12 ago. 2026",
    summary: "Procedimento fictício usado para demonstrar a separação entre investigação, acusação formal e julgamento.",
    meaning: "A condição de investigada informa apenas que a pessoa é objeto de apuração. Não existe acusação recebida ou conclusão de culpa neste registro.",
    events: [["02 fev. 2026", "Instauração", "A autoridade registrou a abertura do procedimento."], ["18 abr. 2026", "Diligência pública", "Movimentação descrita em documento público fictício."], ["12 ago. 2026", "Prorrogação", "Prazo prorrogado; investigação permanece sem conclusão."]],
    documents: [["Portaria de instauração", "Documento público simulado"], ["Decisão de prorrogação", "Registro judicial simulado"]],
  },
  {
    id: "bo-001", category: "bo", type: "Boletim de ocorrência", number: "B.O. 000000/2025 — demonstrativo", role: "Pessoa mencionada", status: "Sem imputação registrada", tone: "neutral",
    authority: "Polícia Civil fictícia", jurisdiction: "Estadual · demonstração", stage: "Registro inicial", secrecy: "Acesso público pertinente", updatedAt: "03 nov. 2025",
    summary: "Registro fictício em que o nome aparece na narrativa, sem indicação de autoria, indiciamento ou investigação confirmada.",
    meaning: "Ser mencionado em um B.O. não significa ser suspeito, investigado ou autor do fato. Um boletim registra a narrativa apresentada à autoridade.",
    events: [["03 nov. 2025", "Registro", "Narrativa apresentada à autoridade policial."], ["03 nov. 2025", "Classificação", "Pessoa identificada apenas como mencionada."]],
    documents: [["Extrato público do registro", "Documento simulado e redigido"]],
  },
  {
    id: "proc-001", category: "processo", type: "Processo judicial", number: "0000000-00.2024.0.00.0000", role: "Ré", status: "Absolvição definitiva", tone: "favorable",
    authority: "Tribunal fictício", jurisdiction: "2ª instância · demonstração", stage: "Baixado definitivamente", secrecy: "Público", updatedAt: "21 jun. 2026",
    summary: "Processo fictício concluído com absolvição, preservado para mostrar que o desfecho favorável recebe o mesmo destaque da acusação.",
    meaning: "Ré é a pessoa contra quem uma acusação foi recebida pelo Judiciário. Neste exemplo, o processo terminou com absolvição definitiva.",
    events: [["14 mar. 2024", "Distribuição", "Processo distribuído."], ["09 set. 2025", "Sentença", "Pedido julgado improcedente."], ["21 jun. 2026", "Trânsito em julgado", "Absolvição tornou-se definitiva e o processo foi baixado."]],
    documents: [["Sentença", "Inteiro teor simulado"], ["Certidão de trânsito", "Registro processual simulado"]],
  },
  {
    id: "inv-001", category: "investigacao", type: "Investigação administrativa", number: "PA 000/2025 — demonstrativo", role: "Interessada", status: "Arquivada", tone: "archived",
    authority: "Órgão de controle fictício", jurisdiction: "Administrativa · demonstração", stage: "Encerrado sem sanção", secrecy: "Público", updatedAt: "10 mar. 2026",
    summary: "Apuração administrativa fictícia encerrada sem aplicação de penalidade.",
    meaning: "Interessada é uma categoria processual ampla. Não equivale automaticamente a investigada, acusada ou sancionada.",
    events: [["07 mai. 2025", "Abertura", "Procedimento administrativo instaurado."], ["18 fev. 2026", "Parecer", "Área técnica recomendou arquivamento."], ["10 mar. 2026", "Arquivamento", "Procedimento encerrado sem sanção."]],
    documents: [["Decisão de arquivamento", "Documento administrativo simulado"]],
  },
  {
    id: "men-001", category: "mencao", type: "Citação ou menção documental", number: "DOC 000/2026 — demonstrativo", role: "Mencionada por terceiro", status: "Sem participação atribuída", tone: "neutral",
    authority: "Comissão parlamentar fictícia", jurisdiction: "Documento público · demonstração", stage: "Menção catalogada", secrecy: "Público", updatedAt: "28 jul. 2026",
    summary: "O nome aparece em depoimento de terceiro. O documento não atribui conduta, participação ou responsabilidade.",
    meaning: "Menção textual não cria vínculo factual por si só. O sistema mostra autor da fala, contexto e eventual confirmação independente.",
    events: [["28 jul. 2026", "Publicação", "Transcrição pública disponibilizada."], ["28 jul. 2026", "Classificação editorial", "Menção classificada como sem imputação."]],
    documents: [["Trecho contextualizado", "Transcrição pública simulada"]],
  },
  {
    id: "caut-001", category: "prisao", type: "Prisão ou medida cautelar", number: "MC 000/2023 — demonstrativo", role: "Alvo de ordem cautelar", status: "Ordem revogada", tone: "favorable",
    authority: "Juízo fictício", jurisdiction: "Criminal · demonstração", stage: "Medida encerrada", secrecy: "Decisão pública", updatedAt: "30 jan. 2024",
    summary: "Exemplo fictício de ordem cautelar que foi revogada. A interface preserva concessão, cumprimento, duração e revogação.",
    meaning: "Prisão cautelar não é condenação. O sistema diferencia ordem expedida, cumprimento, soltura, revogação e eventual reparação.",
    events: [["12 dez. 2023", "Ordem expedida", "Medida cautelar determinada."], ["13 dez. 2023", "Cumprimento", "Cumprimento registrado por um dia."], ["14 dez. 2023", "Soltura", "Liberdade restabelecida."], ["30 jan. 2024", "Revogação", "Ordem cautelar formalmente revogada."]],
    documents: [["Decisão cautelar", "Decisão simulada"], ["Alvará de soltura", "Documento simulado"], ["Decisão de revogação", "Decisão simulada"]],
  },
] as const;

function OfficialCandidateCard({ candidate, onOpen }: { candidate: OfficialCandidate | null; onOpen: (candidate: OfficialCandidate) => void }) {
  if (!candidate) return <aside className="profilePreview officialPreview emptyPreview" aria-label="Prévia da ficha oficial">
    <div className="officialCardTag">Base oficial TSE</div>
    <div className="personHeader"><div className="avatar officialCardPlaceholder" aria-hidden="true">TSE</div><div><span className="status officialStatus"><i /> Eleições 2026</span><h2>Pesquise uma candidatura</h2><p>A ficha aparecerá aqui com foto e dados oficiais.</p></div></div>
    <div className="facts"><div><strong>20.530</strong><span>candidaturas</span></div><div><strong>75.253</strong><span>bens</span></div><div><strong>48.127</strong><span>redes</span></div></div>
    <div className="evidenceCard"><div><span className="miniLabel">Ficha verificável</span><strong>Identidade, atuação, Justiça e notícias</strong><small>Cada informação mantém fonte, contexto e limite de cobertura.</small></div><span className="sourceSeal">Fonte<br /><b>visível</b></span></div>
    <div className="previewChecklist"><span>✓ Foto oficial</span><span>✓ Processo eleitoral</span><span>✓ Bens declarados</span></div>
  </aside>;

  return (
    <aside className="profilePreview officialPreview" aria-label={`Prévia oficial de ${candidate.ballotName}`}>
      <div className="officialCardTag">Perfil oficial</div>
      <div className="personHeader">
        <CandidatePhoto candidate={candidate} className="heroCandidatePhoto" />
        <div>
          <span className="status officialStatus"><i /> {candidate.candidacyStatus}</span>
          <h2>{candidate.ballotName}</h2>
          <p>{candidate.office} · {candidate.state} · {candidate.partyAcronym}</p>
        </div>
      </div>
      <div className="facts">
        <div><strong>{candidate.candidateNumber}</strong><span>número</span></div>
        <div><strong>{candidate.partyAcronym}</strong><span>partido</span></div>
        <div><strong>{candidate.assetCount ?? 0}</strong><span>bens declarados</span></div>
      </div>
      <div className="evidenceCard">
        <div>
          <span className="miniLabel">Registro eleitoral</span>
          <strong>{candidate.registrationProcessNumber ? "Processo de candidatura disponível" : "Ficha oficial do TSE"}</strong>
          <small>{candidate.fullName} · fonte oficial</small>
        </div>
        <span className="sourceSeal">TSE<br /><b>2026</b></span>
      </div>
      <div className="previewChecklist"><span>✓ Foto oficial</span><span>✓ {candidate.socialCount ?? 0} redes</span><span>✓ {candidate.assetCount ?? 0} bens</span></div>
      <button className="openProfile" type="button" onClick={() => onOpen(candidate)}>Abrir ficha completa <span aria-hidden="true">→</span></button>
    </aside>
  );
}

export default function ObservatorioApp({ initialCandidate = null }: { initialCandidate?: OfficialCandidate | null }) {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [selected] = useState(people[0]);
  const [selectedOfficial, setSelectedOfficial] = useState<OfficialCandidate | null>(initialCandidate);
  const [officialResults, setOfficialResults] = useState<OfficialCandidate[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [searchVersion, setSearchVersion] = useState(0);
  const [sourceStatus, setSourceStatus] = useState<SourceStatus | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ states: [], offices: [], parties: [], judgments: [] });
  const [stateFilter, setStateFilter] = useState("");
  const [officeFilter, setOfficeFilter] = useState("");
  const [partyFilter, setPartyFilter] = useState("");
  const [favorites, setFavorites] = useState<OfficialCandidate[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [comparison, setComparison] = useState<OfficialCandidate[]>([]);
  const [actionMessage, setActionMessage] = useState("");
  const [profileLoading, setProfileLoading] = useState(Boolean(initialCandidate));
  const [activeTab, setActiveTab] = useState("resumo");
  const [activeRelation, setActiveRelation] = useState(relations[0]);
  const [largeText, setLargeText] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((response) => response.json() as Promise<SourceStatus>)
      .then(setSourceStatus)
      .catch(() => setSourceStatus({ live: false, source: null }));
    fetch("/api/filters")
      .then((response) => response.json() as Promise<FilterOptions>)
      .then(setFilterOptions)
      .catch(() => undefined);

    const hydrateState = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem("observatorio:favoritos") ?? "[]");
        if (Array.isArray(saved)) setFavorites(saved.slice(0, 20));
      } catch {
        localStorage.removeItem("observatorio:favoritos");
      }

      const initialQuery = new URLSearchParams(window.location.search).get("q");
      if (initialQuery) {
        setQuery(initialQuery);
        setShowResults(true);
        if (window.location.hash === "#perfil") window.history.replaceState(null, "", `/?q=${encodeURIComponent(initialQuery)}`);
      }
    }, 0);

    const reloadRoute = () => window.location.reload();
    window.addEventListener("popstate", reloadRoute);
    return () => {
      window.clearTimeout(hydrateState);
      window.removeEventListener("popstate", reloadRoute);
    };
  }, []);

  useEffect(() => {
    if (!initialCandidate) return;
    const controller = new AbortController();
    const scrollTimer = window.setTimeout(() => document.getElementById("perfil")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    fetch(`/api/candidates/${initialCandidate.sourceRecordId}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("detail failed");
        return response.json() as Promise<{ candidate: OfficialCandidate; assets: CandidateAsset[]; socialLinks: SocialLink[] }>;
      })
      .then((payload) => setSelectedOfficial({ ...payload.candidate, assets: payload.assets, socialLinks: payload.socialLinks }))
      .catch((error) => { if (error.name !== "AbortError") setActionMessage("O perfil básico abriu, mas os detalhes não responderam agora."); })
      .finally(() => setProfileLoading(false));
    return () => { controller.abort(); window.clearTimeout(scrollTimer); };
  }, [initialCandidate]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      const resetTimer = window.setTimeout(() => { setOfficialResults([]); setSearchState("idle"); }, 0);
      return () => window.clearTimeout(resetTimer);
    }

    const controller = new AbortController();
    const delay = window.setTimeout(() => {
      setSearchState("loading");
      const params = new URLSearchParams({ q: trimmed, limit: "20" });
      if (stateFilter) params.set("uf", stateFilter);
      if (officeFilter) params.set("office", officeFilter);
      if (partyFilter) params.set("party", partyFilter);
      fetch(`/api/candidates?${params.toString()}`, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error("search failed");
          return response.json() as Promise<{ candidates: OfficialCandidate[] }>;
        })
        .then((payload) => {
          setOfficialResults(payload.candidates);
          setSearchState("ready");
        })
        .catch((error) => {
          if (error.name !== "AbortError") setSearchState("error");
        });
    }, searchVersion ? 0 : 320);

    return () => {
      window.clearTimeout(delay);
      controller.abort();
    };
  }, [query, searchVersion, stateFilter, officeFilter, partyFilter]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setShowResults(true);
    setSearchVersion((value) => value + 1);
  }

  async function loadOfficialProfile(candidate: OfficialCandidate, updateUrl: boolean) {
    setSelectedOfficial(candidate);
    setProfileLoading(true);
    setActiveTab("resumo");
    setShowResults(false);
    if (updateUrl) window.history.pushState(null, "", `/candidato/${candidate.sourceRecordId}`);
    window.setTimeout(() => document.getElementById("perfil")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    try {
      const response = await fetch(`/api/candidates/${candidate.sourceRecordId}`);
      if (!response.ok) throw new Error("detail failed");
      const payload = await response.json() as { candidate: OfficialCandidate; assets: CandidateAsset[]; socialLinks: SocialLink[] };
      setSelectedOfficial({ ...payload.candidate, assets: payload.assets, socialLinks: payload.socialLinks });
    } catch {
      setActionMessage("O perfil básico abriu, mas os detalhes não responderam agora.");
    } finally {
      setProfileLoading(false);
    }
  }

  async function openOfficialProfile(candidate: OfficialCandidate) {
    await loadOfficialProfile(candidate, true);
  }

  function toggleFavorite(candidate: OfficialCandidate) {
    setFavorites((current) => {
      const exists = current.some((item) => item.sourceRecordId === candidate.sourceRecordId);
      const next = exists ? current.filter((item) => item.sourceRecordId !== candidate.sourceRecordId) : [{ ...candidate, assets: undefined, socialLinks: undefined }, ...current].slice(0, 20);
      localStorage.setItem("observatorio:favoritos", JSON.stringify(next));
      setActionMessage(exists ? "Removido dos favoritos." : "Salvo neste dispositivo.");
      return next;
    });
  }

  function toggleComparison(candidate: OfficialCandidate) {
    setComparison((current) => {
      if (current.some((item) => item.sourceRecordId === candidate.sourceRecordId)) return current.filter((item) => item.sourceRecordId !== candidate.sourceRecordId);
      if (current.length >= 3) {
        setActionMessage("A comparação aceita até 3 candidaturas.");
        return current;
      }
      setActionMessage("Candidatura adicionada à comparação.");
      return [...current, candidate];
    });
  }

  async function shareCandidate(candidate: OfficialCandidate) {
    const url = `${window.location.origin}/candidato/${candidate.sourceRecordId}`;
    if (navigator.share) await navigator.share({ title: `${candidate.ballotName} — Observatório Público`, text: `${candidate.office} · ${candidate.state} · ${candidate.partyAcronym}`, url });
    else {
      await navigator.clipboard.writeText(url);
      setActionMessage("Link copiado.");
    }
  }

  function exportCandidate(candidate: OfficialCandidate) {
    const payload = { exportedAt: new Date().toISOString(), disclaimer: "Dados eleitorais oficiais do TSE. Ausência de cobertura não significa ausência de registros.", candidate };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `observatorio-${candidate.sourceRecordId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setActionMessage("Arquivo JSON exportado.");
  }

  return (
    <main className={largeText ? "largeText" : ""}>
      <header className="topbar">
        <Link className="brand" href="/" prefetch={false} aria-label="Observatório Público — início">
          <span className="brandMark" aria-hidden="true">O</span><span>Observatório Público</span>
        </Link>
        <nav aria-label="Navegação principal">
          <a href="#como-funciona">Como funciona</a><a href="#fontes">Fontes</a>
          <button className="savedButton" type="button" aria-expanded={showSaved} onClick={() => setShowSaved((value) => !value)}>★ Favoritos <b>{favorites.length}</b></button>
          <button className="contrastButton" type="button" aria-pressed={largeText} onClick={() => setLargeText((value) => !value)}>
            {largeText ? "Texto normal" : "Aumentar texto"}
          </button>
        </nav>
      </header>

      {showSaved && <section className="savedDrawer" aria-label="Candidaturas favoritas"><div><span className="miniLabel">Salvos neste dispositivo</span><h2>Favoritos</h2></div>{favorites.length ? <div className="savedList">{favorites.map((candidate) => <button type="button" key={candidate.sourceRecordId} onClick={() => { setShowSaved(false); void openOfficialProfile(candidate); }}><span>{initialsFor(candidate.ballotName)}</span><strong>{candidate.ballotName}</strong><small>{candidate.office} · {candidate.state} · {candidate.partyAcronym}</small></button>)}</div> : <p>Nenhuma candidatura salva ainda.</p>}</section>}

      <section className="hero" id="inicio">
        <div className="heroCopy">
          <span className="eyebrow">Informação pública, organizada e verificável</span>
          <h1>A vida pública,<br /><em>documentada.</em></h1>
          <p>Pesquise e compare candidaturas oficiais de 2026. Consulte julgamento eleitoral, processo de registro, bens declarados e redes informadas ao TSE.</p>
          <form className="searchBox" role="search" onSubmit={submitSearch}>
            <label htmlFor="main-search">Quem você quer pesquisar no TSE?</label>
            <div className="searchRow">
              <span className="searchIcon" aria-hidden="true">⌕</span>
              <input id="main-search" name="q" placeholder="Digite ao menos 2 letras" autoComplete="off" value={query} onChange={(event) => { setQuery(event.target.value); setShowResults(true); }} onFocus={() => setShowResults(true)} />
              <button type="submit">Pesquisar</button>
            </div>
            <div className="advancedFilters" aria-label="Filtros da pesquisa">
              <select aria-label="Filtrar por estado" value={stateFilter} onChange={(event) => { setStateFilter(event.target.value); setShowResults(true); }}><option value="">Todos os estados</option>{filterOptions.states.map((option) => <option key={option.value} value={option.value}>{option.value} ({option.count.toLocaleString("pt-BR")})</option>)}</select>
              <select aria-label="Filtrar por cargo" value={officeFilter} onChange={(event) => { setOfficeFilter(event.target.value); setShowResults(true); }}><option value="">Todos os cargos</option>{filterOptions.offices.map((option) => <option key={option.value} value={option.value}>{option.value} ({option.count.toLocaleString("pt-BR")})</option>)}</select>
              <select aria-label="Filtrar por partido" value={partyFilter} onChange={(event) => { setPartyFilter(event.target.value); setShowResults(true); }}><option value="">Todos os partidos</option>{filterOptions.parties.map((option) => <option key={option.value} value={option.value}>{option.value} ({option.count.toLocaleString("pt-BR")})</option>)}</select>
              {(stateFilter || officeFilter || partyFilter) && <button type="button" onClick={() => { setStateFilter(""); setOfficeFilter(""); setPartyFilter(""); }}>Limpar filtros</button>}
            </div>
            {showResults && (
              <div className="searchResults" aria-live="polite">
                <div className="resultsLabel">Dados oficiais · TSE · Eleições 2026</div>
                {query.trim().length < 2 && <p className="emptyResult">Digite ao menos 2 letras para consultar a base oficial.</p>}
                {searchState === "loading" && <p className="emptyResult">Consultando {sourceStatus?.source?.recordCount?.toLocaleString("pt-BR") ?? "a base de"} candidaturas…</p>}
                {searchState === "error" && <p className="emptyResult">A fonte não respondeu agora. Tente novamente em instantes.</p>}
                {searchState === "ready" && officialResults.length > 0 && officialResults.map((candidate) => (
                  <button key={candidate.sourceRecordId} type="button" onClick={() => openOfficialProfile(candidate)}>
                    <CandidatePhoto candidate={candidate} className="resultCandidatePhoto" />
                    <span><strong>{candidate.ballotName}</strong><small>{candidate.office} · {candidate.state} · {candidate.partyAcronym} · nº {candidate.candidateNumber}{candidate.assetCount ? ` · ${candidate.assetCount} bens declarados` : ""}</small></span>
                    <i aria-hidden="true">→</i>
                  </button>
                ))}
                {searchState === "ready" && officialResults.length === 0 && <p className="emptyResult">Nenhuma candidatura oficial encontrada para esse nome.</p>}
              </div>
            )}
          </form>
          <div className="liveSourceRow"><span className={sourceStatus?.live ? "liveDot" : "liveDot pending"} />{sourceStatus?.live && sourceStatus.source ? <><strong>{sourceStatus.source.recordCount.toLocaleString("pt-BR")}</strong> candidaturas · <strong>{sourceStatus.coverage?.assets.toLocaleString("pt-BR") ?? "75.253"}</strong> bens · <strong>{sourceStatus.coverage?.socialLinks.toLocaleString("pt-BR") ?? "48.127"}</strong> redes</> : <>Conectando a base oficial do TSE…</>}</div>
          <div className="trustRow" aria-label="Compromissos do produto">
            <span><i aria-hidden="true">✓</i> Fontes oficiais</span><span><i aria-hidden="true">✓</i> Sem recomendação de voto</span><span><i aria-hidden="true">✓</i> Direito à correção</span>
          </div>
        </div>
        <OfficialCandidateCard candidate={selectedOfficial ?? officialResults[0] ?? null} onOpen={(candidate) => void openOfficialProfile(candidate)} />
      </section>

      <section className="principles" id="como-funciona" aria-label="Como avaliamos informações">
        <div><span>01</span><strong>Identidade confirmada</strong><p>Homônimos nunca são unidos apenas pelo nome.</p></div>
        <div><span>02</span><strong>Contexto preservado</strong><p>Alegação, investigação e condenação são estados diferentes.</p></div>
        <div><span>03</span><strong>Relações comprovadas</strong><p>Família, equipe e empresas só aparecem com relevância pública.</p></div>
      </section>

      {selectedOfficial && <section className="profileSection" id="perfil">
        {selectedOfficial ? <>
          <div className="officialBanner"><strong>Perfil oficial ativo</strong><span>Identidade, foto, bens, redes, processos eleitorais e certidões vêm de fontes públicas do TSE. Nenhum dado demonstrativo é exibido neste perfil.</span><a href={selectedOfficial.officialProfileUrl ?? selectedOfficial.sourceUrl} target="_blank" rel="noreferrer">Abrir fonte ↗</a></div>
          <div className="profileIdentity">
            <CandidatePhoto candidate={selectedOfficial} className="profileCandidatePhoto" />
            <div className="identityCopy"><span className="status officialStatus"><i /> Candidatura 2026</span><h2>{selectedOfficial.ballotName}</h2><p>{selectedOfficial.office} · {selectedOfficial.state} · {selectedOfficial.partyAcronym} · Nome completo: {selectedOfficial.fullName}</p></div>
            <div className="profileActions"><button type="button" aria-pressed={favorites.some((item) => item.sourceRecordId === selectedOfficial.sourceRecordId)} onClick={() => toggleFavorite(selectedOfficial)}>★ {favorites.some((item) => item.sourceRecordId === selectedOfficial.sourceRecordId) ? "Salvo" : "Favoritar"}</button><button type="button" aria-pressed={comparison.some((item) => item.sourceRecordId === selectedOfficial.sourceRecordId)} onClick={() => toggleComparison(selectedOfficial)}>⇄ Comparar</button><button type="button" onClick={() => void shareCandidate(selectedOfficial)}>↗ Compartilhar</button><button type="button" onClick={() => exportCandidate(selectedOfficial)}>↓ JSON</button><button type="button" onClick={() => window.print()}>Imprimir</button>{actionMessage && <small aria-live="polite">{actionMessage}</small>}</div>
          </div>

          <div className="profileStats officialStats">
            <article><span>Número</span><strong>{selectedOfficial.candidateNumber}</strong><small>urna · Eleições 2026</small></article>
            <article><span>Partido</span><strong>{selectedOfficial.partyAcronym}</strong><small>nº {selectedOfficial.partyNumber}</small></article>
            <article><span>Situação no arquivo</span><strong className="textStat">{selectedOfficial.candidacyStatus}</strong><small>como publicado pelo TSE</small></article>
            <article><span>Patrimônio declarado</span><strong className="textStat">{profileLoading ? "Carregando…" : formatBRL(selectedOfficial.assetTotalCents)}</strong><small>{selectedOfficial.assetCount ?? 0} itens na fonte</small></article>
          </div>
        </> : <>
          <div className="demoBanner"><strong>Ambiente demonstrativo</strong><span>Nomes, números e relações abaixo são fictícios. Nenhum dado representa pessoa real.</span></div>
          <div className="profileIdentity">
            <div className="largeAvatar">{selected.initials}</div>
            <div className="identityCopy"><span className="status"><i /> {selected.status}</span><h2>{selected.name}</h2><p>{selected.role} · {selected.region} · Identidade simulada</p></div>
            <div className="identityQuality"><span>Qualidade da identidade</span><strong>Alta</strong><small>3 identificadores concordantes</small></div>
          </div>

          <div className="profileStats">
            <article><span>Mandatos</span><strong>{selected.mandates}</strong><small>histórico completo</small></article>
            <article><span>Votações nominais</span><strong>{selected.votes}</strong><small>92% com objeto identificado</small></article>
            <article><span>Relações documentadas</span><strong>18</strong><small>5 tipos de vínculo</small></article>
            <article><span>Registros de Justiça</span><strong>6</strong><small>papéis e estados distintos</small></article>
          </div>
        </>}

        <div className="tabs" role="tablist" aria-label="Seções do perfil">
          {tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)}>{label}</button>)}
        </div>

        <div className="tabPanel" role="tabpanel">
          {selectedOfficial ? <OfficialProfilePanel candidate={selectedOfficial} activeTab={activeTab} loading={profileLoading} /> : <>
            {activeTab === "resumo" && <SummaryPanel />}
            {activeTab === "atuacao" && <ActivityPanel />}
            {activeTab === "noticias" && <div className="pendingCoverage"><span className="pendingIcon">i</span><span className="miniLabel">Perfil demonstrativo</span><h3>Notícias não são simuladas</h3><p>Pesquise uma candidatura oficial para abrir a linha do tempo jornalística real.</p></div>}
            {activeTab === "rede" && <NetworkPanel active={activeRelation} onSelect={setActiveRelation} />}
            {activeTab === "recursos" && <ResourcesPanel />}
            {activeTab === "ocorrencias" && <OccurrencesPanel />}
            {activeTab === "evidencias" && <EvidencePanel />}
          </>}
        </div>
      </section>}

      {comparison.length > 0 && <ComparisonTray candidates={comparison} onRemove={(id) => setComparison((current) => current.filter((candidate) => candidate.sourceRecordId !== id))} onClear={() => setComparison([])} />}

      <ProcessLookupSection />
      <SourcesSection />
      <footer><div className="brand"><span className="brandMark" aria-hidden="true">O</span><span>Observatório Público</span></div><p>Informação pública com contexto, fonte e direito à correção.</p><a href="#inicio">Voltar ao início ↑</a></footer>
    </main>
  );
}

function OfficialProfilePanel({ candidate, activeTab, loading }: { candidate: OfficialCandidate; activeTab: string; loading: boolean }) {
  const [assetQuery, setAssetQuery] = useState("");
  const assets = candidate.assets ?? [];
  const visibleAssets = assets.filter((asset) => `${asset.assetType} ${asset.description}`.toLocaleLowerCase("pt-BR").includes(assetQuery.toLocaleLowerCase("pt-BR")));

  if (activeTab === "resumo") {
    return <div className="officialSummary">
      <div className="officialRecord">
        <div className="sectionHeading"><div><span className="miniLabel">Registro eleitoral enriquecido</span><h3>Candidatura encontrada na base oficial</h3></div><span className="verifiedSeal">TSE · dados integrados</span></div>
        <dl className="officialFacts">
          <div><dt>Nome completo</dt><dd>{candidate.fullName}</dd></div>
          <div><dt>Nome de urna</dt><dd>{candidate.ballotName}</dd></div>
          {candidate.socialName && <div><dt>Nome social</dt><dd>{candidate.socialName}</dd></div>}
          <div><dt>Cargo e unidade</dt><dd>{candidate.office} · {candidate.electoralUnit}</dd></div>
          <div><dt>Partido</dt><dd>{candidate.partyName} ({candidate.partyAcronym})</dd></div>
          <div><dt>Ocupação declarada</dt><dd>{candidate.occupation}</dd></div>
          <div><dt>Escolaridade declarada</dt><dd>{candidate.education}</dd></div>
          <div><dt>Situação do julgamento</dt><dd>{candidate.candidacyStatus}</dd></div>
          <div><dt>Processo de registro</dt><dd>{candidate.registrationProcessNumber ?? "Carregando…"}</dd></div>
          <div><dt>Nacionalidade e nascimento</dt><dd>{candidate.nationality ?? "Não informado"} · {candidate.birthCity ?? "Não informado"}</dd></div>
          <div><dt>Idade na posse</dt><dd>{candidate.ageAtInauguration ? `${candidate.ageAtInauguration} anos` : "Não informado"}</dd></div>
          <div><dt>Limite de gastos da campanha</dt><dd>{candidate.campaignExpenseLimitCents != null ? formatBRL(candidate.campaignExpenseLimitCents) : "Não informado"}</dd></div>
          <div><dt>Data da eleição</dt><dd>{candidate.electionDate}</dd></div>
        </dl>
      </div>
      <aside className="coveragePanel officialCoverage"><span className="miniLabel">Cobertura atual</span><h3>O que já está funcionando</h3>
        <ul className="coverageList"><li><i>✓</i><span><strong>Identidade, foto e julgamento</strong><small>20.530 candidaturas detalhadas</small></span></li><li><i>✓</i><span><strong>Trajetória eleitoral</strong><small>{loading ? "Carregando…" : `${candidate.previousElections?.length ?? 0} eleição(ões) devolvida(s) pelo TSE`}</small></span></li><li><i>✓</i><span><strong>Bens declarados</strong><small>{loading ? "Carregando…" : `${candidate.assetCount ?? 0} itens neste perfil`}</small></span></li><li><i>✓</i><span><strong>Justiça e certidões</strong><small>TSE + consulta DataJud/CNJ + livro histórico</small></span></li><li className="partial"><i>↻</i><span><strong>Atuação por função</strong><small>Câmara, Senado e vetos presidenciais com identidade confirmada</small></span></li><li className={candidate.formalRelations?.length ? "" : "partial"}><i>{candidate.formalRelations?.length ? "✓" : "!"}</i><span><strong>Relações documentadas</strong><small>{candidate.formalRelations?.length ? `${candidate.formalRelations.length} integrante(s) formal(is) da chapa` : "Expansão por fonte e revisão de cada vínculo"}</small></span></li></ul>
        <div className="methodNote"><strong>Sem inferência automática</strong><p>Um campo ausente significa apenas que essa fonte ainda não o informou ou que o conector ainda não foi ativado.</p></div>
      </aside>
      <section className="electoralHistory">
        <div className="sectionHeading"><div><span className="miniLabel">Trajetória eleitoral oficial</span><h3>Candidaturas anteriores localizadas</h3></div><span className="verifiedSeal">{candidate.previousElections?.length ?? 0} registros TSE</span></div>
        {loading ? <p className="loadingLine">Consultando o histórico de eleições do TSE…</p> : candidate.previousElections?.length ? <ol>{candidate.previousElections.map((election) => <li key={`${election.year}-${election.electionId}-${election.candidateId}`}><time>{election.year}</time><span className="electoralHistoryLine" aria-hidden="true" /><div><strong>{election.office} · {election.location}</strong><p>{election.partyAcronym} · número {election.candidateNumber || "não informado"}</p><span className={`electionResult ${normalizeStatusClass(election.result)}`}>{election.result}</span>{election.sourceUrl && <a href={election.sourceUrl} target="_blank" rel="noreferrer">Abrir registro daquela eleição ↗</a>}</div></li>)}</ol> : <div className="emptyModule"><strong>Nenhuma eleição anterior veio neste retorno.</strong><p>O TSE não garante que esse endpoint reúna eleições anteriores à informatização da base. Ausência aqui não significa ausência de carreira eleitoral.</p></div>}
        <div className="historyLimit"><strong>Limite conhecido</strong><p>O histórico começa no registro mais antigo devolvido pelo TSE para esta identidade — não necessariamente na primeira candidatura da vida da pessoa.</p></div>
      </section>
    </div>;
  }

  if (activeTab === "recursos") {
    return <div className="officialResources"><div className="officialAssets">
      <div className="sectionHeading"><div><span className="miniLabel">Declaração de bens ao TSE</span><h3>{candidate.assetCount ?? 0} bens · {formatBRL(candidate.assetTotalCents)}</h3></div><span className="verifiedSeal">Fonte oficial</span></div>
      <div className="assetToolbar"><input aria-label="Filtrar bens declarados" placeholder="Filtrar por tipo ou descrição" value={assetQuery} onChange={(event) => setAssetQuery(event.target.value)} /><span>{visibleAssets.length} itens exibidos</span></div>
      {loading ? <p className="loadingLine">Carregando declaração patrimonial…</p> : visibleAssets.length ? <div className="assetList">{visibleAssets.map((asset) => <article key={asset.itemOrder}><span className="assetOrder">{String(asset.itemOrder).padStart(2, "0")}</span><div><strong>{asset.assetType}</strong><p>{asset.description}</p><small>Atualizado em {asset.updatedAt}</small></div><b>{formatBRL(asset.valueCents)}</b></article>)}</div> : <div className="emptyModule"><strong>Nenhum bem corresponde ao filtro.</strong><p>Limpe a pesquisa para rever a declaração completa.</p></div>}
      <div className="assetDisclaimer"><strong>Declaração, não avaliação.</strong><p>Valores e descrições são autodeclarados à Justiça Eleitoral. O Observatório soma os itens publicados, sem estimar preço de mercado.</p></div>
    </div><SupplierLinksPanel candidate={candidate} /></div>;
  }

  if (activeTab === "rede") {
    const links = candidate.socialLinks ?? [];
    const formalRelations = candidate.formalRelations ?? [];
    return <div className="officialSocial">
      <div className="sectionHeading"><div><span className="miniLabel">Vínculos documentados</span><h3>Relações políticas formais</h3></div><span className="verifiedSeal">{formalRelations.length} vínculo(s)</span></div>
      {formalRelations.length ? <div className="formalRelationGraph">
        <article className="relationPerson primary"><span>{initialsFor(candidate.ballotName)}</span><div><small>Pessoa consultada</small><strong>{candidate.ballotName}</strong><p>{candidate.office} · {candidate.partyAcronym}</p></div></article>
        <div className="relationConnector"><span>compõe chapa com</span></div>
        {formalRelations.map((relation) => <article className="relationPerson" key={relation.candidateId}>
          {relation.photoUrl ? <Image src={relation.photoUrl} alt="" width={52} height={52} unoptimized /> : <span>{initialsFor(relation.ballotName)}</span>}
          <div><small>{relation.role}</small><strong>{relation.ballotName}</strong><p>{relation.partyAcronym} · {relation.status ?? "situação não informada"}</p><em>{relation.evidenceLabel}</em></div>
        </article>)}
      </div> : <div className="emptyModule"><strong>Nenhum integrante de chapa veio neste retorno.</strong><p>Isso é comum em cargos sem vice ou suplência publicada nesta estrutura.</p></div>}
      <PublicRelationsPanel candidate={candidate} />
      <div className="socialSectionDivider"><span className="miniLabel">Endereços declarados à Justiça Eleitoral</span><h4>Redes e presença digital oficial</h4></div>
      {loading ? <p className="loadingLine">Carregando endereços declarados…</p> : links.length ? <div className="socialGrid">{links.map((link) => <article key={link.itemOrder}><span>{link.platform.slice(0, 2).toUpperCase()}</span><div><strong>{link.platform}</strong><p>{link.rawUrl}</p></div>{link.url ? <a href={link.url} target="_blank" rel="noreferrer">Abrir ↗</a> : <small>Endereço não navegável</small>}</article>)}</div> : <div className="emptyModule"><strong>Nenhuma rede declarada neste arquivo.</strong><p>Isso não significa que a pessoa não tenha presença digital.</p></div>}
      <div className="associationWarning"><strong>O grafo cresce por prova, não por proximidade presumida</strong><p>Chapa eleitoral é um vínculo formal. Familiares, assessores, fornecedores, sócios e empresas entrarão como tipos separados, cada qual com documento, período e papel — nunca apenas porque dois nomes aparecem juntos.</p></div>
    </div>;
  }

  if (activeTab === "evidencias") {
    return <div className="officialEvidence">
      <div className="sectionHeading"><div><span className="miniLabel">Livro de evidências</span><h3>Proveniência deste perfil</h3></div><span className="verifiedSeal">6 fontes oficiais</span></div>
      {[["Candidatura", "Identidade, cargo, partido e ocupação", candidate.sourceUrl], ["Complementares", "Julgamento, processo e limite de campanha", "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand_complementar/consulta_cand_complementar_2026.zip"], ["Bens", "Descrição e valores declarados", "https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_2026.zip"], ["Redes", "Endereços digitais declarados", "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/rede_social_candidato_2026.zip"], ["Foto", "Imagem oficial autorizada para divulgação", candidatePhotoUrl(candidate)], ["Certidões", "Documentos criminais apresentados ao registro", `https://cdn.tse.jus.br/estatistica/sead/odsele/certidao_criminal/certidao_criminal_2026_${candidate.state}.zip`]].map(([title, description, url]) => <article key={title}><span className="sourceInitial">TSE</span><div><strong>{title} — Eleições 2026</strong><p>{description}</p><small>Registro relacionado à candidatura {candidate.sourceRecordId}</small></div><a href={url} target="_blank" rel="noreferrer">Abrir fonte ↗</a></article>)}
      <div className="privacyNote"><strong>Minimização de dados</strong><p>CPF, título eleitoral, e-mail e data completa de nascimento não foram importados para esta busca, embora existam campos públicos no arquivo de origem. Eles não são necessários para esta etapa.</p></div>
    </div>;
  }

  if (activeTab === "ocorrencias") return <OfficialJusticePanel candidate={candidate} />;

  if (activeTab === "atuacao") return <OfficialActivityPanel candidate={candidate} />;

  if (activeTab === "noticias") return <OfficialNewsPanel candidate={candidate} />;

  const pending = ["Módulo em preparação", "Esta fonte ainda não foi conectada ao perfil oficial."];

  return <div className="pendingCoverage">
    <span className="pendingIcon" aria-hidden="true">↻</span>
    <span className="miniLabel">Cobertura transparente</span>
    <h3>{pending[0]}</h3>
    <p>{pending[1]}</p>
    <small>O sistema não preenche lacunas com notícias soltas, homônimos ou dados demonstrativos.</small>
  </div>;
}

function PublicRelationsPanel({ candidate }: { candidate: OfficialCandidate }) {
  const [relations, setRelations] = useState<PublicRelation[]>([]);
  const [coverage, setCoverage] = useState<RelationCoverage | null>(null);
  const [selectedRelationKey, setSelectedRelationKey] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [dossier, setDossier] = useState<{ items?: Array<{ id: string; title: string; url: string; publisher: string; publishedAt: string; category: string }>; categoryTotals?: Record<string, number>; officialRecords?: { justice?: string; police?: string; contracts?: string; legislative?: string }; coverage?: { state?: string; total?: number }; methodology?: { warning?: string } } | null>(null);
  const [dossierState, setDossierState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/relations/candidate/${candidate.sourceRecordId}`, { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("relations unavailable"); return response.json() as Promise<{ relations: PublicRelation[]; coverage: RelationCoverage }>; })
      .then((payload) => { setRelations(payload.relations); setCoverage(payload.coverage); setSelectedRelationKey(null); setDossier(null); setDossierState("idle"); setState("ready"); })
      .catch((error) => { if (error.name !== "AbortError") setState("error"); });
    return () => controller.abort();
  }, [candidate.sourceRecordId]);

  const selected = relations.find((item) => `${item.relationType}:${item.slug}:${item.relationLabel}` === selectedRelationKey) ?? null;
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    fetch(`/api/relations/person/${selected.slug}`, { signal: controller.signal })
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error("dossier unavailable"); return payload; })
      .then((payload) => { setDossier(payload); setDossierState("ready"); })
      .catch((error) => { if (error.name !== "AbortError") setDossierState("error"); });
    return () => controller.abort();
  }, [selected]);

  return <section className="publicRelationsSection">
    <div className="sectionHeading"><div><span className="miniLabel">Pessoas, empresas e organizações</span><h3>Vínculos públicos documentados</h3></div><span className="verifiedSeal">{relations.length} conferidos</span></div>
    {coverage && <div className="relationCoverageGrid"><article><span>TSE · chapa formal</span><strong>{coverage.sources.formalTse.count}</strong><small>{coverage.sources.formalTse.state === "active" ? "fonte ativa" : "fonte indisponível agora"}</small></article><article><span>Curadoria documental</span><strong>{coverage.sources.curatedPublicRecords.count}</strong><small>parentesco e atuação pública</small></article><article><span>Grafo revisado</span><strong>{coverage.sources.reviewedGraph.count}</strong><small>profissionais, empresas e organizações</small></article><article><span>Dossiês navegáveis</span><strong>{coverage.expandedProfiles}</strong><small>identidade pública confirmada</small></article></div>}
    {state === "loading" ? <p className="loadingLine">Carregando vínculos com evidência pública…</p> : state === "error" ? <div className="coverageNotice"><strong>Fonte de vínculos indisponível.</strong><p>Nenhuma relação foi inferida pelo sobrenome.</p></div> : relations.length ? <div className="publicRelationWorkspace">
      <div className="publicRelationList">{relations.map((relation) => { const relationKey = `${relation.relationType}:${relation.slug}:${relation.relationLabel}`; return <button type="button" key={relationKey} className={selectedRelationKey === relationKey ? "selected" : ""} onClick={() => { setSelectedRelationKey(relationKey); setDossier(null); setDossierState("loading"); }}><span>{initialsFor(relation.displayName)}</span><div><small>{relation.relationLabel} · {relation.entityType === "company" ? "empresa" : relation.entityType === "organization" ? "organização" : "pessoa"}</small><strong>{relation.displayName}</strong><p>{relation.publicRole}</p></div><i>→</i></button>; })}</div>
      {selected && <aside className="publicRelationDossier"><span className="miniLabel">Vínculo selecionado · {selected.relationLabel}</span><h4>{selected.displayName}</h4><p>{selected.publicRole}</p>
        <div className="relationEvidence"><strong>Prova do vínculo</strong>{selected.evidence.map((item) => <a href={item.url} target="_blank" rel="noreferrer" key={item.url}>{item.title}<small>{item.publisher} ↗</small></a>)}</div>
        <div className="relationActions">{selected.candidateId && <Link href={`/candidato/${selected.candidateId}`}>Abrir candidatura completa →</Link>}{selected.profileUrl && <a href={selected.profileUrl} target="_blank" rel="noreferrer">Perfil público oficial ↗</a>}</div>
        <div className="relatedCoverage"><article><span>Notícias</span><strong>{dossier?.coverage?.total ?? 0}</strong><small>índice desde 2000</small></article><article><span>Menções de Justiça</span><strong>{dossier?.categoryTotals?.justica ?? 0}</strong><small>pistas jornalísticas</small></article><article><span>Processos e inquéritos</span><strong>Por número</strong><small>identidade + papel exigidos</small></article><article><span>Contratos</span><strong>{selected.identifierType === "cnpj" ? "CNPJ confirmado" : "Por CNPJ"}</strong><small>{selected.identifierType === "cnpj" ? "conector oficial preparado" : "empresa confirmada exigida"}</small></article></div>
        <div className="relatedNews"><div><strong>Notícias, Justiça e controvérsias</strong><small>{dossier?.coverage?.total ?? 0} manchetes indexadas</small></div>{dossierState === "loading" ? <p>Consultando o índice histórico…</p> : dossierState === "error" ? <p>A fonte jornalística não respondeu agora.</p> : dossier?.coverage?.state === "relation_only" ? <p>O vínculo é público, mas o sistema não abre dossiê ampliado sem atuação pública documentada.</p> : dossier?.items?.length ? dossier.items.slice(0, 12).map((item) => <a href={item.url} target="_blank" rel="noreferrer" key={item.id}><span className={`eventType ${item.category === "atuacao" ? "legislative" : item.category === "contratos" ? "contract" : "election"}`}>{item.category}</span><strong>{item.title}</strong><small>{item.publisher} · {new Date(item.publishedAt).toLocaleDateString("pt-BR")}</small></a>) : <p>Nenhuma manchete foi atribuída com segurança neste retorno.</p>}</div>
        <div className="associationWarning"><strong>Vínculo não transfere responsabilidade</strong><p>{dossier?.methodology?.warning ?? "Atos de uma pessoa ou empresa nunca são atribuídos automaticamente à outra."}</p></div>
      </aside>}
      {!selected && <aside className="publicRelationDossier relationSelectionPrompt"><span className="miniLabel">Consulta sob demanda</span><h4>Escolha um vínculo</h4><p>As notícias e o dossiê só são carregados depois do clique. Isso acelera a ficha e evita consultas desnecessárias.</p><strong>Nenhuma relação é criada por sobrenome, coincidência de endereço ou simples menção.</strong></aside>}
    </div> : <div className="emptyModule"><strong>Nenhum vínculo adicional confirmado para esta identidade.</strong><p>A chapa formal foi consultada; parentes, assessores, sócios, empregados e empresas só entram quando há fonte pública e identidade revisada.</p></div>}
  </section>;
}

type NewsTimeline = {
  error?: string;
  items?: Array<{ id: string; title: string; url: string; publisher: string; publisherUrl?: string | null; publishedAt: string; year: number; category: "justica" | "contratos" | "atuacao" | "controversia" | "geral"; confidence: "nome_completo" | "nome_de_urna" | "mencao_ampla" }>;
  coverage?: { requestedFrom: number; requestedTo: number; yearsRequested: number; yearsRetrieved: number; total: number; oldest: string | null; newest: string | null };
  methodology?: { source: string; mode: string; warning: string; checkedAt: string };
};

function OfficialNewsPanel({ candidate }: { candidate: OfficialCandidate }) {
  const [timeline, setTimeline] = useState<NewsTimeline | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [category, setCategory] = useState("todas");
  const [confidenceFilter, setConfidenceFilter] = useState("todas");
  const [order, setOrder] = useState<"recentes" | "antigas">("recentes");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/news/candidate/${candidate.sourceRecordId}`, { signal: controller.signal })
      .then(async (response) => { const payload = await response.json() as NewsTimeline; if (!response.ok) throw new Error(payload.error ?? "news failed"); return payload; })
      .then((payload) => { setTimeline(payload); setState("ready"); })
      .catch((error) => { if (error.name !== "AbortError") setState("error"); });
    return () => controller.abort();
  }, [candidate.sourceRecordId]);

  const filtered = (timeline?.items ?? [])
    .filter((item) => category === "todas" || item.category === category)
    .filter((item) => confidenceFilter === "todas" || item.confidence === confidenceFilter)
    .sort((a, b) => order === "recentes" ? b.publishedAt.localeCompare(a.publishedAt) : a.publishedAt.localeCompare(b.publishedAt));
  const categoryLabels = { justica: "Justiça e apurações", contratos: "Empresas e contratos", atuacao: "Atuação política", controversia: "Repercussão e controvérsias", geral: "Contexto geral" };
  const confidenceLabels = { nome_completo: "nome completo no título", nome_de_urna: "nome de urna no título", mencao_ampla: "resultado amplo — revisar" };

  if (state === "loading") return <div className="pendingCoverage"><span className="pendingIcon" aria-hidden="true">↻</span><span className="miniLabel">Memória jornalística</span><h3>Montando a linha do tempo de 2000 até hoje…</h3><p>Consultamos cada ano separadamente para recuperar registros antigos e recentes, sem copiar o conteúdo das matérias.</p></div>;
  if (state === "error" || !timeline) return <div className="pendingCoverage"><span className="pendingIcon" aria-hidden="true">!</span><span className="miniLabel">Índice temporariamente indisponível</span><h3>As notícias não responderam agora</h3><p>Nenhuma manchete foi inventada ou mantida fora da fonte. Tente novamente em alguns instantes.</p></div>;

  return <div className="newsPanel">
    <div className="newsHeader"><div><span className="miniLabel">Memória pública cronológica</span><h3>Notícias antigas e recentes</h3><p>Índice de manchetes que podem mencionar {candidate.ballotName}. Abra a matéria original antes de concluir que o fato se refere à mesma pessoa.</p></div><span className="verifiedSeal">{timeline.coverage?.total ?? 0} registros</span></div>
    <div className="newsCaution"><strong>Notícia é pista, não prova.</strong><p>Uma manchete não confirma autoria, culpa, vínculo empresarial ou participação. Homônimos e nomes de urna exigem revisão; correções posteriores do veículo também importam.</p></div>
    <div className="newsStats"><article><span>Janela solicitada</span><strong>{timeline.coverage?.requestedFrom}–{timeline.coverage?.requestedTo}</strong><small>{timeline.coverage?.yearsRetrieved}/{timeline.coverage?.yearsRequested} anos responderam</small></article><article><span>Mais antiga localizada</span><strong>{timeline.coverage?.oldest ? new Date(timeline.coverage.oldest).toLocaleDateString("pt-BR") : "—"}</strong><small>não comprova início da cobertura</small></article><article><span>Mais recente localizada</span><strong>{timeline.coverage?.newest ? new Date(timeline.coverage.newest).toLocaleDateString("pt-BR") : "—"}</strong><small>atualização do agregador</small></article></div>
    <div className="newsFilters"><label>Assunto<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="todas">Todos</option><option value="justica">Justiça e apurações</option><option value="contratos">Empresas e contratos</option><option value="atuacao">Atuação política</option><option value="controversia">Repercussão e controvérsias</option><option value="geral">Contexto geral</option></select></label><label>Correspondência<select value={confidenceFilter} onChange={(event) => setConfidenceFilter(event.target.value)}><option value="todas">Todas, com alertas</option><option value="nome_completo">Nome completo no título</option><option value="nome_de_urna">Nome de urna no título</option><option value="mencao_ampla">Resultados amplos</option></select></label><label>Ordem<select value={order} onChange={(event) => setOrder(event.target.value as "recentes" | "antigas")}><option value="recentes">Mais recentes primeiro</option><option value="antigas">Mais antigas primeiro</option></select></label><span>{filtered.length} exibidas</span></div>
    {filtered.length ? <ol className="newsTimeline">{filtered.map((item) => <li key={item.id}><time>{new Date(item.publishedAt).toLocaleDateString("pt-BR")}</time><article><div className="newsBadges"><span>{categoryLabels[item.category]}</span><span className={`confidence ${item.confidence}`}>{confidenceLabels[item.confidence]}</span></div><h4><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a></h4><p>{item.publisher} · indexado por {timeline.methodology?.source}</p></article></li>)}</ol> : <div className="emptyModule"><strong>Nenhuma manchete corresponde aos filtros.</strong><p>Isso não funciona como declaração de ausência de cobertura jornalística.</p></div>}
    <div className="activityMethod"><strong>Escopo do conector experimental</strong><p>{timeline.methodology?.mode} A disponibilidade varia por ano, veículo e indexação; este índice não substitui busca em hemerotecas nem fontes oficiais.</p><small>Consulta em {timeline.methodology?.checkedAt ? new Date(timeline.methodology.checkedAt).toLocaleString("pt-BR") : "data não informada"}.</small></div>
  </div>;
}

type ChamberActivity = {
  error?: string;
  partial?: boolean;
  match?: { state: "matched" | "no_current_match" | "review_required"; method: string; explanation?: string; checkedAt: string };
  candidate?: { fullName: string; ballotName: string; state: string; partyAcronym: string };
  deputy?: { id: number; civilName: string; parliamentaryName?: string; state?: string; party?: string; legislatureId: number; status?: string; electoralCondition?: string; statusDate?: string; photoUrl?: string; profileUrl: string };
  selectedYear?: number;
  availableYears?: number[];
  proposals?: Array<{ id: number; uri: string; siglaTipo?: string; numero?: number; ano?: number; ementa?: string; dataApresentacao?: string }>;
  speeches?: Array<{ date?: string; type?: string; phase?: string; summary?: string; keywords?: string; textUrl?: string | null; audioUrl?: string | null; videoUrl?: string | null }>;
  events?: Array<{ id?: number; startsAt?: string; status?: string; type?: string; description?: string; location?: string; organizations?: Array<{ acronym?: string; name?: string }>; recordUrl?: string | null }>;
  organizations?: Array<{ idOrgao?: number; siglaOrgao?: string; nomeOrgao?: string; titulo?: string; dataInicio?: string; dataFim?: string | null }>;
  expenses?: { loadedRecords: number; hasMore: boolean; netValue: number; years: number[]; byType: Array<{ type: string; value: number }>; recent: Array<{ date?: string; type: string; netValue: number; supplierName: string; supplierCnpj?: string | null; documentUrl?: string | null }> };
  votes?: { windowStart: string; windowEnd: string; sessionsInspected: number; sessionsWithIndividualBallots?: number; failedRequests?: number; truncated?: boolean; records: Array<{ id: string; date?: string; vote?: string; description?: string; approved?: number; proposal?: string; sourceUrl?: string }> };
  source?: { publisher: string; documentationUrl: string; apiUrl?: string };
};

function SupplierLinksPanel({ candidate }: { candidate: OfficialCandidate }) {
  const [activity, setActivity] = useState<ChamberActivity | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/legislative/camara/candidate/${candidate.sourceRecordId}`, { signal: controller.signal })
      .then(async (response) => { const payload = await response.json() as ChamberActivity; if (!response.ok) throw new Error(payload.error ?? "connector failed"); return payload; })
      .then((payload) => { setActivity(payload); setState("ready"); })
      .catch((error) => { if (error.name !== "AbortError") setState("error"); });
    return () => controller.abort();
  }, [candidate.sourceRecordId]);

  const suppliers = Array.from((activity?.expenses?.recent ?? []).reduce((map, expense) => {
    const key = expense.supplierCnpj || expense.supplierName;
    const current = map.get(key) ?? { name: expense.supplierName, cnpj: expense.supplierCnpj ?? null, value: 0, documents: 0, types: new Set<string>(), latest: expense.date ?? null, links: [] as string[] };
    current.value += expense.netValue;
    current.documents += 1;
    current.types.add(expense.type);
    if (expense.date && (!current.latest || expense.date > current.latest)) current.latest = expense.date;
    if (expense.documentUrl) current.links.push(expense.documentUrl);
    map.set(key, current);
    return map;
  }, new Map<string, { name: string; cnpj: string | null; value: number; documents: number; types: Set<string>; latest: string | null; links: string[] }>()).values()).sort((a, b) => b.value - a.value);

  return <section className="supplierPanel">
    <div className="sectionHeading"><div><span className="miniLabel">Vínculos econômicos documentados</span><h3>Pagamentos a fornecedores e contratos públicos</h3></div><span className="contextBadge">Sem inferir propriedade</span></div>
    <div className="relationshipPath"><span>{candidate.ballotName}</span><i>→</i><span>mandato confirmado</span><i>→</i><span>despesa oficial</span><i>→</i><span>fornecedor</span></div>
    {state === "loading" && <p className="loadingLine">Confirmando a identidade parlamentar e carregando documentos de despesa…</p>}
    {state === "error" && <div className="coverageNotice warning"><strong>A Câmara não respondeu agora.</strong><p>Fornecedores não serão mostrados sem o documento oficial.</p></div>}
    {state === "ready" && activity?.match?.state !== "matched" && <div className="coverageNotice"><strong>Nenhum mandato federal atual foi vinculado com segurança.</strong><p>Assim, não mostramos fornecedores da Câmara neste perfil. Isso não significa ausência de empresas, despesas ou contratos em outros períodos ou órgãos.</p></div>}
    {state === "ready" && activity?.match?.state === "matched" && (suppliers.length ? <div className="supplierList">{suppliers.map((supplier) => <article key={supplier.cnpj ?? supplier.name}><div><strong>{supplier.name}</strong><p>{Array.from(supplier.types).slice(0, 3).join(" · ")}</p><small>{supplier.cnpj ? `CNPJ ${supplier.cnpj}` : "Documento de pessoa física não exibido"} · {supplier.documents} documento(s) na amostra</small></div><div><b>{formatBRLFromReais(supplier.value)}</b><small>{supplier.latest ? `último em ${new Date(supplier.latest).toLocaleDateString("pt-BR")}` : "data não informada"}</small>{supplier.links[0] && <a href={supplier.links[0]} target="_blank" rel="noreferrer">Ver comprovante ↗</a>}</div></article>)}</div> : <div className="coverageNotice"><strong>Nenhum fornecedor apareceu na amostra carregada.</strong><p>A ausência não funciona como declaração de inexistência de despesas.</p></div>)}
    <div className="connectorGrid"><article className="live"><strong>Cota da Câmara</strong><span>Ativo</span><p>Até 20 documentos recentes desta amostra, ligados somente após nome civil completo + UF.</p></article><article><strong>Contratos federais por CNPJ</strong><span>Chave necessária</span><p>A API da CGU tem consulta por CPF/CNPJ do fornecedor; o conector aguarda credencial oficial.</p><a href="https://portaldatransparencia.gov.br/api-de-dados" target="_blank" rel="noreferrer">Documentação ↗</a></article><article><strong>PNCP</strong><span>Mapeado</span><p>A consulta pública oferece contratos por período e órgão, mas não filtro nacional direto por fornecedor.</p><a href="https://pncp.gov.br/api/consulta/swagger-ui/index.html" target="_blank" rel="noreferrer">API oficial ↗</a></article></div>
    <div className="associationWarning"><strong>Fornecedor não é empresa do político</strong><p>O pagamento documenta uma relação econômica com o mandato naquele documento. Não prova sociedade, amizade, favorecimento, ilegalidade ou contrato público. Cada uma dessas hipóteses exige evidência própria.</p></div>
  </section>;
}

type SenateActivity = {
  error?: string;
  match?: { state: "matched" | "no_current_match" | "review_required"; method: string; explanation?: string; checkedAt: string };
  senator?: { id: string; civilName?: string; parliamentaryName?: string; state?: string; party?: string; photoUrl?: string | null; profileUrl?: string | null };
  votes?: { records: Array<{ id: string; date: string; vote: string; proposal: string; description: string; outcome: string; secret: boolean; sourceUrl?: string | null }>; total: number; oldest?: string | null; newest?: string | null };
  committees?: Array<{ acronym?: string | null; name?: string | null; participation?: string | null; startedAt?: string | null; endedAt?: string | null }>;
  offices?: Array<{ role?: string | null; organization?: string | null; acronym?: string | null; startedAt?: string | null; endedAt?: string | null }>;
  affiliations?: Array<{ acronym?: string | null; name?: string | null; startedAt?: string | null; endedAt?: string | null }>;
  source?: { publisher: string; documentationUrl: string };
};

type ExecutiveActivity = {
  error?: string;
  match?: { state: "matched" | "no_presidential_mandate"; method: string; explanation?: string; checkedAt: string };
  officeholder?: { fullName: string; role: string; terms: Array<{ start: number; end: number }>; currentSourceUrl: string; historicalSourceUrl: string };
  vetoes?: Array<{ id: string; year: number; number: string; total: boolean; subject: string; summary: string; publishedAt: string; inProgress: boolean; provisions: number; vetoedProposal: string; messageUrl?: string | null; sourceUrl?: string | null }>;
  summary?: { total: number; totalVetoes: number; partialVetoes: number; oldest?: string | null; oldestYear?: number | null; newest?: string | null; yearsRequested: number; yearsRetrieved: number };
  methodology?: { attribution: string; warning: string };
  source?: { publisher: string; documentationUrl: string };
};

function OfficialActivityPanel({ candidate }: { candidate: OfficialCandidate }) {
  const normalizedName = candidate.fullName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const isConfirmedPresident = normalizedName === "LUIZ INACIO LULA DA SILVA";
  const [branch, setBranch] = useState<"loading" | "senate" | "chamber" | "none">(isConfirmedPresident ? "none" : "loading");

  useEffect(() => {
    if (isConfirmedPresident) return;
    const controller = new AbortController();
    Promise.all([
      fetch(`/api/legislative/senado/candidate/${candidate.sourceRecordId}?scope=identity`, { signal: controller.signal }).then((response) => response.json() as Promise<SenateActivity>).catch(() => null),
      fetch(`/api/legislative/camara/candidate/${candidate.sourceRecordId}?scope=identity`, { signal: controller.signal }).then((response) => response.json() as Promise<ChamberActivity>).catch(() => null),
    ]).then(([senate, chamber]) => {
      if (senate?.match?.state === "matched") setBranch("senate");
      else if (chamber?.match?.state === "matched") setBranch("chamber");
      else setBranch("none");
    });
    return () => controller.abort();
  }, [candidate.sourceRecordId, isConfirmedPresident]);

  if (isConfirmedPresident) return <ExecutiveActivityPanel candidate={candidate} />;
  if (branch === "senate") return <SenateActivityPanel candidate={candidate} />;
  if (branch === "chamber") return <ChamberActivityPanel candidate={candidate} />;
  if (branch === "loading") return <div className="pendingCoverage"><span className="pendingIcon">↻</span><span className="miniLabel">Histórico de atuação federal</span><h3>Procurando mandatos na Câmara e no Senado…</h3><p>A busca percorre legislaturas anteriores e exige nome civil completo e UF.</p></div>;
  return <div className="identityNoMatch"><div><span className="miniLabel">Atuação federal</span><h3>Nenhum mandato federal foi ligado com segurança</h3><p>Não encontramos correspondência exata no Senado atual nem nas legislaturas 48–57 da Câmara.</p></div><dl><div><dt>Nome civil do TSE</dt><dd>{candidate.fullName}</dd></div><div><dt>UF</dt><dd>{candidate.state}</dd></div><div><dt>Câmara</dt><dd>Legislaturas 48–57</dd></div><div><dt>Senado</dt><dd>Mandatos atuais</dd></div></dl><div className="associationWarning"><strong>Isso não é declaração de ausência</strong><p>A pessoa pode ter exercido mandato estadual, municipal, função executiva ou mandato federal fora do recorte disponível. Esses conectores continuam separados.</p></div></div>;
}

function SenateActivityPanel({ candidate }: { candidate: OfficialCandidate }) {
  const [activity, setActivity] = useState<SenateActivity | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [year, setYear] = useState<number | "all">("all");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/legislative/senado/candidate/${candidate.sourceRecordId}`, { signal: controller.signal })
      .then(async (response) => { const payload = await response.json() as SenateActivity; if (!response.ok) throw new Error(payload.error ?? "connector failed"); return payload; })
      .then((payload) => { setActivity(payload); setState("ready"); })
      .catch((error) => { if (error.name !== "AbortError") setState("error"); });
    return () => controller.abort();
  }, [candidate.sourceRecordId]);

  if (state === "loading") return <div className="pendingCoverage"><span className="pendingIcon">↻</span><span className="miniLabel">Senado Federal</span><h3>Confirmando identidade e carregando votos de todas as legislaturas disponíveis…</h3><p>Nome civil completo e UF precisam coincidir antes de qualquer voto ser atribuído.</p></div>;
  if (state === "error" || !activity) return <div className="pendingCoverage"><span className="pendingIcon">!</span><span className="miniLabel">Fonte oficial indisponível</span><h3>O Senado não respondeu agora</h3><p>Nenhum voto foi preenchido por estimativa.</p></div>;
  if (activity.match?.state !== "matched" || !activity.senator) return <div className="identityNoMatch"><div><span className="miniLabel">Correspondência de identidade</span><h3>Mandato atual no Senado não vinculado</h3><p>{activity.match?.explanation}</p></div><dl><div><dt>Nome civil do TSE</dt><dd>{candidate.fullName}</dd></div><div><dt>UF</dt><dd>{candidate.state}</dd></div><div><dt>Método</dt><dd>{activity.match?.method}</dd></div><div><dt>Resultado</dt><dd>Sem correspondência atual</dd></div></dl><div className="associationWarning"><strong>Ausência de vínculo atual não apaga o passado</strong><p>A consulta ainda será ampliada para ex-senadores; este retorno só impede atribuir votos de outra pessoa por homônimo.</p></div></div>;

  const years = Array.from(new Set((activity.votes?.records ?? []).map((vote) => Number(vote.date.slice(0, 4))).filter(Boolean))).sort((a, b) => b - a);
  const votes = (activity.votes?.records ?? []).filter((vote) => year === "all" || vote.date.startsWith(String(year)));
  const senator = activity.senator;
  return <div className="officialActivity">
    <div className="activityIdentity"><div><span className="verifiedPill">✓ Identidade confirmada</span><span className="miniLabel">Mandato no Senado Federal</span><h3>{senator.parliamentaryName}</h3><p>{senator.party} · {senator.state}</p></div><div className="activityIdentityActions"><label>Ano dos votos<select value={year} onChange={(event) => setYear(event.target.value === "all" ? "all" : Number(event.target.value))}><option value="all">Todos</option>{years.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>{senator.profileUrl && <a href={senator.profileUrl} target="_blank" rel="noreferrer">Abrir perfil oficial ↗</a>}</div></div>
    <div className="activityStats"><article><span>Votos nominais</span><strong>{activity.votes?.total ?? 0}</strong><small>todos devolvidos pelo endpoint</small></article><article><span>Mais antigo localizado</span><strong>{activity.votes?.oldest ? new Date(`${activity.votes.oldest}T12:00:00`).toLocaleDateString("pt-BR") : "—"}</strong><small>não comprova início do mandato</small></article><article><span>Comissões e frentes</span><strong>{activity.committees?.length ?? 0}</strong><small>históricas e atuais</small></article><article><span>Cargos internos</span><strong>{activity.offices?.length ?? 0}</strong><small>com datas disponíveis</small></article></div>
    <section className="activityBlock"><div className="sectionHeading"><div><span className="miniLabel">Votações nominais</span><h3>Como votou no Senado</h3></div><span className="verifiedSeal">{votes.length} exibidos</span></div>{votes.length ? <div className="senateVoteList">{votes.map((vote) => <article key={vote.id}><time>{vote.date ? new Date(`${vote.date}T12:00:00`).toLocaleDateString("pt-BR") : "Data não informada"}</time><span className="vote neutral">{vote.secret ? "Votação secreta" : vote.vote}</span><div><strong>{vote.proposal}</strong><p>{vote.description}</p><small>Resultado: {vote.outcome}</small>{vote.sourceUrl && <a href={vote.sourceUrl} target="_blank" rel="noreferrer">Abrir matéria ↗</a>}</div></article>)}</div> : <div className="coverageNotice"><strong>Nenhum voto neste filtro.</strong><p>Votações simbólicas não produzem posição individual.</p></div>}</section>
    <section className="activitySplit"><div className="activityBlock"><div className="sectionHeading"><div><span className="miniLabel">Participação</span><h3>Comissões e frentes</h3></div></div><div className="compactHistoryList">{(activity.committees ?? []).slice(0, 30).map((item, index) => <article key={`${item.acronym}-${item.startedAt}-${index}`}><strong>{item.acronym} · {item.participation}</strong><p>{item.name}</p><small>{item.startedAt ?? "início não informado"} — {item.endedAt ?? "atual/sem fim informado"}</small></article>)}</div></div><div className="activityBlock"><div className="sectionHeading"><div><span className="miniLabel">Trajetória partidária</span><h3>Filiações publicadas</h3></div></div><div className="compactHistoryList">{(activity.affiliations ?? []).map((item, index) => <article key={`${item.acronym}-${item.startedAt}-${index}`}><strong>{item.acronym}</strong><p>{item.name}</p><small>{item.startedAt ?? "início não informado"} — {item.endedAt ?? "atual/sem fim informado"}</small></article>)}</div></div></section>
    <div className="activityMethod"><strong>Escopo desta conexão</strong><p>Votos nominais devolvidos pela API oficial, comissões, cargos e filiações. Votação secreta pode registrar participação sem revelar “sim” ou “não”; o sistema preserva essa limitação.</p><a href={activity.source?.documentationUrl} target="_blank" rel="noreferrer">Documentação oficial ↗</a></div>
  </div>;
}

function ExecutiveActivityPanel({ candidate }: { candidate: OfficialCandidate }) {
  const [activity, setActivity] = useState<ExecutiveActivity | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [year, setYear] = useState(new Date().getFullYear());
  const [kind, setKind] = useState<"all" | "total" | "partial">("all");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/executive/presidency/candidate/${candidate.sourceRecordId}`, { signal: controller.signal })
      .then(async (response) => { const payload = await response.json() as ExecutiveActivity; if (!response.ok) throw new Error(payload.error ?? "connector failed"); return payload; })
      .then((payload) => { setActivity(payload); setState("ready"); })
      .catch((error) => { if (error.name !== "AbortError") setState("error"); });
    return () => controller.abort();
  }, [candidate.sourceRecordId]);

  if (state === "loading") return <div className="pendingCoverage"><span className="pendingIcon">↻</span><span className="miniLabel">Presidência e Congresso Nacional</span><h3>Reunindo vetos de todos os anos de mandato disponíveis…</h3><p>Cada ano é consultado separadamente na base oficial do Congresso.</p></div>;
  if (state === "error" || !activity) return <div className="pendingCoverage"><span className="pendingIcon">!</span><span className="miniLabel">Fonte oficial indisponível</span><h3>Os vetos não responderam agora</h3><p>Nenhum ato foi preenchido por estimativa.</p></div>;
  if (activity.match?.state !== "matched" || !activity.officeholder) return <div className="identityNoMatch"><div><span className="miniLabel">Correspondência de função</span><h3>Nenhum mandato presidencial foi vinculado</h3><p>{activity.match?.explanation}</p></div><div className="associationWarning"><strong>Candidato a presidente não é presidente em exercício</strong><p>Vetos pertencem ao exercício do Poder Executivo e não podem ser atribuídos a todos que concorrem ao cargo.</p></div></div>;

  const years = activity.officeholder.terms.flatMap((term) => Array.from({ length: term.end - term.start + 1 }, (_, index) => term.end - index));
  const vetoes = (activity.vetoes ?? []).filter((item) => item.year === year).filter((item) => kind === "all" || (kind === "total" ? item.total : !item.total));
  return <div className="officialActivity executiveActivity">
    <div className="activityIdentity"><div><span className="verifiedPill">✓ Mandatos confirmados</span><span className="miniLabel">Atos do Poder Executivo</span><h3>Vetos presidenciais durante os mandatos</h3><p>2003–2010 · 2023–2026</p></div><div className="activityIdentityActions"><label>Ano<select value={year} onChange={(event) => setYear(Number(event.target.value))}>{years.map((item) => <option value={item} key={item}>{item}</option>)}</select></label><a href={activity.officeholder.currentSourceUrl} target="_blank" rel="noreferrer">Confirmar mandato ↗</a></div></div>
    <div className="activityStats"><article><span>Vetos localizados</span><strong>{activity.summary?.total ?? 0}</strong><small>{activity.summary?.yearsRetrieved}/{activity.summary?.yearsRequested} anos responderam</small></article><article><span>Vetos totais</span><strong>{activity.summary?.totalVetoes ?? 0}</strong><small>projeto integral</small></article><article><span>Vetos parciais</span><strong>{activity.summary?.partialVetoes ?? 0}</strong><small>um ou mais dispositivos</small></article><article><span>Ano mais antigo localizado</span><strong>{activity.summary?.oldestYear ?? "—"}</strong><small>alguns registros antigos não trazem dia e mês</small></article></div>
    <div className="executiveFilters"><label>Tipo<select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}><option value="all">Todos</option><option value="total">Veto total</option><option value="partial">Veto parcial</option></select></label><span>{vetoes.length} registros em {year}</span></div>
    <section className="activityBlock"><div className="sectionHeading"><div><span className="miniLabel">Memória de vetos · {year}</span><h3>Objeto, alcance e mensagem oficial</h3></div><span className="verifiedSeal">Congresso Nacional</span></div>{vetoes.length ? <div className="vetoList">{vetoes.map((item) => <article key={item.id}><div><span className={`caseState ${item.inProgress ? "active" : "archived"}`}>{item.inProgress ? "em tramitação" : "tramitação encerrada"}</span><h4>VET {item.number}/{item.year} · {item.total ? "total" : "parcial"}</h4><p>{item.subject}</p></div><div><strong>{item.vetoedProposal || "Projeto não identificado"}</strong><p>{item.summary}</p><small>{item.publishedAt ? new Date(`${item.publishedAt}T12:00:00`).toLocaleDateString("pt-BR") : "data não informada"}{item.provisions ? ` · ${item.provisions} dispositivo(s)` : ""}</small><nav>{item.messageUrl && <a href={item.messageUrl} target="_blank" rel="noreferrer">Mensagem do veto ↗</a>}{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer">Tramitação ↗</a>}</nav></div></article>)}</div> : <div className="coverageNotice"><strong>Nenhum veto corresponde ao filtro.</strong><p>A ausência não comprova que não houve sanções, medidas provisórias ou outros atos executivos.</p></div>}</section>
    <div className="justiceCaution"><strong>Atribuição responsável.</strong> {activity.methodology?.warning}</div>
    <div className="activityMethod"><strong>Escopo desta conexão</strong><p>Vetos presidenciais registrados pelo Congresso nos anos de mandato confirmados. Sanções, decretos, medidas provisórias, nomeações e agendas exigem conectores próprios e aparecem como cobertura separada.</p><a href={activity.source?.documentationUrl} target="_blank" rel="noreferrer">Documentação oficial ↗</a></div>
  </div>;
}

function ChamberActivityPanel({ candidate }: { candidate: OfficialCandidate }) {
  const [activity, setActivity] = useState<ChamberActivity | null>(null);
  const [state, setState] = useState<"loading" | "identity" | "ready" | "error">("loading");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const identityResponse = await fetch(`/api/legislative/camara/candidate/${candidate.sourceRecordId}?scope=identity`, { signal: controller.signal });
        const identity = await identityResponse.json() as ChamberActivity;
        if (!identityResponse.ok) throw new Error(identity.error ?? "connector failed");
        setActivity(identity);
        setState("identity");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setState("error");
        return;
      }
      try {
        const fullResponse = await fetch(`/api/legislative/camara/candidate/${candidate.sourceRecordId}?year=${selectedYear}`, { signal: controller.signal });
        const full = await fullResponse.json() as ChamberActivity;
        if (!fullResponse.ok) throw new Error(full.error ?? "connector failed");
        setActivity(full);
        setState("ready");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setState("identity");
      }
    })();
    return () => controller.abort();
  }, [candidate.sourceRecordId, selectedYear]);

  if (state === "loading") return <div className="pendingCoverage"><span className="pendingIcon" aria-hidden="true">↻</span><span className="miniLabel">Câmara dos Deputados</span><h3>Confirmando identidade e consultando atuação…</h3><p>Nome civil completo e UF precisam coincidir antes que qualquer mandato seja ligado a este perfil.</p></div>;
  if (state === "error" || !activity) return <div className="pendingCoverage"><span className="pendingIcon" aria-hidden="true">!</span><span className="miniLabel">Fonte oficial temporariamente indisponível</span><h3>A Câmara não respondeu agora</h3><p>Nenhum dado foi preenchido por estimativa. Tente abrir esta seção novamente em alguns instantes.</p></div>;

  if (activity.match?.state !== "matched" || !activity.deputy) return <div className="identityNoMatch">
    <div><span className="miniLabel">Correspondência de identidade</span><h3>Mandato federal não vinculado</h3><p>{activity.match?.explanation}</p></div>
    <dl><div><dt>Nome civil do TSE</dt><dd>{candidate.fullName}</dd></div><div><dt>Nome de urna</dt><dd>{candidate.ballotName}</dd></div><div><dt>UF da candidatura</dt><dd>{candidate.state}</dd></div><div><dt>Método exigido</dt><dd>{activity.match?.method}</dd></div></dl>
    <div className="associationWarning"><strong>Nomes parecidos não bastam</strong><p>Este resultado não afirma que a pessoa nunca exerceu mandato. Afirma somente que nenhum registro das legislaturas consultadas foi ligado com segurança nesta consulta.</p></div>
    <a href={activity.source?.documentationUrl} target="_blank" rel="noreferrer">Consultar documentação oficial da Câmara ↗</a>
  </div>;

  const deputy = activity.deputy;
  const proposals = activity.proposals ?? [];
  const speeches = activity.speeches ?? [];
  const events = activity.events ?? [];
  const votes = activity.votes?.records ?? [];
  const expenses = activity.expenses;
  const hydrating = state === "identity";

  return <div className="officialActivity">
    <div className="activityIdentity"><div><span className="verifiedPill">✓ Identidade confirmada</span><span className="miniLabel">Mandato na Câmara dos Deputados</span><h3>{deputy.parliamentaryName}</h3><p>{deputy.party} · {deputy.state} · Legislatura {deputy.legislatureId}</p></div><div className="activityIdentityActions"><label>Ano dos registros<select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>{(activity.availableYears ?? [selectedYear]).map((year) => <option value={year} key={year}>{year}</option>)}</select></label><a href={deputy.profileUrl} target="_blank" rel="noreferrer">Abrir perfil oficial ↗</a></div></div>
    <div className="activityStats"><article><span>Situação</span><strong>{deputy.status ?? "Não informada"}</strong><small>{deputy.electoralCondition ?? "condição não informada"}</small></article><article><span>Proposições recentes</span><strong>{hydrating ? "…" : proposals.length}</strong><small>{hydrating ? "carregando registros" : "últimos registros retornados"}</small></article><article><span>Discursos em {selectedYear}</span><strong>{hydrating ? "…" : speeches.length}</strong><small>{hydrating ? "carregando registros" : "até 30 registros no ano"}</small></article><article><span>Despesas em {selectedYear} e {selectedYear - 1}</span><strong>{hydrating ? "…" : expenses ? formatBRLFromReais(expenses.netValue) : "—"}</strong><small>{hydrating ? "carregando documentos" : `${expenses?.loadedRecords ?? 0} documentos da amostra`}</small></article></div>

    {hydrating && <div className="activityProgress"><i /><div><strong>Identidade confirmada. Carregando o histórico detalhado…</strong><p>O perfil já pode ser lido enquanto votos, projetos, discursos, agenda e despesas chegam em segundo plano.</p></div></div>}
    <section className="activityBlock"><div className="sectionHeading"><div><span className="miniLabel">Produção legislativa</span><h3>Proposições mais recentes</h3></div><span className="contextBadge">Autoria oficial</span></div>{hydrating ? <p className="loadingLine">Carregando proposições oficiais…</p> : proposals.length ? <div className="proposalList">{proposals.map((item) => <article key={item.id}><time>{item.dataApresentacao ? new Date(item.dataApresentacao).toLocaleDateString("pt-BR") : "Data não informada"}</time><div><strong>{item.siglaTipo} {item.numero}{item.ano ? `/${item.ano}` : ""}</strong><p>{item.ementa || "Ementa não informada neste resumo."}</p></div><a href={item.uri} target="_blank" rel="noreferrer">API ↗</a></article>)}</div> : <div className="coverageNotice"><strong>Nenhuma proposição retornada.</strong><p>A consulta cobre somente os registros recentes devolvidos pela API.</p></div>}</section>

    <section className="activitySplit"><div className="activityBlock"><div className="sectionHeading"><div><span className="miniLabel">Votações nominais · {selectedYear}</span><h3>Como votou: sim, não, abstenção ou obstrução</h3></div></div>{hydrating ? <p className="loadingLine">Verificando votos individuais no ano escolhido…</p> : votes.length ? <><div className="voteList">{votes.map((item) => <article key={item.id}><span className="vote neutral">{item.vote}</span><div><strong>{item.proposal ?? "Votação da Câmara"}</strong><p>{item.description}</p><small>{item.date ? new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR") : "Data não informada"}</small>{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer">Registro oficial ↗</a>}</div></article>)}</div>{activity.votes?.truncated && <small className="sampleNote">Há outras sessões no ano. Esta amostra distribui {activity.votes.sessionsInspected} verificações pelos quatro trimestres e prioriza sessões com escrutínio individual; não é a totalidade dos votos.</small>}</> : <div className="coverageNotice"><strong>Nenhum voto individual nessa janela.</strong><p>Foram consultadas {activity.votes?.sessionsInspected ?? 0} votações entre {activity.votes?.windowStart} e {activity.votes?.windowEnd}. Votação simbólica ou ausência de registro individual não é convertida em voto.</p></div>}</div>
      <div className="activityBlock"><div className="sectionHeading"><div><span className="miniLabel">Cota parlamentar</span><h3>Despesas por categoria</h3></div></div>{hydrating ? <p className="loadingLine">Carregando documentos de despesa…</p> : expenses?.byType.length ? <div className="expenseBars">{expenses.byType.slice(0, 7).map((item) => <div key={item.type}><span>{item.type}</span><strong>{formatBRLFromReais(item.value)}</strong><i style={{ width: `${Math.max(4, (item.value / expenses.byType[0].value) * 100)}%` }} /></div>)}</div> : <div className="coverageNotice"><strong>Nenhuma despesa na amostra.</strong><p>Isso não funciona como declaração de ausência de gastos.</p></div>}{!hydrating && <small className="sampleNote">Amostra de até 100 documentos por ano: {expenses?.years.join(" e ")}. {expenses?.hasMore ? "Há páginas adicionais na fonte." : "Sem página adicional indicada."}</small>}</div>
    </section>

    <section className="activitySplit"><div className="activityBlock"><div className="sectionHeading"><div><span className="miniLabel">Pronunciamentos</span><h3>Discursos recentes</h3></div></div>{hydrating ? <p className="loadingLine">Carregando pronunciamentos…</p> : <div className="speechList">{speeches.slice(0, 5).map((item, index) => <article key={`${item.date}-${index}`}><time>{item.date ? new Date(item.date).toLocaleString("pt-BR") : "Data não informada"}</time><strong>{item.type ?? item.phase ?? "Discurso"}</strong><p>{item.summary ?? "Resumo não disponibilizado pela Câmara."}</p>{item.textUrl && <a href={item.textUrl} target="_blank" rel="noreferrer">Abrir registro ↗</a>}</article>)}</div>}</div>
      <div className="activityBlock"><div className="sectionHeading"><div><span className="miniLabel">Participação oficial</span><h3>Agenda dos últimos 90 dias</h3></div></div>{hydrating ? <p className="loadingLine">Carregando participação e agenda…</p> : <div className="eventList">{events.slice(0, 6).map((item) => <article key={item.id}><time>{item.startsAt ? new Date(item.startsAt).toLocaleString("pt-BR") : "Data não informada"}</time><strong>{item.type ?? "Evento"}</strong><p>{item.description}</p><small>{item.location ?? item.organizations?.map((org) => org.acronym).join(", ")}</small>{item.recordUrl && <a href={item.recordUrl} target="_blank" rel="noreferrer">Registro ↗</a>}</article>)}</div>}</div></section>

    <div className="activityMethod"><strong>Escopo desta conexão</strong><p>Legislaturas 48–57 da Câmara, histórico funcional, 20 proposições mais recentes, até 30 discursos e 21 sessões nominais por ano selecionado, distribuídas pelos quatro trimestres, eventos dos últimos 90 dias e amostra anual de despesas. Se a API indicar outra página, a limitação aparece junto do resultado.</p><a href={activity.source?.documentationUrl} target="_blank" rel="noreferrer">Documentação oficial ↗</a></div>
  </div>;
}

type JusticeRecord = { tribunal: string; formattedNumber: string; filedAt: string | null; grade: string | null; class: { codigo?: number; nome?: string } | null; subjects: Array<{ codigo?: number; nome?: string }>; courtUnit: { codigo?: number; nome?: string } | null; updatedAt: string | null; movements: Array<{ codigo?: number; nome?: string; dataHora?: string }>; movementTotal?: number; movementsTruncated?: boolean };
type HistoricalJusticeEvent = { date: string; kind: "accusation" | "decision" | "conviction" | "appeal" | "custody_start" | "custody_end" | "annulment" | "acquittal"; label: string; description: string; source: { publisher: string; url: string } };
type HistoricalJusticeCase = { id: string; title: string; caseNumber: string; category: string; court: string; role: string; currentState: "annulled" | "acquitted" | "closed" | "pending"; currentStateLabel: string; currentStateExplanation: string; events: HistoricalJusticeEvent[] };
type HistoricalJustice = { identity: { matchedName: string; rule: string }; cases: HistoricalJusticeCase[]; summary: { cases: number; annulled: number; acquitted: number; custodyPeriods: number; pending: number }; methodology: { mode: string; warning: string; reviewedAt: string } };

type JusticeLookup = {
  registration: { type: string; number: string; formattedNumber: string; role: string; status: string; acceptedAt: string | null; source: string; sourceUrl: string };
  dossier?: { state: "found" | "unavailable"; status: string | null; registrationStatus: string | null; updatedAt: string | null; photoUrl: string; publicProfileUrl: string; processes: Array<{ kind: "registration" | "drap" | "accounts" | "cassation" | "disconstitution"; label: string; number: string }>; certificates: Array<{ id: number; name: string; category: string; documentUrl: string }>; counts: { cassation: number; disconstitution: number } } | null;
  history?: HistoricalJustice | null;
  datajud: {
    state: "found" | "not_found" | "unavailable" | "error";
    tribunal?: string;
    reason?: string;
    checkedAt: string;
    documentationUrl: string;
    records?: JusticeRecord[];
    processes?: Array<{ kind: string; label: string; number: string; formattedNumber: string; state: "found" | "not_found" | "error"; records: JusticeRecord[] }>;
  };
};

function OfficialJusticePanel({ candidate }: { candidate: OfficialCandidate }) {
  const [lookup, setLookup] = useState<JusticeLookup | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  function refresh() {
    setState("loading");
    fetch(`/api/justice/candidate/${candidate.sourceRecordId}`)
      .then(async (response) => {
        const payload = await response.json() as JusticeLookup;
        if (!response.ok && payload.datajud?.state !== "error") throw new Error("lookup failed");
        return payload;
      })
      .then((payload) => { setLookup(payload); setState("ready"); })
      .catch(() => setState("error"));
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/justice/candidate/${candidate.sourceRecordId}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as JusticeLookup;
        if (!response.ok && payload.datajud?.state !== "error") throw new Error("lookup failed");
        return payload;
      })
      .then((payload) => { setLookup(payload); setState("ready"); })
      .catch((error) => { if (error.name !== "AbortError") setState("error"); });
    return () => controller.abort();
  }, [candidate.sourceRecordId]);

  const registration = lookup?.registration ?? {
    type: "Registro de candidatura",
    formattedNumber: candidate.registrationProcessNumber ?? "Carregando…",
    role: "Requerente / candidato(a)",
    status: candidate.candidacyStatus,
    acceptedAt: candidate.acceptedAt ?? null,
    source: "Tribunal Superior Eleitoral — dados abertos",
    sourceUrl: candidate.sourceUrl,
  };
  const processes = lookup?.datajud.processes ?? [];
  const certificates = lookup?.dossier?.certificates ?? [];
  const history = lookup?.history ?? null;

  return <div className="officialJustice">
    <div className="justiceHeader">
      <div><span className="miniLabel">Processos oficiais e cobertura verificável</span><h3>Justiça, investigações e decisões</h3><p>O histórico preserva acusação, condenação, prisão, absolvição e anulação como etapas diferentes. O estado atual sempre aparece primeiro.</p></div>
      <span className="verifiedSeal">TSE · CNJ · tribunais</span>
    </div>

    {state === "loading" && <div className="historicalJusticeCard"><p className="loadingLine">Conferindo o livro histórico por identidade exata…</p></div>}

    {state === "ready" && history && <section className="historicalJusticeCard">
      <div className="historyHeading"><div><span className="miniLabel">Livro histórico revisado</span><h4>{history.summary.cases} processos com identidade confirmada</h4><p>Correspondência: {history.identity.rule}. Revisão editorial em {new Date(`${history.methodology.reviewedAt}T12:00:00`).toLocaleDateString("pt-BR")}.</p></div><span className="verifiedSeal">fontes oficiais por evento</span></div>
      <div className="historyStats">
        <article><strong>{history.summary.annulled}</strong><span>com atos anulados</span></article>
        <article><strong>{history.summary.acquitted}</strong><span>com absolvição</span></article>
        <article><strong>{history.summary.custodyPeriods}</strong><span>período de prisão</span></article>
        <article><strong>{history.summary.pending}</strong><span>pendente no catálogo</span></article>
      </div>
      <div className="historicalCaseList">{history.cases.map((item) => <article className="historicalCase" key={item.id}>
        <div className="historicalCaseSummary"><div><span className={`caseState ${item.currentState === "acquitted" ? "favorable" : item.currentState === "pending" ? "active" : "archived"}`}>{item.currentStateLabel}</span><h5>{item.title}</h5><p>{item.caseNumber} · {item.category}</p></div><dl><div><dt>Papel</dt><dd>{item.role}</dd></div><div><dt>Órgãos</dt><dd>{item.court}</dd></div></dl></div>
        <div className="currentOutcome"><strong>Estado atual</strong><p>{item.currentStateExplanation}</p></div>
        <ol className="historicalTimeline">{item.events.map((event, index) => <li key={`${item.date}-${event.kind}-${index}`} className={`historyEvent ${event.kind}`}>
          <time>{new Date(`${event.date}T12:00:00`).toLocaleDateString("pt-BR")}</time><span className="historyDot" aria-hidden="true" /><div><small>{historyEventLabel(event.kind)}</small><strong>{event.label}</strong><p>{event.description}</p><a href={event.source.url} target="_blank" rel="noreferrer">{event.source.publisher} · abrir fonte oficial ↗</a></div>
        </li>)}</ol>
      </article>)}</div>
      <div className="justiceCaution"><strong>O histórico não reescreve o estado atual.</strong> Uma condenação anulada continua visível como fato processual histórico, mas nunca é exibida como condenação vigente. {history.methodology.warning}</div>
    </section>}

    {state === "ready" && !history && <div className="historyUnavailable"><strong>Livro histórico ainda não revisado para esta pessoa.</strong><p>O processo eleitoral abaixo continua disponível. A falta do catálogo histórico não significa ausência de processos, investigações ou decisões.</p></div>}

    <div className="electoralCaseCard">
      <div className="caseDetailTop"><div><span className="caseState neutral">Processo eleitoral rotineiro</span><span className="miniLabel">{registration.type}</span><h4>{registration.formattedNumber}</h4></div><a href={registration.sourceUrl} target="_blank" rel="noreferrer">Abrir fonte TSE ↗</a></div>
      <div className="caseMetadata">
        <div><span>Papel da pessoa</span><strong>{registration.role}</strong></div>
        <div><span>Situação publicada</span><strong>{registration.status}</strong></div>
        <div><span>Fonte do número</span><strong>{registration.source}</strong></div>
        <div><span>Recebido pelo TSE</span><strong>{registration.acceptedAt ? new Date(registration.acceptedAt).toLocaleString("pt-BR") : "Não informado"}</strong></div>
      </div>
      <div className="roleMeaning"><span aria-hidden="true">i</span><div><strong>O que este registro significa</strong><p>Toda candidatura passa por pedido e julgamento de registro na Justiça Eleitoral. O sistema mantém este processo separado de ações cíveis, criminais, inquéritos, B.O.s, menções e medidas cautelares.</p></div></div>
    </div>

    <div className="certificateCard">
      <div className="dataJudHeading"><div><span className="miniLabel">Documentos apresentados ao registro</span><h4>Certidões criminais publicadas pelo TSE</h4></div>{lookup?.dossier?.publicProfileUrl && <a href={lookup.dossier.publicProfileUrl} target="_blank" rel="noreferrer">Abrir DivulgaCand ↗</a>}</div>
      {state === "loading" ? <p className="loadingLine">Localizando documentos anexados à candidatura…</p> : certificates.length ? <div className="certificateList">{certificates.map((certificate) => <a key={certificate.id} href={certificate.documentUrl} target="_blank" rel="noreferrer"><span className="documentMark">PDF</span><span><strong>{certificate.category}</strong><small>{certificate.name}</small></span><i>abrir ↗</i></a>)}</div> : <div className="coverageNotice"><strong>Nenhuma certidão individual foi localizada neste retorno.</strong><p>Isso pode indicar indisponibilidade, atualização pendente ou ausência de arquivo publicável — não funciona como certidão negativa.</p></div>}
      <div className="roleMeaning"><span aria-hidden="true">i</span><div><strong>O conteúdo precisa ser lido no documento</strong><p>A presença de uma certidão não significa existência de processo ou condenação. O Observatório lista o arquivo oficial, mas não transforma automaticamente o texto do PDF em acusação ou conclusão.</p></div></div>
    </div>

    <div className="dataJudCard">
      <div className="dataJudHeading"><div><span className="miniLabel">Verificação ao vivo por números exatos</span><h4>Processos eleitorais no DataJud/CNJ</h4></div><button type="button" onClick={refresh} disabled={state === "loading"}>{state === "loading" ? "Consultando…" : "Consultar novamente"}</button></div>
      {state === "error" && <div className="coverageNotice warning"><strong>Consulta indisponível agora.</strong><p>Os documentos do TSE permanecem válidos; apenas a verificação adicional do CNJ falhou.</p></div>}
      {state === "loading" && <p className="loadingLine">Consultando registro individual, DRAP, prestação de contas e outros números informados pelo TSE…</p>}
      {state === "ready" && lookup?.datajud.state === "unavailable" && <div className="coverageNotice warning"><strong>Consulta automática não realizada.</strong><p>{lookup.datajud.reason}</p></div>}
      {state === "ready" && lookup?.datajud.state === "error" && <div className="coverageNotice warning"><strong>O CNJ não respondeu agora.</strong><p>{lookup.datajud.reason}</p></div>}
      {state === "ready" && processes.length > 0 && <div className="judicialProcessList">{processes.map((process) => <section key={`${process.kind}-${process.number}`} className="judicialProcess">
        <div className="processTitle"><div><span className={`caseState ${process.state === "found" ? "active" : "neutral"}`}>{process.state === "found" ? "Localizado no CNJ" : process.state === "error" ? "Consulta falhou" : "Não localizado no CNJ"}</span><h5>{process.label}</h5><p>{process.formattedNumber}</p></div><span className="processRecordCount">{process.records.length} {process.records.length === 1 ? "registro" : "registros"}</span></div>
        {process.records.length ? process.records.map((record, recordIndex) => <article className="dataJudRecord expanded" key={`${record.tribunal}-${record.formattedNumber}-${record.grade}-${recordIndex}`}><div><h5>{record.class?.nome ?? "Classe não informada"}</h5><p>{record.tribunal} · {record.grade ?? "grau não informado"}</p></div><dl><div><dt>Órgão julgador</dt><dd>{record.courtUnit?.nome ?? "Não informado"}</dd></div><div><dt>Ajuizamento</dt><dd>{record.filedAt ? new Date(record.filedAt).toLocaleDateString("pt-BR") : "Não informado"}</dd></div><div><dt>Assuntos</dt><dd>{record.subjects.map((subject) => subject.nome).filter(Boolean).join(", ") || "Não informados"}</dd></div><div><dt>Atualização no índice</dt><dd>{record.updatedAt ? new Date(record.updatedAt).toLocaleString("pt-BR") : "Não informada"}</dd></div></dl><div className="movementHistory"><div className="caseSectionTitle"><strong>Movimentações públicas</strong><span>{record.movementTotal ?? record.movements.length}{record.movementsTruncated ? " · exibindo 200" : ""}</span></div>{record.movements.length ? <ol>{record.movements.map((movement, movementIndex) => <li key={`${movement.codigo}-${movement.dataHora}-${movementIndex}`}><time>{movement.dataHora ? new Date(movement.dataHora).toLocaleString("pt-BR") : "Data não informada"}</time><span><i /><strong>{movement.nome ?? `Movimento ${movement.codigo ?? "sem código"}`}</strong></span></li>)}</ol> : <p>Nenhuma movimentação pública veio neste registro.</p>}</div></article>) : <div className="coverageNotice"><strong>Nenhum registro retornado para este número.</strong><p>Isso pode refletir atraso de indexação e não comprova inexistência do processo no tribunal.</p></div>}
      </section>)}</div>}
      {lookup?.datajud && <small>Última consulta: {new Date(lookup.datajud.checkedAt).toLocaleString("pt-BR")} · <a href={lookup.datajud.documentationUrl} target="_blank" rel="noreferrer">documentação oficial do CNJ ↗</a></small>}
    </div>

    <div className="justiceCoverageGrid"><article className="live"><strong>Registro e DRAP</strong><span>Ativo</span><p>Números, papéis e situação publicados pelo TSE.</p></article><article className="live"><strong>Certidões criminais</strong><span>{certificates.length} arquivo(s)</span><p>PDFs individuais apresentados à candidatura, sem interpretação automática.</p></article><article className="live"><strong>Processos eleitorais</strong><span>Consulta exata ativa</span><p>DataJud por números fornecidos pelo TSE; movimentações públicas exibidas cronologicamente.</p></article><article className={history ? "live" : ""}><strong>Inquéritos e ações históricas</strong><span>{history ? `${history.summary.cases} revisado(s)` : "Em expansão"}</span><p>Catálogo por número, papel, decisão e fonte; B.O. continua dependente de publicação oficial identificável.</p></article><article className={history?.summary.custodyPeriods ? "live" : ""}><strong>Prisões e cautelares</strong><span>{history?.summary.custodyPeriods ? `${history.summary.custodyPeriods} período documentado` : "Revisão obrigatória"}</span><p>Início, fim, fundamento e decisões posteriores ficam na mesma linha do tempo.</p></article><article className="live"><strong>Menções jornalísticas</strong><span>Aba separada</span><p>Servem como pista para documentos, nunca como processo, condenação ou prova.</p></article></div>
    <div className="justiceCaution"><strong>Cobertura não é certidão negativa.</strong> A ausência de um item nesta tela significa ausência de um registro sincronizado e atribuído com segurança, não ausência de fatos ou processos.</div>
  </div>;
}

function historyEventLabel(kind: HistoricalJusticeEvent["kind"]) {
  return ({
    accusation: "acusação / início",
    decision: "decisão",
    conviction: "condenação à época",
    appeal: "recurso",
    custody_start: "início da prisão",
    custody_end: "fim da prisão",
    annulment: "anulação",
    acquittal: "absolvição",
  } as const)[kind];
}

type ProcessLookupResponse = {
  error?: string;
  formattedNumber?: string;
  tribunal?: string;
  state?: "found" | "not_found";
  checkedAt?: string;
  documentationUrl?: string;
  records?: NonNullable<JusticeLookup["datajud"]["records"]>;
};

function ProcessLookupSection() {
  const [number, setNumber] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [result, setResult] = useState<ProcessLookupResponse | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState("loading");
    setResult(null);
    try {
      const response = await fetch(`/api/justice/process?number=${encodeURIComponent(number)}`);
      const payload = await response.json() as ProcessLookupResponse;
      setResult(payload);
      setState(response.ok ? "ready" : "error");
    } catch {
      setResult({ error: "A consulta não respondeu agora." });
      setState("error");
    }
  }

  const records = result?.records ?? [];
  return <section className="processLookupSection" id="consulta-processual">
    <div className="processLookupIntro"><span className="eyebrow">Consulta processual exata</span><h2>Tem o número CNJ?<br /><em>Confira na fonte nacional.</em></h2><p>Cole o número completo. O código identifica o ramo e o tribunal automaticamente; a busca não usa nomes e não associa o processo a nenhuma pessoa por inferência.</p></div>
    <div className="processLookupTool">
      <form onSubmit={submit} role="search"><label htmlFor="cnj-number">Número único do processo</label><div><input id="cnj-number" inputMode="numeric" placeholder="0000000-00.0000.0.00.0000" value={number} onChange={(event) => setNumber(event.target.value)} /><button type="submit" disabled={state === "loading"}>{state === "loading" ? "Consultando…" : "Consultar CNJ"}</button></div><small>Apenas processos públicos presentes na API do DataJud. A consulta não é uma certidão.</small></form>
      {state === "idle" && <div className="lookupIdle"><strong>Pesquisa segura por identificador</strong><p>A ferramenta recusa buscas nominais e números incompletos para reduzir homônimos e associações incorretas.</p></div>}
      {state === "error" && <div className="coverageNotice warning"><strong>Não foi possível concluir.</strong><p>{result?.error}</p></div>}
      {state === "ready" && result?.state === "not_found" && <div className="coverageNotice"><strong>Número não localizado no DataJud.</strong><p>Tribunal inferido: {result.tribunal}. Isso pode refletir atraso de atualização e não comprova inexistência do processo.</p></div>}
      {records.map((record) => <article className="processLookupResult" key={`${record.tribunal}-${record.formattedNumber}-${record.grade}`}><span className="caseState active">Localizado no CNJ</span><h3>{record.class?.nome ?? "Classe não informada"}</h3><p>{record.formattedNumber} · {record.tribunal}</p><dl><div><dt>Órgão julgador</dt><dd>{record.courtUnit?.nome ?? "Não informado"}</dd></div><div><dt>Grau</dt><dd>{record.grade ?? "Não informado"}</dd></div><div><dt>Ajuizamento</dt><dd>{record.filedAt ? new Date(record.filedAt).toLocaleDateString("pt-BR") : "Não informado"}</dd></div><div><dt>Movimentações públicas</dt><dd>{record.movements.length}</dd></div></dl></article>)}
      {result?.documentationUrl && <a className="lookupDocs" href={result.documentationUrl} target="_blank" rel="noreferrer">Como funciona a API Pública do DataJud ↗</a>}
    </div>
  </section>;
}

function ComparisonTray({ candidates, onRemove, onClear }: { candidates: OfficialCandidate[]; onRemove: (id: string) => void; onClear: () => void }) {
  return <section className="comparisonTray" aria-label="Comparação de candidaturas">
    <div className="comparisonHeading"><div><span className="miniLabel">Comparador objetivo</span><h2>{candidates.length === 1 ? "Adicione mais uma candidatura" : `Comparando ${candidates.length} candidaturas`}</h2></div><button type="button" onClick={onClear}>Limpar</button></div>
    <div className="comparisonTable"><div className="comparisonLabels"><strong>Nome</strong><span>Cargo / UF</span><span>Partido</span><span>Número</span><span>Julgamento</span><span>Bens declarados</span></div>{candidates.map((candidate) => <article key={candidate.sourceRecordId}><button aria-label={`Remover ${candidate.ballotName}`} type="button" onClick={() => onRemove(candidate.sourceRecordId)}>×</button><strong>{candidate.ballotName}</strong><span>{candidate.office} · {candidate.state}</span><span>{candidate.partyAcronym} · {candidate.partyName}</span><span>{candidate.candidateNumber}</span><span>{candidate.candidacyStatus}</span><span>{formatBRL(candidate.assetTotalCents)} · {candidate.assetCount ?? 0} itens</span></article>)}</div>
    <p>Comparação factual, sem nota, ranking ou recomendação de voto.</p>
  </section>;
}

function SummaryPanel() {
  return <div className="summaryGrid">
    <div className="timelinePanel"><div className="sectionHeading"><div><span className="miniLabel">Linha do tempo</span><h3>Registros recentes</h3></div><button type="button">Ver linha completa</button></div>
      <ol className="timeline">
        <li><time>17 ago. 2026</time><div><span className="eventType legislative">Atuação legislativa</span><h4>Voto nominal registrado</h4><p>Posição individual, orientação da bancada e objeto da votação reunidos no mesmo registro.</p><small>Registro ilustrativo · fonte simulada</small></div></li>
        <li><time>04 jul. 2026</time><div><span className="eventType company">Vínculo empresarial</span><h4>Atualização de quadro societário</h4><p>Uma relação histórica recebeu nova data de encerramento e foi reenviada para revisão.</p><small>Registro ilustrativo · fonte simulada</small></div></li>
        <li><time>22 mai. 2026</time><div><span className="eventType election">Eleição</span><h4>Dados eleitorais sincronizados</h4><p>Identificadores de candidatura e bens declarados foram atualizados.</p><small>Registro ilustrativo · fonte simulada</small></div></li>
      </ol>
    </div>
    <aside className="coveragePanel"><span className="miniLabel">Leitura rápida</span><h3>O que este perfil cobre</h3>
      <ul className="coverageList"><li><i>✓</i><span><strong>Trajetória eleitoral</strong><small>Candidaturas, resultados e bens</small></span></li><li><i>✓</i><span><strong>Atuação parlamentar</strong><small>Votos, projetos e comissões</small></span></li><li><i>✓</i><span><strong>Rede documentada</strong><small>Família, equipe e empresas</small></span></li><li className="partial"><i>!</i><span><strong>Processos públicos</strong><small>Cobertura varia por tribunal</small></span></li></ul>
      <div className="methodNote"><strong>Sem nota ou ranking</strong><p>O sistema organiza evidências; a interpretação permanece com o cidadão.</p></div>
    </aside>
  </div>;
}

function ActivityPanel() {
  return <div className="dataPanel"><div className="sectionHeading"><div><span className="miniLabel">Atuação parlamentar</span><h3>Votações nominais recentes</h3></div><span className="contextBadge">Dados simulados</span></div>
    <div className="tableWrap"><table><thead><tr><th>Data</th><th>Proposição e objeto</th><th>Voto</th><th>Orientação</th><th>Resultado</th></tr></thead><tbody>
      <tr><td>17/08/2026</td><td><strong>PL 000/2026</strong><small>Objeto demonstrativo de política pública</small></td><td><span className="vote yes">Sim</span></td><td>Sim</td><td>Aprovado</td></tr>
      <tr><td>02/08/2026</td><td><strong>REQ 000/2026</strong><small>Requerimento demonstrativo</small></td><td><span className="vote no">Não</span></td><td>Liberado</td><td>Rejeitado</td></tr>
      <tr><td>18/07/2026</td><td><strong>MPV 000/2026</strong><small>Destaque demonstrativo</small></td><td><span className="vote abstain">Abstenção</span></td><td>Não</td><td>Aprovado</td></tr>
    </tbody></table></div>
    <p className="panelFootnote">Uma votação só será atribuída quando o registro for nominal. Votações simbólicas receberão explicação específica.</p>
  </div>;
}

function NetworkPanel({ active, onSelect }: { active: typeof relations[number]; onSelect: (relation: typeof relations[number]) => void }) {
  return <div className="networkLayout">
    <div className="networkCanvas" aria-label="Grafo demonstrativo de relações documentadas">
      <span className="graphLine gl1" /><span className="graphLine gl2" /><span className="graphLine gl3" /><span className="graphLine gl4" /><span className="graphLine gl5" />
      <div className="centerPerson"><span>HD</span><strong>Helena<br />Duarte</strong></div>
      {relations.map((relation, index) => <button key={relation.id} className={`relationNode rn${index + 1} ${active.id === relation.id ? "active" : ""}`} type="button" onClick={() => onSelect(relation)}><span>{relation.initials}</span><small>{relation.type}</small></button>)}
      <div className="graphLegend"><span><i className="personDot" /> Pessoa</span><span><i className="companyDot" /> Empresa</span><span><i className="institutionDot" /> Instituição</span></div>
    </div>
    <aside className="relationDetail"><span className="miniLabel">Vínculo selecionado</span><h3>{active.name}</h3><p className="relationType">{active.type}</p>
      <dl><div><dt>Período conhecido</dt><dd>{active.period}</dd></div><div><dt>Evidência do vínculo</dt><dd>{active.evidence}</dd></div><div><dt>Estado da verificação</dt><dd><span className="verifiedPill">✓ {active.confidence}</span></dd></div></dl>
      <div className="associationWarning"><strong>Responsabilidade não é transferida</strong><p>Uma relação documentada não implica concordância, participação ou responsabilidade pelos atos da outra pessoa ou organização.</p></div>
      <button className="secondaryButton" type="button">Abrir evidências do vínculo</button>
    </aside>
  </div>;
}

function ResourcesPanel() {
  return <div className="cardsPanel"><div className="sectionHeading"><div><span className="miniLabel">Dinheiro público e atividade econômica</span><h3>Empresas e contratos relacionados</h3></div><span className="contextBadge">Conexões explicáveis</span></div>
    <div className="resourceCards"><article><div className="resourceIcon">PJ</div><span className="eventType company">Empresa histórica</span><h4>Verde Ponte Serviços Ltda.</h4><p>Vínculo societário demonstrativo encerrado em 2019.</p><dl><div><dt>Relação</dt><dd>Sócia-administradora</dd></div><div><dt>Período</dt><dd>2014–2019</dd></div></dl><button type="button">Ver cadeia de vínculos →</button></article>
      <article><div className="resourceIcon contractIcon">CT</div><span className="eventType contract">Contrato público</span><h4>Contrato demonstrativo 00/2025</h4><p>Ligação indireta por empresa e ex-integrante de gabinete.</p><dl><div><dt>Valor</dt><dd>R$ 480 mil</dd></div><div><dt>Órgão</dt><dd>Órgão fictício</dd></div></dl><button type="button">Ver documentos →</button></article></div>
    <div className="indicatorBox"><span>Indicador objetivo</span><p><strong>O sistema encontrou um caminho documentado de três relações.</strong> Isso sinaliza algo para leitura, não uma irregularidade.</p><code>pessoa → ex-assessor → empresa → contrato</code></div>
  </div>;
}

function OccurrencesPanel() {
  const [filter, setFilter] = useState("todos");
  const [selectedCase, setSelectedCase] = useState<(typeof judicialRecords)[number]>(judicialRecords[0]);
  const visibleRecords = filter === "todos" ? judicialRecords : judicialRecords.filter((record) => record.category === filter);

  return <div className="justicePanel">
    <div className="justiceHeader">
      <div><span className="miniLabel">Inquéritos, B.O.s, processos, investigações, citações e prisões</span><h3>Justiça e investigações</h3><p>O papel da pessoa, a fase e o desfecho aparecem separados. A existência de um registro nunca é apresentada como prova de culpa.</p></div>
      <span className="contextBadge">Dados demonstrativos</span>
    </div>

    <div className="justiceSummary" aria-label="Resumo demonstrativo por tipo de registro">
      <article><span>Inquéritos</span><strong>1</strong><small>1 em andamento</small></article>
      <article><span>B.O.s</span><strong>1</strong><small>apenas mencionado</small></article>
      <article><span>Processos</span><strong>1</strong><small>absolvido</small></article>
      <article><span>Investigações</span><strong>1</strong><small>arquivada</small></article>
      <article><span>Menções</span><strong>1</strong><small>sem imputação</small></article>
      <article><span>Prisões/cautelares</span><strong>1</strong><small>ordem revogada</small></article>
    </div>

    <div className="roleGlossary"><strong>Como ler os papéis:</strong><span>Mencionado ≠ envolvido</span><span>Investigado ≠ acusado</span><span>Réu ≠ condenado</span><span>Prisão cautelar ≠ pena</span></div>

    <div className="justiceFilters" aria-label="Filtrar registros de Justiça">
      {[["todos", "Todos"], ["inquerito", "Inquéritos"], ["bo", "B.O.s"], ["processo", "Processos"], ["investigacao", "Investigações"], ["mencao", "Citações/menções"], ["prisao", "Prisões e cautelares"]].map(([id, label]) =>
        <button key={id} type="button" aria-pressed={filter === id} onClick={() => { setFilter(id); const first = judicialRecords.find((record) => id === "todos" || record.category === id); if (first) setSelectedCase(first); }}>{label}</button>
      )}
    </div>

    <div className="justiceWorkspace">
      <div className="caseList" aria-label="Registros encontrados">
        <div className="caseListTitle"><span>{visibleRecords.length} {visibleRecords.length === 1 ? "registro" : "registros"}</span><small>Ordenação: atualização mais recente</small></div>
        {visibleRecords.map((record) => <button key={record.id} className={selectedCase.id === record.id ? "selected" : ""} type="button" onClick={() => setSelectedCase(record)}>
          <span className={`caseTypeIcon ${record.category}`}>{record.category === "inquerito" ? "INQ" : record.category === "investigacao" ? "INV" : record.category === "processo" ? "PROC" : record.category === "mencao" ? "MEN" : record.category === "prisao" ? "CAU" : "B.O."}</span>
          <span className="caseListCopy"><small>{record.type}</small><strong>{record.number}</strong><span>Papel: {record.role}</span><time>Atualizado em {record.updatedAt}</time></span>
          <span className={`caseState ${record.tone}`}>{record.status}</span>
        </button>)}
      </div>

      <article className="caseDetail">
        <div className="caseDetailTop"><div><span className={`caseState ${selectedCase.tone}`}>{selectedCase.status}</span><span className="miniLabel">{selectedCase.type}</span><h4>{selectedCase.number}</h4></div><button type="button">Compartilhar registro</button></div>
        <p className="caseSummary">{selectedCase.summary}</p>
        <div className="caseMetadata">
          <div><span>Papel da pessoa</span><strong>{selectedCase.role}</strong></div><div><span>Autoridade</span><strong>{selectedCase.authority}</strong></div>
          <div><span>Esfera/competência</span><strong>{selectedCase.jurisdiction}</strong></div><div><span>Fase atual</span><strong>{selectedCase.stage}</strong></div>
          <div><span>Publicidade</span><strong>{selectedCase.secrecy}</strong></div><div><span>Última verificação</span><strong>{selectedCase.updatedAt}</strong></div>
        </div>

        <div className="roleMeaning"><span aria-hidden="true">i</span><div><strong>O que “{selectedCase.role}” significa aqui</strong><p>{selectedCase.meaning}</p></div></div>

        <div className="caseHistory"><div className="caseSectionTitle"><strong>Histórico completo</strong><span>{selectedCase.events.length} eventos públicos</span></div><ol>{selectedCase.events.map(([date, title, detail]) => <li key={`${selectedCase.id}-${date}-${title}`}><time>{date}</time><span><i /><strong>{title}</strong><p>{detail}</p></span></li>)}</ol></div>

        <div className="caseDocuments"><div className="caseSectionTitle"><strong>Documentos e fontes</strong><span>versão demonstrativa</span></div>{selectedCase.documents.map(([title, source]) => <div key={title}><span className="documentMark">DOC</span><span><strong>{title}</strong><small>{source}</small></span><button type="button" disabled>Ver original</button></div>)}</div>

        {selectedCase.category === "bo" && <div className="boWarning"><strong>B.O. não comprova que o fato ocorreu</strong><p>O boletim registra uma comunicação feita à autoridade. O sistema só publicará o documento quando ele for legalmente público, pertinente e contextualizado, com dados de vítimas e terceiros protegidos.</p></div>}
        {selectedCase.tone === "favorable" && <div className="outcomeHighlight"><strong>Desfecho favorável em destaque</strong><p>Absolvição, soltura, revogação, arquivamento e reforma de decisão recebem atualização e visibilidade equivalentes às fases anteriores.</p></div>}
      </article>
    </div>

    <div className="justiceRules"><div><strong>O que será publicado</strong><p>Somente atos e documentos públicos, pertinentes, atribuídos com segurança e acompanhados do estado mais recente.</p></div><div><strong>O que será protegido</strong><p>Sigilo, vítimas, menores, testemunhas vulneráveis, endereços, documentos e detalhes pessoais sem interesse público.</p></div><div><strong>O que exige revisão humana</strong><p>Homônimos, menções indiretas, parentes, investigações, medidas cautelares, prisões e qualquer alegação criminal.</p></div></div>
  </div>;
}

function EvidencePanel() {
  return <div className="dataPanel"><div className="sectionHeading"><div><span className="miniLabel">Livro de evidências</span><h3>Como cada fato pode ser conferido</h3></div><button type="button">Exportar demonstração</button></div>
    <div className="evidenceList"><article><span className="evidenceNumber">EV-0001</span><div><strong>Mandato parlamentar</strong><p>Identidade canônica → exerce mandato → Câmara dos Deputados</p><small>Captura simulada · identificador oficial · confiança alta</small></div><span className="verifiedPill">✓ Validado</span></article>
      <article><span className="evidenceNumber">EV-0002</span><div><strong>Vínculo societário histórico</strong><p>Pessoa → foi sócia-administradora → empresa</p><small>Captura simulada · cruzamento revisado · confiança alta</small></div><span className="verifiedPill">✓ Revisado</span></article>
      <article><span className="evidenceNumber">EV-0003</span><div><strong>Relação profissional</strong><p>Pessoa → nomeou → assessora parlamentar</p><small>Captura simulada · ato de nomeação · confiança alta</small></div><span className="verifiedPill">✓ Validado</span></article></div>
  </div>;
}

function SourcesSection() {
  const sources = [
    ["TSE", "Candidaturas, fotos, certidões, julgamento, bens e redes", "Ativo · fontes integradas"], ["Câmara", "Mandato, projetos, discursos, agenda, despesas e votos nominais", "Ativo · carregamento progressivo"], ["Senado", "Votos, filiações, comissões e mandatos atuais", "Ativo · identidade confirmada"],
    ["CNJ/DataJud", "Metadados e movimentações por número exato", "Ativo · cobertura por tribunal"], ["Tribunais", "Partes, decisões, acórdãos e certidões públicas", "Por órgão"], ["MP e polícia", "Atos públicos de investigações e B.O.s pertinentes", "Revisão obrigatória"],
    ["Notícias", "Linha do tempo de manchetes antigas e recentes", "Experimental · revisar identidade"], ["TCU", "Contas julgadas e acórdãos", "Mapeado"], ["CGU", "Contratos por CNPJ de fornecedor", "API mapeada · aguarda chave"], ["PNCP", "Contratos por período e órgão", "API mapeada"], ["Receita Federal", "CNPJ e quadro societário", "Planejado"],
  ];
  return <section className="sourcesSection" id="fontes"><div className="sourcesIntro"><span className="eyebrow">Cobertura transparente</span><h2>O sistema também mostra<br /><em>o que ainda não sabe.</em></h2><p>Cada fonte tem ritmo, alcance e limitações diferentes. A cobertura ficará visível para evitar uma falsa sensação de completude.</p></div>
    <div className="sourceGrid">{sources.map(([name, description, state]) => <article key={name}><span className="sourceInitial">{name.slice(0, 2)}</span><div><strong>{name}</strong><p>{description}</p></div><small>{state}</small></article>)}</div>
  </section>;
}
