import { owner, sb, fail, uuid, base } from "../../../../lib/cloud";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let user = await owner(req);
  if (!user) return fail("Unauthorized", 401);
  let { id } = await params;
  if (!uuid.test(id)) return fail("Invalid ID", 400);
  let r = await sb(`/rest/v1/builds?id=eq.${id}&owner_id=eq.${user}&select=*`);
  if (!r.ok) return fail("Database unavailable", 503);
  let [row] = await r.json();
  if (!row) return fail("Unknown build", 404);
  if (
    row.status === "Ready" &&
    Date.now() - Date.parse(row.created_at) < 86400000
  ) {
    let sig = await sb(`/storage/v1/object/sign/patched-apks/${id}.apk`, {
      method: "POST",
      body: '{"expiresIn":60}',
    });
    if (sig.ok)
      row.download = base + "/storage/v1" + (await sig.json()).signedURL;
  }
  return Response.json(row);
}
