import { getD1 } from "../../../db";

export const dynamic = "force-dynamic";

export async function GET() {
  const d1 = getD1();
  const [states, offices, parties, judgments] = await d1.batch([
    d1.prepare("SELECT state AS value, COUNT(*) AS count FROM candidates GROUP BY state ORDER BY state"),
    d1.prepare("SELECT office AS value, COUNT(*) AS count FROM candidates GROUP BY office ORDER BY office"),
    d1.prepare("SELECT party_acronym AS value, party_name AS label, COUNT(*) AS count FROM candidates GROUP BY party_acronym, party_name ORDER BY party_acronym"),
    d1.prepare("SELECT judgment_status AS value, COUNT(*) AS count FROM candidate_details GROUP BY judgment_status ORDER BY judgment_status"),
  ]);

  return Response.json({
    states: states.results,
    offices: offices.results,
    parties: parties.results,
    judgments: judgments.results,
  });
}
