export const JUDICIAL_RECORD_TYPES = [
  "police_report",
  "police_inquiry",
  "civil_investigation",
  "administrative_investigation",
  "judicial_case",
  "document_mention",
  "arrest_or_caution",
] as const;

export const PERSON_ROLES = [
  "reporter",
  "victim",
  "witness",
  "mentioned",
  "interested_party",
  "investigated",
  "indicted",
  "accused",
  "defendant",
  "convicted_appealable",
  "convicted_final",
  "acquitted",
  "sanctioned",
] as const;

export const PROCEDURAL_STATES = [
  "reported",
  "under_investigation",
  "awaiting_authority_action",
  "charges_filed",
  "charges_accepted",
  "trial",
  "decision_appealable",
  "decision_final",
  "archived",
  "dismissed",
  "acquitted",
  "revoked",
  "closed_without_sanction",
] as const;

export type JudicialRecordType = (typeof JUDICIAL_RECORD_TYPES)[number];
export type PersonRole = (typeof PERSON_ROLES)[number];
export type ProceduralState = (typeof PROCEDURAL_STATES)[number];

export type JudicialEvent = {
  occurredAt: string;
  title: string;
  description: string;
  sourceEvidenceId: string;
  changesCurrentState: boolean;
};

export type JudicialEvidence = {
  id: string;
  sourceName: string;
  sourceUrl: string;
  officialRecordId: string | null;
  capturedAt: string;
  publishedAt: string | null;
  contentHash: string;
  isOfficial: boolean;
  isPublic: boolean;
  redactionReviewed: boolean;
};

export type JudicialRecord = {
  id: string;
  subjectId: string;
  type: JudicialRecordType;
  officialNumber: string | null;
  authority: string;
  courtOrAgency: string;
  role: PersonRole;
  currentState: ProceduralState;
  roleAsOf: string;
  stateAsOf: string;
  secrecyLevel: "public" | "partially_public" | "restricted" | "unknown";
  summary: string;
  outcome: string | null;
  events: JudicialEvent[];
  evidence: JudicialEvidence[];
  identityMatch: {
    method: "official_identifier" | "multi_attribute" | "manual_review";
    confidence: number;
    reviewedByHuman: boolean;
  };
  publicationReview: {
    publicInterest: boolean;
    dataMinimized: boolean;
    vulnerablePartiesProtected: boolean;
    latestStateChecked: boolean;
    approved: boolean;
  };
};

export const PUBLICATION_REQUIREMENTS = {
  minimumIdentityConfidence: 0.95,
  alwaysRequireHumanReview: ["police_report", "police_inquiry", "document_mention", "arrest_or_caution"],
  protectedData: ["home_address", "personal_phone", "full_document_number", "minor_identity", "victim_private_data", "sealed_content"],
  mandatoryDisplayFields: ["role", "currentState", "stateAsOf", "authority", "evidence", "latestStateChecked"],
} as const;

export function canPublishJudicialRecord(record: JudicialRecord) {
  const review = record.publicationReview;
  const identity = record.identityMatch;
  const sensitiveType = PUBLICATION_REQUIREMENTS.alwaysRequireHumanReview.includes(
    record.type as (typeof PUBLICATION_REQUIREMENTS.alwaysRequireHumanReview)[number],
  );

  return (
    record.secrecyLevel !== "restricted" &&
    identity.confidence >= PUBLICATION_REQUIREMENTS.minimumIdentityConfidence &&
    (!sensitiveType || identity.reviewedByHuman) &&
    review.publicInterest &&
    review.dataMinimized &&
    review.vulnerablePartiesProtected &&
    review.latestStateChecked &&
    review.approved &&
    record.evidence.some((item) => item.isPublic && item.redactionReviewed)
  );
}
