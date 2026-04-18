-- Allow voucher owners to read claim spots linked to campaigns for vouchers they hold,
-- even when the campaign is no longer published (ended / unpublished).

drop policy if exists "org_claim_spots_select_voucher_owner" on public.org_claim_spots;

create policy "org_claim_spots_select_voucher_owner"
  on public.org_claim_spots for select
  to authenticated
  using (
    exists (
      select 1
      from public.vouchers v
      left join public.campaign_vouchers cv on cv.id = v.campaign_voucher_id
      join public.campaigns c on c.id = coalesce(cv.campaign_id, v.campaign_id)
      where v.owner_id = auth.uid()
        and c.claim_spot_id = org_claim_spots.id
    )
  );

comment on policy "org_claim_spots_select_voucher_owner" on public.org_claim_spots is
  'Voucher holders can read the pickup spot for campaigns tied to their vouchers (wallet / redeem UI).';
