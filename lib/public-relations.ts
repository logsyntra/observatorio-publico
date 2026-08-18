import { normalizePersonName } from "./normalize-name";

export type PublicRelation = {
  slug: string;
  fullName: string;
  displayName: string;
  relationType: "familia" | "politica" | "profissional" | "societaria";
  relationLabel: string;
  publicRole: string;
  publicFigure: boolean;
  candidateId: string | null;
  profileUrl: string | null;
  evidence: Array<{ title: string; publisher: string; url: string }>;
};

const sources = {
  lulaFamily: "https://www.novaubirata.mt.gov.br/prefeitura/presidente-da-republica",
  janja: "https://www.gov.br/igualdaderacial/pt-br/central-de-conteudos-1/discursos-da-ministra/discurso-de-posse/",
  flavioFather: "https://www12.senado.leg.br/noticias/materias/2019/01/18/flavio-bolsonaro-psl",
  bolsonaroSiblings: "https://www2.senado.leg.br/bdsf/bitstream/handle/id/561713/noticia.html",
  carlosProfile: "https://www.camara.rio/vereadores/carlos-bolsonaro",
  eduardoProfile: "https://www.camara.leg.br/deputados/92346/biografia",
};

const lulaRelations: PublicRelation[] = [
  relation("rosangela-lula-da-silva", "ROSÂNGELA LULA DA SILVA", "Janja Lula da Silva", "Cônjuge", "Primeira-dama", true, null, "https://www.gov.br/planalto/pt-br/acompanhe-o-planalto/agenda-da-primeira-dama", [["Referência oficial a Lula e sua esposa Janja", "Governo Federal", sources.janja]]),
  relation("fabio-luis-lula-da-silva", "FÁBIO LUÍS LULA DA SILVA", "Fábio Luís Lula da Silva (Lulinha)", "Filho", "Empresário citado em registros públicos", true, null, null, [["Relação familiar publicada", "Prefeitura de Nova Ubiratã", sources.lulaFamily]]),
  relation("sandro-luis-silva", "SANDRO LUÍS SILVA", "Sandro Luís Silva", "Filho", "Familiar sem função pública vinculada", false, null, null, [["Relação familiar publicada", "Prefeitura de Nova Ubiratã", sources.lulaFamily]]),
  relation("marcos-claudio-lula-da-silva", "MARCOS CLÁUDIO LULA DA SILVA", "Marcos Cláudio Lula da Silva", "Filho", "Familiar sem função pública vinculada", false, null, null, [["Relação familiar publicada", "Prefeitura de Nova Ubiratã", sources.lulaFamily]]),
  relation("luis-claudio-lula-da-silva", "LUÍS CLÁUDIO LULA DA SILVA", "Luís Cláudio Lula da Silva", "Filho", "Pessoa com aparições em registros públicos", true, null, null, [["Relação familiar publicada", "Prefeitura de Nova Ubiratã", sources.lulaFamily]]),
  relation("lurian-cordeiro-lula-da-silva", "LURIAN CORDEIRO LULA DA SILVA", "Lurian Cordeiro Lula da Silva", "Filha", "Jornalista", true, null, null, [["Relação familiar publicada", "Prefeitura de Nova Ubiratã", sources.lulaFamily]]),
];

const bolsonaroRelations: PublicRelation[] = [
  relation("jair-messias-bolsonaro", "JAIR MESSIAS BOLSONARO", "Jair Bolsonaro", "Pai", "Ex-presidente da República", true, null, "https://www.gov.br/secretariageral/pt-br/centrais-de-conteudo/biblioteca-da-pr/galeria-dos-ex-presidentes/jair-messias-bolsonaro", [["Perfil do senador registra que Flávio é filho de Jair Bolsonaro", "Agência Senado", sources.flavioFather]]),
  relation("carlos-nantes-bolsonaro", "CARLOS NANTES BOLSONARO", "Carlos Bolsonaro", "Irmão", "Vereador e candidato ao Senado", true, "240002541935", sources.carlosProfile, [["Registro público cita Flávio, Carlos e Eduardo como irmãos", "Biblioteca do Senado", sources.bolsonaroSiblings]]),
  relation("eduardo-nantes-bolsonaro", "EDUARDO NANTES BOLSONARO", "Eduardo Bolsonaro", "Irmão", "Ex-deputado federal", true, null, sources.eduardoProfile, [["Registro público cita Flávio, Carlos e Eduardo como irmãos", "Biblioteca do Senado", sources.bolsonaroSiblings]]),
];

const byCandidate = new Map<string, PublicRelation[]>([
  ["LUIZ INACIO LULA DA SILVA", lulaRelations],
  ["FLAVIO NANTES BOLSONARO", bolsonaroRelations],
  ["CARLOS NANTES BOLSONARO", [
    relation("jair-messias-bolsonaro", "JAIR MESSIAS BOLSONARO", "Jair Bolsonaro", "Pai", "Ex-presidente da República", true, null, "https://www.gov.br/secretariageral/pt-br/centrais-de-conteudo/biblioteca-da-pr/galeria-dos-ex-presidentes/jair-messias-bolsonaro", [["Documento legislativo identifica Carlos como filho de Jair Bolsonaro", "Senado Federal", "https://www25.senado.leg.br/web/atividade/pronunciamentos/-/p/pronunciamento/517936"]]),
    relation("flavio-nantes-bolsonaro", "FLAVIO NANTES BOLSONARO", "Flávio Bolsonaro", "Irmão", "Senador e candidato à Presidência", true, "280002551544", "https://www25.senado.leg.br/pt_BR/web/senadores/senador/-/perfil/5894", [["Registro público cita Flávio, Carlos e Eduardo como irmãos", "Biblioteca do Senado", sources.bolsonaroSiblings]]),
    relation("eduardo-nantes-bolsonaro", "EDUARDO NANTES BOLSONARO", "Eduardo Bolsonaro", "Irmão", "Ex-deputado federal", true, null, sources.eduardoProfile, [["Registro público cita Flávio, Carlos e Eduardo como irmãos", "Biblioteca do Senado", sources.bolsonaroSiblings]]),
  ]],
]);

export function getPublicRelations(fullName: string) {
  return byCandidate.get(normalizePersonName(fullName)) ?? [];
}

export function getPublicPersonBySlug(slug: string) {
  return Array.from(byCandidate.values()).flat().find((person) => person.slug === slug) ?? null;
}

function relation(slug: string, fullName: string, displayName: string, relationLabel: string, publicRole: string, publicFigure: boolean, candidateId: string | null, profileUrl: string | null, sourcesInput: Array<[string, string, string]>): PublicRelation {
  return { slug, fullName, displayName, relationType: "familia", relationLabel, publicRole, publicFigure, candidateId, profileUrl, evidence: sourcesInput.map(([title, publisher, url]) => ({ title, publisher, url })) };
}
