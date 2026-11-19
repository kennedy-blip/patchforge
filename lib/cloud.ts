export const base = process.env.SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY;
export async function sb(path: string, init: RequestInit = {}) {
  if (!base || !key) throw Error("Cloud mode not configured");
  return fetch(base + path, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}
export async function owner(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const r = await sb("/auth/v1/user", { headers: { Authorization: auth } });
  return r.ok ? (await r.json()).id : null;
}
export const fail = (error: string, status: number) =>
  Response.json({ error }, { status });
export const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
