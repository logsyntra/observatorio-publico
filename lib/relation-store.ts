import { getD1 } from "../db";
import type { PublicRelation } from "./public-relations";

type RelationRow = {
  relation_id: string;
  slug: string;
  full_name: string;
  display_name: string;
  entity_type: PublicRelation["entityType"];
  relation_type: PublicRelation["relationType"];
  relation_label: string;
  public_role: string;
  is_public_figure: number;
  candidate_id: string | null;
  profile_url: string | null;
  official_identifier: string | null;
  identifier_type: PublicRelation["identifierType"];
  evidence_id: string | null;
  evidence_title: string | null;
  evidence_publisher: string | null;
  evidence_url: string | null;
};

export async function getStoredPublicRelations(candidateId: string): Promise<PublicRelation[]> {
  try {
    const result = await getD1().prepare(`
      SELECT
        r.id AS relation_id,
        e.id AS slug,
        e.full_name,
        e.display_name,
        e.entity_type,
        r.relation_type,
        r.relation_label,
        e.public_role,
        e.is_public_figure,
        e.candidate_id,
        e.profile_url,
        e.official_identifier,
        e.identifier_type,
        ev.id AS evidence_id,
        ev.title AS evidence_title,
        ev.publisher AS evidence_publisher,
        ev.source_url AS evidence_url
      FROM public_relations r
      JOIN public_entities e ON e.id = r.object_entity_id
      LEFT JOIN relation_evidence ev ON ev.relation_id = r.id
      WHERE r.subject_candidate_id = ?
        AND r.verification_state IN ('verified', 'reviewed')
      ORDER BY r.relation_type, r.relation_label, e.display_name
    `).bind(candidateId).all<RelationRow>();

    const grouped = new Map<string, PublicRelation>();
    for (const row of result.results ?? []) {
      const current = grouped.get(row.relation_id) ?? {
        slug: row.slug,
        fullName: row.full_name,
        displayName: row.display_name,
        entityType: row.entity_type,
        relationType: row.relation_type,
        relationLabel: row.relation_label,
        publicRole: row.public_role,
        publicFigure: Boolean(row.is_public_figure),
        candidateId: row.candidate_id,
        profileUrl: row.profile_url,
        officialIdentifier: row.official_identifier,
        identifierType: row.identifier_type,
        evidence: [],
      };
      if (row.evidence_id && row.evidence_title && row.evidence_publisher && row.evidence_url) current.evidence.push({ title: row.evidence_title, publisher: row.evidence_publisher, url: row.evidence_url });
      grouped.set(row.relation_id, current);
    }
    return Array.from(grouped.values());
  } catch {
    // Deploys anteriores ainda não possuem as tabelas; o catálogo curado em código
    // continua disponível enquanto a migração é aplicada.
    return [];
  }
}

export async function getStoredPublicEntityBySlug(slug: string): Promise<PublicRelation | null> {
  try {
    const result = await getD1().prepare(`
      SELECT
        r.id AS relation_id,
        e.id AS slug,
        e.full_name,
        e.display_name,
        e.entity_type,
        r.relation_type,
        r.relation_label,
        e.public_role,
        e.is_public_figure,
        e.candidate_id,
        e.profile_url,
        e.official_identifier,
        e.identifier_type,
        ev.id AS evidence_id,
        ev.title AS evidence_title,
        ev.publisher AS evidence_publisher,
        ev.source_url AS evidence_url
      FROM public_entities e
      JOIN public_relations r ON r.object_entity_id = e.id
      LEFT JOIN relation_evidence ev ON ev.relation_id = r.id
      WHERE e.id = ?
        AND r.verification_state IN ('verified', 'reviewed')
      ORDER BY r.reviewed_at DESC, ev.captured_at DESC
    `).bind(slug).all<RelationRow>();

    const rows = result.results ?? [];
    const first = rows[0];
    if (!first) return null;
    return {
      slug: first.slug,
      fullName: first.full_name,
      displayName: first.display_name,
      entityType: first.entity_type,
      relationType: first.relation_type,
      relationLabel: first.relation_label,
      publicRole: first.public_role,
      publicFigure: Boolean(first.is_public_figure),
      candidateId: first.candidate_id,
      profileUrl: first.profile_url,
      officialIdentifier: first.official_identifier,
      identifierType: first.identifier_type,
      evidence: rows.flatMap((row) => row.evidence_id && row.evidence_title && row.evidence_publisher && row.evidence_url ? [{ title: row.evidence_title, publisher: row.evidence_publisher, url: row.evidence_url }] : []),
    };
  } catch {
    return null;
  }
}
