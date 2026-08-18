import { getD1 } from "../../../../db";
import type { CandidateProfile } from "../../../../lib/candidate-profile";
import { fetchTseCandidateDossier } from "../../../../lib/tse-divulga";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^\d{6,18}$/.test(id)) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  const d1 = getD1();
  const [candidateResult, assetsResult, socialResult] = await d1.batch([
    d1.prepare(`
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
      candidate_details.asset_count AS assetCount,
      candidate_details.asset_total_cents AS assetTotalCents,
      candidate_details.social_count AS socialCount
    FROM candidates
    LEFT JOIN candidate_details ON candidate_details.candidate_id = candidates.source_record_id
    WHERE source_record_id = ?
    LIMIT 1
  `).bind(id),
    d1.prepare(`
      SELECT item_order AS itemOrder, asset_type AS assetType, description, value_cents AS valueCents, updated_at AS updatedAt
      FROM candidate_assets
      WHERE candidate_id = ?
      ORDER BY value_cents DESC, item_order ASC
      LIMIT 500
    `).bind(id),
    d1.prepare(`
      SELECT item_order AS itemOrder, platform, url AS rawUrl
      FROM candidate_social_links
      WHERE candidate_id = ?
      ORDER BY item_order ASC
      LIMIT 100
    `).bind(id),
  ]);

  const candidate = candidateResult.results[0] as CandidateProfile | undefined;

  if (!candidate) {
    return Response.json({ error: "Candidatura não encontrada." }, { status: 404 });
  }

  const socialLinks = socialResult.results.map((link) => ({
    ...link,
    url: safeExternalUrl(String(link.rawUrl ?? "")),
  }));

  const dossier = await fetchTseCandidateDossier(candidate).catch(() => null);
  const currentRegistration = dossier?.processes.find((process) => process.kind === "registration")?.number;
  const enrichedCandidate = dossier ? {
    ...candidate,
    candidacyStatus: dossier.status ?? candidate.candidacyStatus,
    registrationProcessNumber: currentRegistration ?? candidate.registrationProcessNumber,
    photoUrl: dossier.photoUrl,
    officialProfileUrl: dossier.publicProfileUrl,
    officialUpdatedAt: dossier.updatedAt,
    formalRelations: dossier.formalRelations,
    previousElections: dossier.previousElections,
  } : candidate;

  return Response.json({ candidate: enrichedCandidate, assets: assetsResult.results, socialLinks });
}

function safeExternalUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("@")) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    return ["http:", "https:"].includes(parsed.protocol) && parsed.hostname.includes(".") ? parsed.toString() : null;
  } catch {
    return null;
  }
}
