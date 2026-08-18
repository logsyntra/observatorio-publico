import { JUDICIAL_RECORD_TYPES, PERSON_ROLES, PROCEDURAL_STATES, PUBLICATION_REQUIREMENTS } from "../../../../lib/domain/judicial-record";

export function GET() {
  return Response.json({
    version: "1.0.0",
    purpose: "Schema público para registros de Justiça e investigações",
    recordTypes: JUDICIAL_RECORD_TYPES,
    personRoles: PERSON_ROLES,
    proceduralStates: PROCEDURAL_STATES,
    publicationRequirements: PUBLICATION_REQUIREMENTS,
    semantics: {
      mentioned: "O nome aparece em um documento; participação não é presumida.",
      investigated: "Objeto de apuração; não equivale a acusado ou condenado.",
      defendant: "Acusação recebida pelo Judiciário; não equivale a condenado.",
      arrest_or_caution: "Medida processual; não equivale a pena ou condenação.",
    },
  });
}
