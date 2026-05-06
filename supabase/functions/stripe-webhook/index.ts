/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import Stripe from 'npm:stripe@17.7.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const whSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!stripeKey || !whSecret || !supabaseUrl || !serviceKey) {
    console.error('stripe-webhook: missing env');
    return new Response('Server misconfigured', { status: 500 });
  }

  const stripe = new Stripe(stripeKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return new Response('No stripe-signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, whSecret);
  } catch (err) {
    console.error('Webhook signature failed', err);
    return new Response(`Webhook Error: ${err instanceof Error ? err.message : err}`, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  try {
    if (event.type === 'checkout.session.completed') {
      const sess = event.data.object as Stripe.Checkout.Session;
      if (sess.payment_status !== 'paid') {
        return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      const sessionId = sess.id;
      const pi =
        typeof sess.payment_intent === 'string'
          ? sess.payment_intent
          : sess.payment_intent && typeof sess.payment_intent === 'object' && 'id' in sess.payment_intent
            ? sess.payment_intent.id
            : null;

      const { data: row, error: findErr } = await admin
        .from('campaign_claim_payments')
        .select('*')
        .eq('stripe_checkout_session_id', sessionId)
        .maybeSingle();

      if (findErr) {
        console.error(findErr);
        return new Response(JSON.stringify({ error: findErr.message }), { status: 500 });
      }

      if (!row) {
        console.warn('No campaign_claim_payments for session', sessionId);
        return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (row.status === 'minted') {
        return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (row.status === 'failed' || row.status === 'refunded') {
        return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (row.status === 'pending') {
        const { error: upErr } = await admin
          .from('campaign_claim_payments')
          .update({
            status: 'paid',
            stripe_payment_intent_id: pi,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id);

        if (upErr) {
          console.error(upErr);
          return new Response(JSON.stringify({ error: upErr.message }), { status: 500 });
        }
      } else if (row.status === 'paid' && pi && !row.stripe_payment_intent_id) {
        await admin
          .from('campaign_claim_payments')
          .update({ stripe_payment_intent_id: pi, updated_at: new Date().toISOString() })
          .eq('id', row.id);
      }

      const { error: finErr } = await admin.rpc('finalize_campaign_claim_after_checkout', {
        p_checkout_session_id: sessionId,
      });

      if (finErr) {
        console.error('finalize_campaign_claim_after_checkout', finErr);
        const msg = finErr.message ?? 'MINT_FAILED';
        if (pi) {
          try {
            await stripe.refunds.create({ payment_intent: pi });
          } catch (rErr) {
            console.error('refund failed', rErr);
          }
        }
        await admin
          .from('campaign_claim_payments')
          .update({
            status: 'failed',
            mint_error: msg,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id);
      }
    }

    if (event.type === 'charge.refunded') {
      const ch = event.data.object as Stripe.Charge;
      const pi =
        typeof ch.payment_intent === 'string'
          ? ch.payment_intent
          : ch.payment_intent && typeof ch.payment_intent === 'object' && 'id' in ch.payment_intent
            ? ch.payment_intent.id
            : null;
      if (pi) {
        await admin
          .from('campaign_claim_payments')
          .update({ status: 'refunded', updated_at: new Date().toISOString() })
          .eq('stripe_payment_intent_id', pi);
      }
    }
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
