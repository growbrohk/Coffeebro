-- Logged-in users (authenticated) use orgs RLS policies for the JWT role only.
-- Mirror anon public-directory access: allow reading an org row when the org has
-- a published campaign, so campaign embeds (lat/lng, name) work for customers
-- who are not org_hosts on that org.

create policy "orgs_select_authenticated_published_campaign_org"
  on public.orgs for select
  to authenticated
  using (
    exists (
      select 1
      from public.campaigns c
      where c.org_id = orgs.id
        and c.status = 'published'
    )
  );
