/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import Stripe from 'npm:stripe@17.7.0';
import { corsHeaders } from '../_shared/cors.ts';

type Body = {
  campaignId: string;
  channel: 'grab' | 'hunt';
  huntQrPayload?: string | null;
};

const APP_URL = () => Deno.env.get('APP_URL') ?? 'https://www.coffee-bro.com';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function remainingForVoucher(
  admin: ReturnType<typeof createClient>,
  campaignVoucherId: string,
  quantity: number,
): Promise<number> {
  const { count, error } = await admin
    .from('vouchers')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_voucher_id', campaignVoucherId);
  if (error) throw error;
  return quantity - (count ?? 0);
}

async function assertEligibleForCheckout(
  admin: ReturnType<typeof createClient>,
  userId: string,
  campaignId: string,
  channel: 'grab' | 'hunt',
  huntQrPayload: string | null,
) {
  const { data: campaign, error: cErr } = await admin
    .from('campaigns')
    .select(
      'id, org_id, status, campaign_type, start_at, end_at, reward_mode, reward_per_action, display_title, qr_payload',
    )
    .eq('id', campaignId)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!campaign) {
    const e = new Error('CAMPAIGN_NOT_FOUND');
    (e as Error & { code?: string }).code = 'CAMPAIGN_NOT_FOUND';
    throw e;
  }
  if (campaign.status !== 'published') {
    const e = new Error('CAMPAIGN_NOT_PUBLISHED');
    (e as Error & { code?: string }).code = 'CAMPAIGN_NOT_PUBLISHED';
    throw e;
  }
  if (channel === 'grab' && campaign.campaign_type !== 'grab') {
    const e = new Error('NOT_GRAB_CAMPAIGN');
    (e as Error & { code?: string }).code = 'NOT_GRAB_CAMPAIGN';
    throw e;
  }
  if (channel === 'hunt' && campaign.campaign_type !== 'hunt') {
    const e = new Error('NOT_HUNT_CAMPAIGN');
    (e as Error & { code?: string }).code = 'NOT_HUNT_CAMPAIGN';
    throw e;
  }
  if (channel === 'hunt') {
    const p = huntQrPayload?.trim() ?? '';
    if (!p || campaign.qr_payload?.trim() !== p) {
      const e = new Error('HUNT_NOT_FOUND');
      (e as Error & { code?: string }).code = 'HUNT_NOT_FOUND';
      throw e;
    }
  }

  const now = new Date().toISOString();
  if (!campaign.start_at || !campaign.end_at || now < campaign.start_at || now > campaign.end_at) {
    const e = new Error('CAMPAIGN_NOT_IN_WINDOW');
    (e as Error & { code?: string }).code = 'CAMPAIGN_NOT_IN_WINDOW';
    throw e;
  }

  const { count: claimedCount, error: clErr } = await admin
    .from('vouchers')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('owner_id', userId);
  if (clErr) throw clErr;
  if ((claimedCount ?? 0) > 0) {
    const e = new Error('ALREADY_CLAIMED');
    (e as Error & { code?: string }).code = 'ALREADY_CLAIMED';
    throw e;
  }

  const { data: rows, error: vErr } = await admin
    .from('campaign_vouchers')
    .select('id, quantity')
    .eq('campaign_id', campaignId);
  if (vErr) throw vErr;
  if (!rows?.length) {
    const e = new Error('NO_VOUCHER_DEFINITION');
    (e as Error & { code?: string }).code = 'NO_VOUCHER_DEFINITION';
    throw e;
  }

  let poolOk = false;
  for (const row of rows) {
    const rem = await remainingForVoucher(admin, row.id, row.quantity);
    if (rem >= 1) {
      poolOk = true;
      break;
    }
  }
  if (!poolOk) {
    const e = new Error('POOL_EMPTY');
    (e as Error & { code?: string }).code = 'POOL_EMPTY';
    throw e;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

  if (!supabaseUrl || !serviceKey || !anonKey || !stripeKey) {
    console.error('Missing env: SUPABASE_URL, keys, or STRIPE_SECRET_KEY');
    return json({ error: 'Server misconfigured' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Missing authorization' }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return json({ error: 'NOT_AUTHORIZED' }, 401);
  }
  const userId = userData.user.id;
  const email = userData.user.email ?? undefined;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const campaignId = body.campaignId?.trim();
  const channel = body.channel;
  if (!campaignId || (channel !== 'grab' && channel !== 'hunt')) {
    return json({ error: 'campaignId and channel (grab|hunt) required' }, 400);
  }
  const huntQr = channel === 'hunt' ? (body.huntQrPayload?.trim() ?? null) : null;
  if (channel === 'hunt' && !huntQr) {
    return json({ error: 'huntQrPayload required for hunt' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  try {
    await assertEligibleForCheckout(admin, userId, campaignId, channel, huntQr);
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code ?? (e as Error).message;
    const msg = String((e as Error).message ?? e);
    const status = msg === 'NOT_AUTHORIZED' || msg.includes('JWT') ? 401 : 400;
    return json({ error: msg, code }, status);
  }

  const { data: priceRows, error: priceErr } = await admin.rpc('compute_campaign_claim_amount_cents', {
    p_campaign_id: campaignId,
  });
  if (priceErr) {
    console.error(priceErr);
    return json({ error: priceErr.message ?? 'Pricing failed' }, 400);
  }
  const price = priceRows?.[0];
  if (!price) {
    return json({ error: 'Pricing failed' }, 400);
  }
  if (!price.requires_payment) {
    return json({ requiresPayment: false, amountCents: price.amount_cents, currency: price.currency });
  }

  const nowIso = new Date().toISOString();
  const { data: pendingExisting } = await admin
    .from('campaign_claim_payments')
    .select('*')
    .eq('user_id', userId)
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')
    .gt('stripe_checkout_expires_at', nowIso)
    .maybeSingle();

  const stripe = new Stripe(stripeKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  if (pendingExisting?.stripe_checkout_session_id) {
    try {
      const sess = await stripe.checkout.sessions.retrieve(pendingExisting.stripe_checkout_session_id);
      if (sess.status === 'open' && sess.url) {
        return json({
          requiresPayment: true,
          checkoutUrl: sess.url,
          sessionId: sess.id,
          reused: true,
        });
      }
    } catch (err) {
      console.warn('Could not retrieve existing session', err);
    }
    await admin
      .from('campaign_claim_payments')
      .update({ status: 'failed', mint_error: 'STALE_CHECKOUT_SESSION', updated_at: new Date().toISOString() })
      .eq('id', pendingExisting.id);
  }

  const { data: voucherRow } = await admin
    .from('campaign_vouchers')
    .select('offer_type, menu_item_id')
    .eq('campaign_id', campaignId)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  let menuItemName = 'Reward';
  if (voucherRow?.menu_item_id) {
    const { data: mi } = await admin
      .from('menu_items')
      .select('item_name')
      .eq('id', voucherRow.menu_item_id)
      .maybeSingle();
    if (mi?.item_name) menuItemName = mi.item_name;
  }
  const offerLabel = voucherRow?.offer_type?.replaceAll('_', ' ') ?? 'offer';

  const { data: campRow } = await admin
    .from('campaigns')
    .select('display_title')
    .eq('id', campaignId)
    .single();
  const title = campRow?.display_title?.trim() || 'Coffeebro campaign';
  const lineName = `${title} — ${offerLabel} — ${menuItemName}`;

  const base = APP_URL().replace(/\/$/, '');
  const successUrl = `${base}/campaigns/${campaignId}/claim/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl =
    channel === 'hunt' ? `${base}/hunts/scan` : `${base}/campaigns/${campaignId}`;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: email,
    line_items: [
      {
        price_data: {
          currency: price.currency ?? 'hkd',
          unit_amount: price.amount_cents,
          product_data: { name: lineName },
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      supabase_user_id: userId,
      campaign_id: campaignId,
      claim_channel: channel,
      hunt_qr_payload: huntQr ?? '',
    },
    payment_intent_data: {
      metadata: {
        supabase_user_id: userId,
        campaign_id: campaignId,
        claim_channel: channel,
        hunt_qr_payload: huntQr ?? '',
      },
    },
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 23,
  });

  if (!session.url) {
    return json({ error: 'Stripe did not return checkout URL' }, 500);
  }

  const expiresAt = session.expires_at
    ? new Date(session.expires_at * 1000).toISOString()
    : new Date(Date.now() + 60 * 60 * 23 * 1000).toISOString();

  const { error: insErr } = await admin.from('campaign_claim_payments').insert({
    user_id: userId,
    campaign_id: campaignId,
    claim_channel: channel,
    hunt_qr_payload: huntQr,
    stripe_checkout_session_id: session.id,
    amount_cents: price.amount_cents,
    currency: price.currency ?? 'hkd',
    status: 'pending',
    stripe_checkout_expires_at: expiresAt,
  });

  if (insErr) {
    console.error(insErr);
    await stripe.checkout.sessions.expire(session.id).catch(() => null);
    return json({ error: insErr.message ?? 'Could not save checkout session' }, 500);
  }

  return json({
    requiresPayment: true,
    checkoutUrl: session.url,
    sessionId: session.id,
  });
});
