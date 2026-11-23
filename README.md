# PatchForge Studio

A browser-based Android branding workbench with a local recipe demo and a configurable GitHub Actions worker. The local demo is a simulation, not an APK compiler. It does not issue fake APK downloads.

## Run locally

Use Node 22 and Python 3.11+. Run `npm ci`, `npm run dev` and open the printed URL. No secrets are required. Switch samples in Explorer, edit a recipe, preview the label diff and run the demo pipeline. Theme and recent build labels persist in browser storage. A local custom file goes to the local Next.js inspection endpoint for ZIP-directory validation; it is not stored. Never submit a package without permission.

```
npm run build
python3 -m unittest discover -s scripts
```

## Connect the cloud worker

1. In an existing Supabase project run `supabase/setup.sql` once. It creates private input/output buckets, owner-scoped input insert access and read-only build history. Verify your plan permits 100 MiB objects; a lower project limit overrides bucket settings.
2. Enable email magic links or configure the GitHub OAuth provider. Set Auth's site URL and permitted redirects to your exact Studio deployment URL.
3. Import this repository as a Next.js project in Vercel. Copy the keys from `.env.example` into project environment settings; for local cloud testing use `.env.local`. Both Supabase URLs refer to the same project. Only the anonymous key and public URL belong in the browser. Keep service-role credentials server-only.
4. Set `GITHUB_REPOSITORY=owner/repo`, `WORKER_REF` to the trusted workflow ref, and `GITHUB_DISPATCH_TOKEN` to a fine-grained token restricted to this repository with Actions write access. `STUDIO_URL` must be the public HTTPS origin without a trailing slash. Generate a long random `WEBHOOK_SECRET` and share it only between Vercel and Actions.
5. Install the workflows on the repository's default branch, enable Actions, and configure **repository variables** `SUPABASE_URL`, `STUDIO_URL` and **Actions secrets** `SUPABASE_SERVICE_ROLE_KEY`, `WEBHOOK_SECRET`. Protect workflow changes and restrict write access; the worker has privileged storage access. Redeploy the web application after setting public environment variables.
6. Sign in via the header avatar, attest ownership and select your APK. Cloud intake sends the object directly to your private owner directory, bypassing Vercel request body limits. The worker validates the source archive, decodes resources without disassembling DEX, applies the recipe, rebuilds, aligns, signs with a per-job debug key, verifies and stores the result. It authenticates its completion callback with HMAC-SHA256. Status reads require the owner's bearer token. Installation over an existing differently signed app is not supported.
7. Inspect build logs in Actions. The Studio polls for final status. Signed artifact links last 60 seconds and can be refreshed through the owner-only status API until the 24-hour retention window ends. An hourly workflow deletes expired objects (actual deletion depends on runner availability). Build metadata is retained. The SQL trigger limits each builder to ten dispatches per hour.

## Android companion release

Generate a dedicated release keystore offline. Put its base64 encoding in the Actions secret `STUDIO_KEYSTORE_BASE64` and its password in `STUDIO_KEYSTORE_PASSWORD` (same store/key password). Keep a secure offline backup. Set `STUDIO_URL` to the deployed HTTPS origin, then run **Publish Studio Android wrapper**. The workflow assembles the Android wrapper, aligns and signs it, verifies the signature, and publishes `PatchForge-Studio.apk`. The header's **Download App** button downloads the latest release APK directly; it defaults to `https://github.com/kennedy-blip/patchforge/releases/latest/download/PatchForge-Studio.apk`. Set `NEXT_PUBLIC_STUDIO_APK_URL` only if you want to override that location. A release asset is available after the signing key and `STUDIO_URL` are configured and the publish workflow succeeds. The pull-request verification workflow also compiles an unsigned release APK to catch Android/Gradle errors without needing the production signing key.

## Current scope

The sample profiles are demo fixtures, not bundled third-party binaries. Real authenticated builds support label, package suffix, explicit application flags and primary color. Changing package identity does not migrate hardcoded identities inside binary code. Review the generated app on a test device. Binary manifest/signature/permission inspection, adaptive launcher icons, custom bytecode rules, user keystore management, admin controls and intermediate runner log streaming are not implemented. Production account provisioning, mobile device testing and end-to-end cloud verification are deployment tasks; a passing Next build does not verify them.

## Verify one real build (not demo mode)

The dispatch route reads `GITHUB_DISPATCH_TOKEN` and `GITHUB_REPOSITORY` (`owner/repo`) **on Vercel**, not `GITHUB_TOKEN`, `GITHUB_OWNER` or `GITHUB_REPO`. The worker does not need that dispatch token. On both sides use identical `STUDIO_URL` and `SUPABASE_URL` origins, without trailing slashes, and the same `WEBHOOK_SECRET`. The callback checks `X-Signature = hex(HMAC-SHA256(secret, raw request body))`; GitHub's built-in webhook settings are not used. The worker workflow must already exist on the default branch, and `WORKER_REF` must contain the tested implementation. Use a reachable callback origin without interactive deployment protection.

From a trusted Linux machine with Python 3, jq, curl, sha256sum and Android Build Tools (`apksigner` and `aapt2` on PATH), inject the two origins, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SMOKE_ACCESS_TOKEN` through your environment/secret manager. The latter is a short-lived **user session** for a designated test builder, not a service-role key. Do not paste it into chat or commit it. Run `./scripts/smoke-build.sh` once. It downloads the immutable `tests/data/APK/hello-world.apk` fixture from the Androguard repo, verifies its SHA-256, uploads it under that user's UUID, and dispatches exactly one build through the normal API. It polls for up to 20 minutes and requires an actual signed download with matching callback checksum/size and the new label. It never writes a callback itself. Temporary files are removed on exit; remote objects follow the normal retention policy. Keep the printed build ID and SHA as evidence, not the expiring download URL. A queued timeout is not proof of failure: inspect the existing Actions run and callback configuration before retrying.
