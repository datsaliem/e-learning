-- SEO settings and CMS-driven sitemap registry.
--
-- Public readers only receive settings needed to build metadata/robots and
-- published sitemap entries. Every write remains restricted to admins by RLS.

create or replace function public.is_valid_robots_paths(input_paths text[])
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select
    cardinality(input_paths) <= 100
    and array_position(input_paths, null) is null
    and coalesce(
      (
        select bool_and(
          char_length(path) between 1 and 200
          and path ~ '^/[!-~]*$'
        )
        from unnest(input_paths) as path
      ),
      true
    );
$$;

create table public.seo_settings (
  id boolean primary key default true
    check (id),
  site_name text not null default 'E-Learning'
    check (char_length(btrim(site_name)) between 2 and 80),
  site_description text not null
    default 'Học kỹ năng mới, tiến xa hơn trong sự nghiệp với các khóa học trực tuyến chất lượng.'
    check (char_length(btrim(site_description)) between 20 and 300),
  organization_name text not null default 'E-Learning'
    check (char_length(btrim(organization_name)) between 2 and 120),
  organization_logo_url text,
  default_og_image_url text not null default '/og.png',
  twitter_handle text,
  index_site boolean not null default true,
  follow_links boolean not null default true,
  sitemap_enabled boolean not null default true,
  crawl_delay integer
    check (crawl_delay is null or crawl_delay between 1 and 86400),
  robots_allow text[] not null default array['/']::text[],
  robots_disallow text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seo_settings_organization_logo_url_check
    check (
      organization_logo_url is null
      or organization_logo_url ~ '^https://'
      or organization_logo_url ~ '^/[A-Za-z0-9._~!$&''()*+,;=:@%/-]+$'
    ),
  constraint seo_settings_default_og_image_url_check
    check (
      default_og_image_url ~ '^https://'
      or default_og_image_url ~ '^/[A-Za-z0-9._~!$&''()*+,;=:@%/-]+$'
    ),
  constraint seo_settings_twitter_handle_check
    check (
      twitter_handle is null
      or twitter_handle ~ '^@[A-Za-z0-9_]{1,15}$'
    ),
  constraint seo_settings_robots_allow_check
    check (public.is_valid_robots_paths(robots_allow)),
  constraint seo_settings_robots_disallow_check
    check (public.is_valid_robots_paths(robots_disallow))
);

comment on table public.seo_settings is
  'Singleton public SEO configuration edited by administrators and consumed by metadata routes.';

insert into public.seo_settings (id)
values (true)
on conflict (id) do nothing;

create table public.seo_sitemap_entries (
  id uuid primary key default gen_random_uuid(),
  content_type text not null
    check (content_type in ('blog', 'product', 'page')),
  path text not null unique
    check (
      path ~ '^/(?:[a-z0-9]+(?:-[a-z0-9]+)*/?)+$'
      and path !~ '^/(admin|dashboard|checkout|learn|instructor|my-courses|profile|settings|cart|auth|login|register|forgot-password|reset-password|check-email)(/|$)'
    ),
  title text not null
    check (char_length(btrim(title)) between 2 and 160),
  description text
    check (description is null or char_length(btrim(description)) <= 300),
  image_url text,
  is_published boolean not null default false,
  change_frequency text not null default 'weekly'
    check (
      change_frequency in ('always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never')
    ),
  priority numeric(2, 1) not null default 0.7
    check (priority between 0 and 1),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seo_sitemap_entries_image_url_check
    check (
      image_url is null
      or image_url ~ '^https://'
      or image_url ~ '^/[A-Za-z0-9._~!$&''()*+,;=:@%/-]+$'
    )
);

comment on table public.seo_sitemap_entries is
  'Published blog, product, and page URLs registered by the CMS for automatic sitemap generation.';

create index seo_sitemap_entries_public_idx
  on public.seo_sitemap_entries (content_type, updated_at desc)
  where is_published;

drop trigger if exists seo_settings_set_updated_at on public.seo_settings;
create trigger seo_settings_set_updated_at
before update on public.seo_settings
for each row execute function public.set_updated_at();

drop trigger if exists seo_sitemap_entries_set_updated_at on public.seo_sitemap_entries;
create trigger seo_sitemap_entries_set_updated_at
before update on public.seo_sitemap_entries
for each row execute function public.set_updated_at();

create or replace function private.set_seo_sitemap_published_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.is_published then
    new.published_at := coalesce(new.published_at, statement_timestamp());
  elsif tg_op = 'UPDATE' and new.is_published and not old.is_published then
    new.published_at := coalesce(new.published_at, statement_timestamp());
  elsif not new.is_published then
    new.published_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists seo_sitemap_entries_set_published_at
  on public.seo_sitemap_entries;
create trigger seo_sitemap_entries_set_published_at
before insert or update of is_published on public.seo_sitemap_entries
for each row execute function private.set_seo_sitemap_published_at();

revoke all on function private.set_seo_sitemap_published_at()
  from public, anon, authenticated;

alter table public.seo_settings enable row level security;
alter table public.seo_sitemap_entries enable row level security;

revoke all on function public.is_valid_robots_paths(text[])
  from public, anon, authenticated;
grant execute on function public.is_valid_robots_paths(text[])
  to authenticated;

revoke all on table public.seo_settings from public, anon, authenticated;
revoke all on table public.seo_sitemap_entries from public, anon, authenticated;

grant select on table public.seo_settings to anon, authenticated;
grant select on table public.seo_sitemap_entries to anon, authenticated;
grant insert, update, delete on table public.seo_settings to authenticated;
grant insert, update, delete on table public.seo_sitemap_entries to authenticated;

create policy "seo_settings_public_select"
on public.seo_settings
for select
to anon, authenticated
using (true);

create policy "seo_settings_admin_insert"
on public.seo_settings
for insert
to authenticated
with check ((select public.is_admin()));

create policy "seo_settings_admin_update"
on public.seo_settings
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "seo_settings_admin_delete"
on public.seo_settings
for delete
to authenticated
using ((select public.is_admin()));

create policy "seo_sitemap_entries_published_select"
on public.seo_sitemap_entries
for select
to anon, authenticated
using (is_published);

create policy "seo_sitemap_entries_admin_select"
on public.seo_sitemap_entries
for select
to authenticated
using ((select public.is_admin()));

create policy "seo_sitemap_entries_admin_insert"
on public.seo_sitemap_entries
for insert
to authenticated
with check ((select public.is_admin()));

create policy "seo_sitemap_entries_admin_update"
on public.seo_sitemap_entries
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "seo_sitemap_entries_admin_delete"
on public.seo_sitemap_entries
for delete
to authenticated
using ((select public.is_admin()));
