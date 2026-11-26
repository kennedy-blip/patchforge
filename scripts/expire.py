"""Delete expired objects via Storage API (not by deleting storage metadata)."""
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request

url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
if not url or not key:
    print(
        "::warning::Expiry cleanup skipped: configure repository variable "
        "SUPABASE_URL and Actions secret SUPABASE_SERVICE_ROLE_KEY. "
        "No objects were deleted."
    )
    sys.exit(0)
if not url.startswith("https://") or ".supabase.co" not in url:
    raise SystemExit("SUPABASE_URL must be the HTTPS URL of your Supabase project.")

base = url + "/storage/v1/object/"
cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=1)


def call(method, path, data):
    req = urllib.request.Request(
        base + path,
        json.dumps(data).encode(),
        method=method,
        headers={
            "Authorization": "Bearer " + key,
            "apikey": key,
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", "replace")[:500]
        raise RuntimeError(
            f"Supabase Storage returned HTTP {error.code}: {body}"
        ) from error


def expired(bucket, prefix=""):
    offset = 0
    while True:
        rows = call(
            "POST",
            "list/" + bucket,
            {
                "prefix": prefix,
                "offset": offset,
                "limit": 100,
                "sortBy": {"column": "name", "order": "asc"},
            },
        )
        for row in rows:
            path = prefix + row["name"]
            if row.get("id") is None:
                yield from expired(bucket, path + "/")
            elif dt.datetime.fromisoformat(
                row["created_at"].replace("Z", "+00:00")
            ) <= cutoff:
                yield path
        if len(rows) < 100:
            break
        offset += len(rows)


for bucket in ("raw-apks", "patched-apks"):
    paths = list(expired(bucket))
    print(f"{bucket}: found {len(paths)} expired object(s)")
    for index in range(0, len(paths), 100):
        call("DELETE", bucket, {"prefixes": paths[index:index + 100]})
print("Expiry cleanup completed.")
