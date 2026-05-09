/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type ParsedReceipt = {
  order_no: string;
  purchase_date: string;
  total_cents: number;
  line_items?: { name?: string; qty?: number; unit_price_cents?: number }[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "METHOD_NOT_ALLOWED", message: "POST only" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "NOT_AUTHORIZED", message: "Missing Authorization" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  // Gemini 3.1 Flash-Lite: fastest + cheapest series for structured data extraction.
  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.1-flash-lite-preview-06-17";

  if (!geminiKey) {
    return json({ error: "SERVER_CONFIG", message: "GEMINI_API_KEY not set" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return json({ error: "NOT_AUTHORIZED", message: "Invalid session" }, 401);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "BAD_REQUEST", message: "Expected multipart form" }, 400);
  }

  const orgIdRaw = form.get("org_id");
  const image = form.get("image");
  if (typeof orgIdRaw !== "string" || !orgIdRaw.trim()) {
    return json({ error: "BAD_REQUEST", message: "org_id required" }, 400);
  }
  if (!(image instanceof File)) {
    return json({ error: "BAD_REQUEST", message: "image file required" }, 400);
  }

  const orgId = orgIdRaw.trim();
  const mime = image.type || "application/octet-stream";
  if (!ALLOWED.has(mime)) {
    return json({ error: "BAD_MIME", message: `Allowed: ${[...ALLOWED].join(", ")}` }, 400);
  }
  if (image.size > MAX_BYTES) {
    return json({ error: "FILE_TOO_LARGE", message: "Max 5MB" }, 400);
  }

  const { data: orgRow, error: orgErr } = await supabase
    .from("orgs")
    .select("id, org_name")
    .eq("id", orgId)
    .maybeSingle();

  if (orgErr) {
    return json({ error: "ORG_LOOKUP_FAILED", message: orgErr.message }, 500);
  }
  if (!orgRow) {
    return json({ error: "ORG_NOT_FOUND", message: "Shop not found" }, 404);
  }

  const buf = new Uint8Array(await image.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + chunk)));
  }
  const b64 = btoa(binary);

  const prompt = `You are parsing a café / restaurant receipt photo. Extract JSON ONLY with this shape:
{"order_no": string (receipt or invoice number, or "UNKNOWN"),
 "purchase_date": string (ISO date YYYY-MM-DD in local receipt context),
 "total_cents": integer (total amount in minor units e.g. HKD cents — if only major units shown, multiply by 100),
 "line_items": array of { "name": string, "qty": number, "unit_price_cents": integer } (optional).
If uncertain about total_cents, estimate from line items. Currency is typically HKD for Hong Kong receipts.`;

  const gemUrl =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`;

  const gemRes = await fetch(gemUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { inline_data: { mime_type: mime, data: b64 } },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
        thinking_config: { thinking_budget: 0 },
      },
    }),
  });

  if (!gemRes.ok) {
    const t = await gemRes.text();
    console.error("Gemini error", gemRes.status, t);
    return json({ error: "PARSE_FAILED", message: "Could not read receipt" }, 422);
  }

  const gemJson = (await gemRes.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text =
    gemJson.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";

  let parsed: ParsedReceipt;
  try {
    parsed = JSON.parse(text) as ParsedReceipt;
  } catch {
    return json({ error: "PARSE_FAILED", message: "Invalid model JSON" }, 422);
  }

  const orderNo = String(parsed.order_no ?? "unknown").trim().toLowerCase();
  const dateStr =
    String(parsed.purchase_date ?? "").trim().slice(0, 10) ||
    new Date().toISOString().slice(0, 10);
  const totalCents = Math.max(0, Math.round(Number(parsed.total_cents ?? 0)));
  const receiptKey = `${orgId}|${orderNo}|${dateStr}`;
  const items = parsed.line_items ?? [];

  const coffeeDate = dateStr.match(/^\d{4}-\d{2}-\d{2}$/) ? dateStr : new Date().toISOString().slice(0, 10);

  const { data: fin, error: finErr } = await supabase.rpc("finalize_receipt_scan", {
    p_org_id: orgId,
    p_receipt_key: receiptKey,
    p_amount_cents: totalCents,
    p_items: items as unknown as Record<string, unknown>,
    p_place: orgRow.org_name ?? "Coffee shop",
    p_coffee_date: coffeeDate,
  });

  if (finErr) {
    const msg = finErr.message ?? "";
    if (msg.includes("ALREADY_CLAIMED")) {
      return json({ error: "ALREADY_CLAIMED", message: "This receipt was already claimed" }, 409);
    }
    if (msg.includes("ORG_NOT_FOUND")) {
      return json({ error: "ORG_NOT_FOUND", message: "Shop not found" }, 404);
    }
    if (msg.includes("NOT_AUTHORIZED")) {
      return json({ error: "NOT_AUTHORIZED", message: "Not signed in" }, 401);
    }
    console.error("finalize_receipt_scan", finErr);
    return json({ error: "FINALIZE_FAILED", message: msg }, 500);
  }

  const packet = fin as { points_awarded?: number; new_balance?: number; daily_coffee_id?: string };
  return json({
    points_awarded: packet.points_awarded ?? 0,
    new_balance: packet.new_balance ?? 0,
    daily_coffee_id: packet.daily_coffee_id,
  });
});
