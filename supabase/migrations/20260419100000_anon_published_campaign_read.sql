-- Allow anonymous read of published campaigns and related rows needed for
-- PostgREST embeds (Hunt map, Explore campaigns carousel, campaign detail).

create policy "campaigns_select_anon_published"
  on public.campaigns for select
  to anon
  using (status = 'published');

create policy "campaign_vouchers_select_anon_published_campaign"
  on public.campaign_vouchers for select
  to anon
  using (
    exists (
      select 1
      from public.campaigns c
      where c.id = campaign_id
        and c.status = 'published'
    )
  );

create policy "menu_items_select_anon_published_campaign"
  on public.menu_items for select
  to anon
  using (
    exists (
      select 1
      from public.campaign_vouchers cv
      join public.campaigns c on c.id = cv.campaign_id
      where cv.menu_item_id = menu_items.id
        and c.status = 'published'
    )
  );

create policy "orgs_select_anon_published_campaign_org"
  on public.orgs for select
  to anon
  using (
    exists (
      select 1
      from public.campaigns c
      where c.org_id = orgs.id
        and c.status = 'published'
    )
  );
