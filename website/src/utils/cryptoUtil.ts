// Browser equivalent of frontend/src/services/cryptoService.ts's hashString.
// The website has no local PDF file to hash (PDFs are server-generated only,
// per plan decision) — instead we hash the prescription id + signature as a
// lightweight tamper-evidence fingerprint, stored the same way pdf_hash
// already is on the backend.
export async function hashString(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
