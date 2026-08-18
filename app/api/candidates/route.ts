import { getD1 } from "../../../db";
import { normalizePersonName } from "../../../lib/normalize-name";

export const dynamic = "force-dynamic";

const candidateSelect = `
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
  candidate_details.asset_count AS assetCount,
  candidate_details.asset_total_cents AS assetTotalCents,
  candidate_details.social_count AS socialCount`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = normalizePersonName(searchParams.get("q") ?? "");
  const state = (searchParams.get("uf") ?? "").trim().toUpperCase();
  const office = (searchParams.get("office") ?? "").trim().toUpperCase();
  const party = (searchParams.get("party") ?? "").trim().toUpperCase();
  const judgment = (searchParams.get("judgment") ?? "").trim().toUpperCase();
  const requestedLimit = Number(searchParams.get("limit") ?? 12);
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 12, 1), 25);

  if (query.length < 2) {
    return Response.json({ candidates: [], query, minimumCharacters: 2 });
  }

  const filters = ["search_name LIKE ?"];
  const bindings: Array<string | number> = [`%${query}%`];
  if (/^[A-Z]{2}$/.test(state)) {
    filters.push("candidates.state = ?");
    bindings.push(state);
  }
  if (office) {
    filters.push("candidates.office = ?");
    bindings.push(office);
  }
  if (/^[A-Z0-9]{1,12}$/.test(party)) {
    filters.push("candidates.party_acronym = ?");
    bindings.push(party);
  }
  if (judgment) {
    filters.push("candidate_details.judgment_status = ?");
    bindings.push(judgment);
  }

  const statement = getD1().prepare(`
    SELECT ${candidateSelect}
    FROM candidates
    LEFT JOIN candidate_details ON candidate_details.candidate_id = candidates.source_record_id
    WHERE ${filters.join(" AND ")}
    ORDER BY
      CASE WHEN search_name LIKE ? THEN 0 ELSE 1 END,
      ballot_name COLLATE NOCASE,
      state,
      office
    LIMIT ?
  `).bind(...bindings, `${query}%`, limit);

  const result = await statement.all();
  return Response.json({ candidates: result.results, query, limit });
}
