/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import Stripe from 'npm:stripe@17.7.0';
import { corsHeaders } from '../_shared/cors.ts';

type Body = {
  packageId: string;
  tier: 'single' | 'duo';
};

const APP_URL = () => Deno.env.get('APP_URL') ?? 'https://www.coffee-bro.com';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

  const packageId = body.packageId?.trim();
  const tier = body.tier;
  if (!packageId || (tier !== 'single' && tier !== 'duo')) {
    return json({ error: 'packageId and tier (single|duo) required' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: pkg, error: pkgErr } = await admin
    .from('tasting_packages')
    .select('id, title, status, single_price_cents, duo_price_cents')
    .eq('id', packageId)
    .maybeSingle();

  if (pkgErr) return json({ error: pkgErr.message }, 400);
  if (!pkg || pkg.status !== 'published') {
    return json({ error: 'PACKAGE_NOT_PUBLISHED', code: 'PACKAGE_NOT_PUBLISHED' }, 400);
  }

  const { count: shopCount, error: shopErr } = await admin
    .from('tasting_package_shops')
    .select('*', { count: 'exact', head: true })
    .eq('package_id', packageId)
    .eq('tier', tier);
  if (shopErr) return json({ error: shopErr.message }, 400);
  if ((shopCount ?? 0) === 0) {
    return json({ error: 'NO_SHOPS_FOR_TIER', code: 'NO_SHOPS_FOR_TIER' }, 400);
  }

  const { count: existingPurchase, error: existErr } = await admin
    .from('tasting_package_purchases')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('package_id', packageId)
    .eq('tier', tier)
    .in('status', ['pending', 'paid', 'minted']);
  if (existErr) return json({ error: existErr.message }, 400);
  if ((existingPurchase ?? 0) > 0) {
    return json({ error: 'ALREADY_PURCHASED', code: 'ALREADY_PURCHASED' }, 400);
  }

  const amountCents = tier === 'single' ? pkg.single_price_cents : pkg.duo_price_cents;
  const nowIso = new Date().toISOString();

  const { data: pendingExisting } = await admin
    .from('tasting_package_purchases')
    .select('*')
    .eq('user_id', userId)
    .eq('package_id', packageId)
    .eq('tier', tier)
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
      .from('tasting_package_purchases')
      .update({ status: 'failed', mint_error: 'STALE_CHECKOUT_SESSION', updated_at: new Date().toISOString() })
      .eq('id', pendingExisting.id);
  }

  const tierLabel = tier === 'single' ? 'Single' : 'Duo';
  const lineName = `${pkg.title} — Tasting Package (${tierLabel})`;
  const base = APP_URL().replace(/\/$/, '');
  const successUrl = `${base}/tasting-packages/${packageId}/purchase/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${base}/tasting-packages/${packageId}`;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: email,
    line_items: [
      {
        price_data: {
          currency: 'hkd',
          unit_amount: amountCents,
          product_data: { name: lineName },
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      supabase_user_id: userId,
      tasting_package_id: packageId,
      tasting_tier: tier,
    },
    payment_intent_data: {
      metadata: {
        supabase_user_id: userId,
        tasting_package_id: packageId,
        tasting_tier: tier,
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

  const { error: insErr } = await admin.from('tasting_package_purchases').insert({
    user_id: userId,
    package_id: packageId,
    tier,
    stripe_checkout_session_id: session.id,
    amount_cents: amountCents,
    currency: 'hkd',
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
