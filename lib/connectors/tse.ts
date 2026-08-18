const TSE_CKAN_ENDPOINT = "https://dadosabertos.tse.jus.br/api/3/action/package_show?id=candidatos-2026";

type CkanResource = {
  id: string;
  name: string;
  format?: string;
  url: string;
  last_modified?: string | null;
  created?: string | null;
};

type CkanPackageResponse = {
  success: boolean;
  result?: {
    id: string;
    title: string;
    metadata_modified: string;
    license_title?: string;
    resources: CkanResource[];
  };
};

export type TseDatasetStatus = {
  source: "Tribunal Superior Eleitoral";
  dataset: string;
  officialUrl: string;
  observedAt: string;
  datasetUpdatedAt: string;
  license: string;
  resources: Array<{
    id: string;
    name: string;
    format: string;
    downloadUrl: string;
    updatedAt: string | null;
  }>;
};

export async function getTseCandidates2026Status(): Promise<TseDatasetStatus> {
  const response = await fetch(TSE_CKAN_ENDPOINT, {
    headers: { Accept: "application/json", "User-Agent": "Observatorio-Publico/0.1 (public-data connector)" },
    next: { revalidate: 3600 },
  });

  if (!response.ok) throw new Error(`TSE respondeu com status ${response.status}`);

  const payload = (await response.json()) as CkanPackageResponse;
  if (!payload.success || !payload.result) throw new Error("Resposta inválida do catálogo de dados do TSE");

  return {
    source: "Tribunal Superior Eleitoral",
    dataset: payload.result.title,
    officialUrl: "https://dadosabertos.tse.jus.br/dataset/candidatos-2026",
    observedAt: new Date().toISOString(),
    datasetUpdatedAt: payload.result.metadata_modified,
    license: payload.result.license_title ?? "Não informada pelo catálogo",
    resources: payload.result.resources.map((resource) => ({
      id: resource.id,
      name: resource.name,
      format: resource.format ?? "",
      downloadUrl: resource.url,
      updatedAt: resource.last_modified ?? resource.created ?? null,
    })),
  };
}
