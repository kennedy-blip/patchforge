"""Delete expired objects via Storage API (not by deleting storage metadata)."""
import datetime as dt
import json
import os
import urllib.request
base = os.environ['SUPABASE_URL'] + '/storage/v1/object/'
key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=1)

def call(method, path, data):
    req = urllib.request.Request(base + path, json.dumps(data).encode(), method=method,
        headers={'Authorization': 'Bearer ' + key, 'apikey': key, 'Content-Type':'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)

def expired(bucket, prefix=''):
    offset = 0
    while True:
        rows = call('POST', 'list/' + bucket, dict(prefix=prefix, offset=offset, limit=100, sortBy={'column':'name','order':'asc'}))
        for row in rows:
            path = prefix + row['name']
            if row.get('id') is None:
                yield from expired(bucket, path + '/')
            elif dt.datetime.fromisoformat(row['created_at'].replace('Z','+00:00')) <= cutoff:
                yield path
        if len(rows) < 100:
            break
        offset += len(rows)

for bucket in ('raw-apks','patched-apks'):
    paths = list(expired(bucket))
    for i in range(0,len(paths),100):
        call('DELETE',bucket,dict(prefixes=paths[i:i+100]))
