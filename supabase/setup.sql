create table public.builds(id uuid primary key, owner_id uuid not null references auth.users, status text not null default 'Queued', sha256 text, bytes bigint, created_at timestamptz not null default now());
alter table public.builds enable row level security;
create policy own_builds on public.builds for select to authenticated using (owner_id=auth.uid());
insert into storage.buckets(id,name,public,file_size_limit) values ('raw-apks','raw-apks',false,104857600),('patched-apks','patched-apks',false,104857600);
create policy own_inputs on storage.objects for insert to authenticated with check(bucket_id='raw-apks' and (storage.foldername(name))[1]=auth.uid()::text);
-- Do not rely on platform default grants to protect worker-written rows.
revoke all on public.builds from anon, authenticated;
grant select on public.builds to authenticated;
create index builds_owner_created on public.builds(owner_id,created_at);
create function public.limit_builds() returns trigger language plpgsql set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text,0));
 if (select count(*) from public.builds where owner_id=new.owner_id and created_at>now()-interval '1 hour')>=10 then raise exception 'Hourly build limit exceeded'; end if;
 return new;
end $$;
create trigger limit_builds before insert on public.builds for each row execute function public.limit_builds();
