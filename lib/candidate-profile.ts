import { getD1 } from "../db";

export type CandidateProfile = {
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
  ageAtInauguration: number | null;
  nationality: string | null;
  birthCity: string | null;
  isReelection: string | null;
  declaresAssets: string | null;
  campaignExpenseLimitCents: number | null;
  registrationProcessNumber: string | null;
  acceptedAt: string | null;
  assetCount: number;
  assetTotalCents: number;
  socialCount: number;
};

export async function getCandidateProfile(id: string): Promise<CandidateProfile | null> {
  if (!/^\d{6,18}$/.test(id)) return null;

  return getD1().prepare(`
    SELECT
      source_record_id AS sourceRecordId,
      election_year AS electionYear,
      election_name AS electionName,
      election_date AS electionDate,
      state,
      electoral_unit AS electoralUnit,
      office,
      candidate_number AS candidateNumber,
      full_name AS fullName,
      ballot_name AS ballotName,
      social_name AS socialName,
      party_number AS partyNumber,
      party_acronym AS partyAcronym,
      party_name AS partyName,
      COALESCE(candidate_details.judgment_status, candidates.candidacy_status) AS candidacyStatus,
      occupation,
      education,
      source_generated_at AS sourceGeneratedAt,
      source_url AS sourceUrl,
      candidate_details.age_at_inauguration AS ageAtInauguration,
      candidate_details.nationality,
      candidate_details.birth_city AS birthCity,
      candidate_details.is_reelection AS isReelection,
      candidate_details.declares_assets AS declaresAssets,
      candidate_details.campaign_expense_limit_cents AS campaignExpenseLimitCents,
      candidate_details.registration_process_number AS registrationProcessNumber,
      candidate_details.accepted_at AS acceptedAt,
      COALESCE(candidate_details.asset_count, 0) AS assetCount,
      COALESCE(candidate_details.asset_total_cents, 0) AS assetTotalCents,
      COALESCE(candidate_details.social_count, 0) AS socialCount
    FROM candidates
    LEFT JOIN candidate_details ON candidate_details.candidate_id = candidates.source_record_id
    WHERE source_record_id = ?
    LIMIT 1
  `).bind(id).first<CandidateProfile>();
}
