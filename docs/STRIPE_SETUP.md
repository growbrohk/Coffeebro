# Stripe campaign checkout

Paid campaign claims (fixed reward mode with `b1g1` or `fixed_price_*` vouchers) use **Stripe Checkout** and Supabase Edge Functions.

## Prerequisites

- Stripe account (platform / single merchant).
- Supabase project linked to this repo.

## 1. Database

Apply migrations (includes `campaign_claim_payments`, pricing RPC, payment gate on free claims):

```bash
supabase db push
# or link remote and push
```

## 2. Secrets (Edge Functions)

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set APP_URL=https://www.coffee-bro.com
```

`APP_URL` must match the deployed Vite app (no trailing slash). Used for Stripe `success_url` / `cancel_url`.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are usually injected automatically when deployed; for local function testing set them explicitly.

## 3. Deploy functions

```bash
supabase functions deploy create-campaign-checkout
supabase functions deploy stripe-webhook
```

`stripe-webhook` has **`verify_jwt = false`** in [`supabase/config.toml`](../supabase/config.toml) so Stripe can POST without a Supabase JWT.

## 4. Stripe Dashboard

1. **Developers → Webhooks** → Add endpoint:  
   `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
2. Events: `checkout.session.completed`, `charge.refunded` (optional but recommended).
3. Copy signing secret → `STRIPE_WEBHOOK_SECRET`.

## 5. Local testing

```bash
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

Use test keys and the `whsec_` from the CLI output for local secrets.

## Product rules (MVP)

- **Free** offers: unchanged — direct `claim_campaign_voucher` / `claim_hunt_campaign`.
- **Paid** offers: only in **`reward_mode = fixed`**. Random pools must use **`free`** rows only (form + DB trigger).

## Frontend env

Existing Vite vars are enough:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Checkout calls `POST /functions/v1/create-campaign-checkout` with the user’s JWT and `apikey` header.
