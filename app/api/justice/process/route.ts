import { DATAJUD_DOCUMENTATION_URL, endpointFromCnjNumber, formatCnjNumber, queryPublicDataJud } from "../../../../lib/datajud-public";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const number = new URL(request.url).searchParams.get("number")?.replace(/\D/g, "") ?? "";
  if (number.length !== 20) return Response.json({ error: "Informe os 20 dígitos do número CNJ.", code: "INVALID_CNJ_NUMBER" }, { status: 400 });

  const endpoint = endpointFromCnjNumber(number);
  if (!endpoint) return Response.json({ error: "O ramo ou tribunal codificado neste número ainda não possui conector automático.", code: "UNSUPPORTED_COURT", formattedNumber: formatCnjNumber(number), documentationUrl: DATAJUD_DOCUMENTATION_URL }, { status: 422 });

  try {
    const records = await queryPublicDataJud(number, endpoint);
    return Response.json({ number, formattedNumber: formatCnjNumber(number), tribunal: endpoint.label, state: records.length ? "found" : "not_found", records, checkedAt: new Date().toISOString(), documentationUrl: DATAJUD_DOCUMENTATION_URL });
  } catch {
    return Response.json({ error: "A API pública do CNJ não respondeu agora.", code: "DATAJUD_UNAVAILABLE", tribunal: endpoint.label, checkedAt: new Date().toISOString(), documentationUrl: DATAJUD_DOCUMENTATION_URL }, { status: 502 });
  }
}
