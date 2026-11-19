#!/usr/bin/env bash
# Run from a trusted operator machine. Never enable xtrace or log signed URLs.
set -euo pipefail
umask 077
: "${STUDIO_URL:?Set the deployed Studio HTTPS origin}"
: "${SUPABASE_URL:?Set the matching Supabase HTTPS origin}"
: "${NEXT_PUBLIC_SUPABASE_ANON_KEY:?Set the public client key}"
: "${SMOKE_ACCESS_TOKEN:?Inject a short-lived Supabase builder session}"
for origin in "$STUDIO_URL" "$SUPABASE_URL"; do
  [[ "$origin" =~ ^https://[a-zA-Z0-9.-]+$ ]] || { echo 'Expected HTTPS origin without trailing slash' >&2; exit 1; }
done
for tool in curl jq sha256sum apksigner aapt2; do command -v "$tool" >/dev/null || { echo "Missing $tool" >&2; exit 1; }; done
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
cd "$tmp"
http=(curl --silent --show-error --fail --proto '=https' --max-time 60)
bearer=(-H "Authorization: Bearer $SMOKE_ACCESS_TOKEN")
storage=("${bearer[@]}" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY")
"${http[@]}" -H 'Accept: application/vnd.github.raw+json' https://api.github.com/repos/androguard/androguard/git/blobs/928ce6f670fee375f2d1d0f63d588ae47fef20bc -o input.apk
echo 'f427a0ebe0bca97b9acf6cd2a2a01c37a7d3762841810fc54a7191ec637330b2  input.apk' | sha256sum -c -
owner=$("${http[@]}" "${storage[@]}" "$SUPABASE_URL/auth/v1/user" | jq -er '.id')
input=$(python3 -c 'import uuid; print(uuid.uuid4())')
"${http[@]}" "${storage[@]}" -H 'Content-Type: application/vnd.android.package-archive' --data-binary @input.apk "$SUPABASE_URL/storage/v1/object/raw-apks/$owner/$input.apk" >/dev/null
label="PatchForge Smoke ${input:0:8}"
payload=$(jq -nc --arg input "$input" --arg label "$label" '{input:$input,authorized:true,recipe:{app_name:$label}}')
id=$("${http[@]}" "${bearer[@]}" -H 'Content-Type: application/json' -d "$payload" "$STUDIO_URL/api/builds/trigger" | jq -er '.id')
echo "Dispatched build $id; waiting for callback"
deadline=$((SECONDS+1200))
while ((SECONDS<deadline)); do
  "${http[@]}" "${bearer[@]}" "$STUDIO_URL/api/builds/$id" > row.json
  case $(jq -er '.status' row.json) in
    Queued) sleep 6;;
    Failed) echo "Worker reported failure for $id" >&2; exit 1;;
    Ready)
      url=$(jq -er '.download' row.json)
      [[ "$url" == "$SUPABASE_URL/storage/v1/object/sign/patched-apks/$id.apk?"* ]]
      "${http[@]}" "$url" -o output.apk
      hash=$(sha256sum output.apk | cut -d' ' -f1)
      jq -e --arg hash "$hash" --arg id "$id" --argjson size "$(wc -c < output.apk)" '.id==$id and .sha256==$hash and .bytes==$size' row.json >/dev/null
      apksigner verify output.apk
      aapt2 dump badging output.apk > badging.txt
      grep -Fx "application-label:'$label'" badging.txt >/dev/null
      echo "PASS: $id signature, application label, byte count and SHA-256 verified: $hash"; exit 0;;
    *) echo 'Unexpected build state' >&2; exit 1;;
  esac
done
echo "Timed out waiting for callback: $id" >&2; exit 1
