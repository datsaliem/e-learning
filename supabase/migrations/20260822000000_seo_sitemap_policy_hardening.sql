-- Keep one permissive SELECT policy per database role. Anonymous readers can
-- only see published entries; authenticated admins additionally see drafts.

drop policy if exists "seo_sitemap_entries_published_select"
  on public.seo_sitemap_entries;
drop policy if exists "seo_sitemap_entries_admin_select"
  on public.seo_sitemap_entries;

create policy "seo_sitemap_entries_anon_select"
on public.seo_sitemap_entries
for select
to anon
using (is_published);

create policy "seo_sitemap_entries_authenticated_select"
on public.seo_sitemap_entries
for select
to authenticated
using (is_published or (select public.is_admin()));
