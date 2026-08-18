export type PublicJusticeEventKind =
  | "accusation"
  | "decision"
  | "conviction"
  | "appeal"
  | "custody_start"
  | "custody_end"
  | "annulment"
  | "acquittal";

export type PublicJusticeEvent = {
  date: string;
  kind: PublicJusticeEventKind;
  label: string;
  description: string;
  source: { publisher: string; url: string };
};

export type PublicJusticeCase = {
  id: string;
  title: string;
  caseNumber: string;
  category: "ação penal" | "investigação" | "habeas corpus";
  court: string;
  role: string;
  currentState: "annulled" | "acquitted" | "closed" | "pending";
  currentStateLabel: string;
  currentStateExplanation: string;
  events: PublicJusticeEvent[];
};

export type PublicJusticeHistory = {
  identity: { matchedName: string; rule: string };
  cases: PublicJusticeCase[];
  summary: {
    cases: number;
    annulled: number;
    acquitted: number;
    custodyPeriods: number;
    pending: number;
  };
  methodology: {
    mode: string;
    warning: string;
    reviewedAt: string;
  };
};

const STF_ANNULMENT = "https://portal.stf.jus.br/noticias/verNoticiaDetalhe.asp?idConteudo=464261&tip=UN";
const STF_FACHIN = "https://noticias.stf.jus.br/postsnoticias/fachin-anula-condenacoes-de-lula-e-manda-acoes-penais-para-justica-federal-do-df/";
const STF_PARTIALITY = "https://portal.stf.jus.br/noticias/verNoticiaDetalhe.asp?idConteudo=462854&ori=1";
const STF_EXTENDED_PARTIALITY = "https://portal.stf.jus.br/noticias/verNoticiaDetalhe.asp?idConteudo=468184&ori=1";
const STF_CUSTODY = "https://portal.stf.jus.br/noticias/verNoticiaDetalhe.asp?idConteudo=419169&tip=UN";
const STF_SECOND_INSTANCE = "https://portal.stf.jus.br/noticias/verNoticiaDetalhe.asp?idConteudo=429359";
const TRF4_TRIPLEX = "https://www.trf4.jus.br/trf4/controlador.php?acao=noticia_visualizar&id_noticia=18776";
const STJ_TRIPLEX = "https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/Quinta-Turma-reduz-pena-do-ex-presidente-Lula-para-oito-anos-e-dez-meses.aspx";
const TRF1_OBSTRUCTION = "https://sistemas.trf1.jus.br/edj/bitstream/handle/123/14010/Caderno_JUD_DF_2018-08-22_X_156.pdf?isAllowed=y&sequence=1";

const lulaCases: PublicJusticeCase[] = [
  {
    id: "triplex-guaruja",
    title: "Caso tríplex do Guarujá",
    caseNumber: "5046512-94.2016.4.04.7000",
    category: "ação penal",
    court: "13ª Vara Federal de Curitiba · TRF4 · STJ · STF",
    role: "Réu",
    currentState: "annulled",
    currentStateLabel: "Condenação anulada — sem efeito jurídico",
    currentStateExplanation: "O STF declarou a incompetência da 13ª Vara Federal de Curitiba e anulou suas decisões. Em decisão própria, reconheceu também a parcialidade do então juiz no caso.",
    events: [
      { date: "2017-07-12", kind: "conviction", label: "Condenação em 1ª instância", description: "Houve condenação por corrupção passiva e lavagem de dinheiro. Este é um fato histórico; a decisão foi posteriormente anulada.", source: { publisher: "TRF4", url: TRF4_TRIPLEX } },
      { date: "2018-01-24", kind: "appeal", label: "Condenação confirmada no TRF4", description: "A 8ª Turma confirmou a condenação e fixou, naquele momento, pena de 12 anos e 1 mês.", source: { publisher: "TRF4", url: TRF4_TRIPLEX } },
      { date: "2018-04-07", kind: "custody_start", label: "Início do cumprimento provisório", description: "O período de custódia relacionado a esta condenação começou após a decisão de segunda instância.", source: { publisher: "STF", url: STF_CUSTODY } },
      { date: "2019-04-23", kind: "appeal", label: "STJ reduziu a pena", description: "A Quinta Turma do STJ reduziu a pena para 8 anos, 10 meses e 20 dias; essa condenação também perdeu efeito após a anulação.", source: { publisher: "STJ", url: STJ_TRIPLEX } },
      { date: "2019-11-08", kind: "custody_end", label: "Fim do cumprimento provisório", description: "A soltura ocorreu após o STF decidir que a execução da pena exige esgotamento dos recursos, salvo prisão cautelar fundamentada.", source: { publisher: "STF", url: STF_SECOND_INSTANCE } },
      { date: "2021-03-08", kind: "annulment", label: "Decisões anuladas por incompetência", description: "O relator do HC 193726 anulou as decisões da 13ª Vara Federal de Curitiba e determinou a remessa dos autos à Justiça Federal do Distrito Federal.", source: { publisher: "STF", url: STF_FACHIN } },
      { date: "2021-03-23", kind: "annulment", label: "Parcialidade do então juiz reconhecida", description: "A Segunda Turma do STF reconheceu a parcialidade de Sergio Moro e anulou seus atos decisórios e pré-processuais neste caso.", source: { publisher: "STF", url: STF_PARTIALITY } },
      { date: "2021-04-15", kind: "decision", label: "Plenário confirmou a anulação", description: "O Plenário do STF confirmou a incompetência da vara de Curitiba e manteve a anulação das condenações.", source: { publisher: "STF", url: STF_ANNULMENT } },
    ],
  },
  {
    id: "sitio-atibaia",
    title: "Caso sítio de Atibaia",
    caseNumber: "5021365-32.2017.4.04.7000",
    category: "ação penal",
    court: "13ª Vara Federal de Curitiba · TRF4 · STF",
    role: "Réu",
    currentState: "annulled",
    currentStateLabel: "Condenação anulada — sem efeito jurídico",
    currentStateExplanation: "O STF anulou as decisões por incompetência do juízo de Curitiba e depois estendeu ao processo o reconhecimento de parcialidade.",
    events: [
      { date: "2019-02-06", kind: "conviction", label: "Condenação em 1ª instância", description: "Houve condenação por corrupção passiva e lavagem de dinheiro. A decisão foi posteriormente anulada e não conserva efeito jurídico.", source: { publisher: "STF", url: STF_FACHIN } },
      { date: "2021-03-08", kind: "annulment", label: "Decisões anuladas por incompetência", description: "O HC 193726 incluiu expressamente esta ação entre os processos cujas decisões foram anuladas.", source: { publisher: "STF", url: STF_FACHIN } },
      { date: "2021-06-24", kind: "annulment", label: "Parcialidade estendida ao processo", description: "O STF anulou os atos decisórios e pré-processuais relacionados ao processo do sítio.", source: { publisher: "STF", url: STF_EXTENDED_PARTIALITY } },
    ],
  },
  {
    id: "sede-instituto-lula",
    title: "Caso da sede do Instituto Lula",
    caseNumber: "5063130-17.2018.4.04.7000",
    category: "ação penal",
    court: "13ª Vara Federal de Curitiba · STF",
    role: "Réu",
    currentState: "annulled",
    currentStateLabel: "Atos decisórios anulados",
    currentStateExplanation: "O recebimento da denúncia e os demais atos decisórios do juízo de Curitiba foram anulados; não houve condenação válida neste processo.",
    events: [
      { date: "2018-09-14", kind: "accusation", label: "Ação penal em Curitiba", description: "A acusação tratava de imóvel destinado ao Instituto Lula. A inclusão aqui registra a existência do processo, não confirma a imputação.", source: { publisher: "STF", url: STF_FACHIN } },
      { date: "2021-03-08", kind: "annulment", label: "Atos decisórios anulados por incompetência", description: "O STF determinou que a Justiça Federal do Distrito Federal avaliasse eventual aproveitamento de atos não decisórios.", source: { publisher: "STF", url: STF_FACHIN } },
      { date: "2021-06-24", kind: "annulment", label: "Parcialidade estendida ao processo", description: "O STF anulou os atos decisórios e pré-processuais relacionados à ação.", source: { publisher: "STF", url: STF_EXTENDED_PARTIALITY } },
    ],
  },
  {
    id: "doacoes-instituto-lula",
    title: "Caso de doações ao Instituto Lula",
    caseNumber: "5044305-83.2020.4.04.7000",
    category: "ação penal",
    court: "13ª Vara Federal de Curitiba · STF",
    role: "Réu",
    currentState: "annulled",
    currentStateLabel: "Atos decisórios anulados",
    currentStateExplanation: "O STF anulou os atos decisórios da vara de Curitiba por incompetência. Não houve condenação válida neste processo.",
    events: [
      { date: "2020-09-11", kind: "accusation", label: "Ação penal em Curitiba", description: "A ação tratava de doações ao Instituto Lula. O registro descreve a imputação processual, não a apresenta como fato comprovado.", source: { publisher: "STF", url: STF_FACHIN } },
      { date: "2021-03-08", kind: "annulment", label: "Atos decisórios anulados por incompetência", description: "A decisão no HC 193726 incluiu expressamente esta ação entre as remetidas ao Distrito Federal.", source: { publisher: "STF", url: STF_FACHIN } },
    ],
  },
  {
    id: "obstrucao-cervero",
    title: "Caso de suposta obstrução da Justiça",
    caseNumber: "0042543-76.2016.4.01.3400",
    category: "ação penal",
    court: "10ª Vara Federal Criminal do Distrito Federal · TRF1",
    role: "Réu",
    currentState: "acquitted",
    currentStateLabel: "Absolvido — decisão definitiva",
    currentStateExplanation: "A sentença absolveu Lula e o Diário da Justiça registrou o encerramento da persecução penal e o trânsito em julgado em relação a ele.",
    events: [
      { date: "2016-07-29", kind: "accusation", label: "Denúncia recebida", description: "A ação apurou acusação de tentativa de obstrução ligada à colaboração de Nestor Cerveró.", source: { publisher: "TRF1", url: TRF1_OBSTRUCTION } },
      { date: "2018-07-12", kind: "acquittal", label: "Absolvição", description: "A Justiça Federal absolveu Lula na ação penal.", source: { publisher: "TRF1", url: TRF1_OBSTRUCTION } },
      { date: "2018-08-22", kind: "decision", label: "Encerramento definitivo registrado", description: "O Diário da Justiça determinou o registro de réu absolvido e certificou o trânsito em julgado em relação a Lula.", source: { publisher: "TRF1", url: TRF1_OBSTRUCTION } },
    ],
  },
];

const catalogs: Record<string, PublicJusticeCase[]> = {
  "LUIZ INACIO LULA DA SILVA": lulaCases,
};

export function getPublicJusticeHistory(fullName: string): PublicJusticeHistory | null {
  const normalizedName = normalizeName(fullName);
  const cases = catalogs[normalizedName];
  if (!cases) return null;

  return {
    identity: { matchedName: fullName, rule: "nome civil completo idêntico ao cadastro oficial do TSE" },
    cases,
    summary: {
      cases: cases.length,
      annulled: cases.filter((item) => item.currentState === "annulled").length,
      acquitted: cases.filter((item) => item.currentState === "acquitted").length,
      custodyPeriods: cases.reduce((total, item) => total + item.events.filter((event) => event.kind === "custody_start").length, 0),
      pending: cases.filter((item) => item.currentState === "pending").length,
    },
    methodology: {
      mode: "catálogo editorial estruturado a partir de decisões e publicações oficiais",
      warning: "Este catálogo não é certidão, não cobre segredo de Justiça e não permite concluir que registros ausentes nunca existiram.",
      reviewedAt: "2026-08-18",
    },
  };
}

function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
}
