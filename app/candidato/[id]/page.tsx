import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ObservatorioApp from "../../observatorio-app";
import { getCandidateProfile } from "../../../lib/candidate-profile";
import { tseCandidatePhotoUrl } from "../../../lib/tse-divulga";

type CandidatePageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: CandidatePageProps): Promise<Metadata> {
  const { id } = await params;
  const candidate = await getCandidateProfile(id);

  if (!candidate) {
    return { title: "Candidatura não encontrada | Observatório Público", robots: { index: false, follow: false } };
  }

  const title = `${candidate.ballotName} — ${candidate.office} | Observatório Público`;
  const description = `${candidate.office} por ${candidate.state}, ${candidate.partyAcronym}, número ${candidate.candidateNumber}. Perfil eleitoral oficial com fonte TSE.`;
  const photoUrl = tseCandidatePhotoUrl(candidate);

  return {
    title,
    description,
    alternates: { canonical: `/candidato/${candidate.sourceRecordId}` },
    openGraph: { title, description, type: "profile", url: `/candidato/${candidate.sourceRecordId}`, images: [{ url: photoUrl, alt: `Foto oficial de ${candidate.ballotName}` }] },
    twitter: { card: "summary", title, description, images: [photoUrl] },
  };
}

export default async function CandidatePage({ params }: CandidatePageProps) {
  const { id } = await params;
  const candidate = await getCandidateProfile(id);
  if (!candidate) notFound();

  return <ObservatorioApp initialCandidate={candidate} />;
}
