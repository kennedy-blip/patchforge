import { createHmac, timingSafeEqual } from "crypto";
import { sb, fail, uuid } from "../../../../lib/cloud";
export async function POST(req: Request) {
  let secret = process.env.WEBHOOK_SECRET;
  if (!secret) return fail("Not configured", 503);
  let body = await req.text(),
    sig = Buffer.from(req.headers.get("x-signature") || "", "hex"),
    mac = createHmac("sha256", secret).update(body).digest();
  if (sig.length !== mac.length || !timingSafeEqual(sig, mac))
    return fail("Invalid signature", 401);
  let { id, status, sha256, bytes } = JSON.parse(body);
  if (!uuid.test(id) || !["Ready", "Failed"].includes(status))
    return fail("Invalid event", 400);
  let r = await sb(`/rest/v1/builds?id=eq.${id}&status=eq.Queued`, {
    method: "PATCH",
    body: JSON.stringify({ status, sha256, bytes }),
  });
  return new Response(null, { status: r.ok ? 204 : 502 });
}
