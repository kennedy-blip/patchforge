import { owner, sb, fail, uuid, base } from "../../../../lib/cloud";
export async function POST(req: Request) {
  const user = await owner(req);
  if (!user) return fail("Builder session required", 401);
  const { input, recipe, authorized } = await req.json();
  if (
    !authorized ||
    !uuid.test(input) ||
    !recipe ||
    JSON.stringify(recipe).length > 2000
  )
    return fail("Invalid build request", 400);
  const signed = await sb(
    `/storage/v1/object/sign/raw-apks/${user}/${input}.apk`,
    { method: "POST", body: JSON.stringify({ expiresIn: 900 }) },
  );
  if (!signed.ok) return fail("Input unavailable", 404);
  const id = crypto.randomUUID();
  const row = await sb("/rest/v1/builds", {
    method: "POST",
    body: JSON.stringify({ id, owner_id: user }),
  });
  if (!row.ok) return fail("Cannot queue build", 503);
  const env = process.env;
  let r = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/actions/workflows/apk-patch-worker.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: env.WORKER_REF || "main",
        inputs: {
          build_id: id,
          apk_download_url:
            base + "/storage/v1" + (await signed.json()).signedURL,
          recipe_json_base64: Buffer.from(JSON.stringify(recipe)).toString(
            "base64",
          ),
          callback_url: env.STUDIO_URL + "/api/webhooks/build-complete",
        },
      }),
    },
  );
  if (!r.ok) {
    await sb("/rest/v1/builds?id=eq." + id, {
      method: "PATCH",
      body: '{"status":"Failed"}',
    });
    return fail("Dispatch failed", 502);
  }
  return Response.json({ id }, { status: 202 });
}
