import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  deviceClassFromUserAgent,
  usageEventSchema,
} from "@/lib/analytics";

export const runtime = "edge";

function supabaseInsertClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = usageEventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const supabase = supabaseInsertClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, stored: false });
  }

  const ua = request.headers.get("user-agent");
  const row = {
    event_type: parsed.data.event_type,
    country_code: parsed.data.country_code || null,
    query_text: parsed.data.query_text || null,
    category: parsed.data.category || null,
    delivery_mode: parsed.data.delivery_mode || null,
    training_id: parsed.data.training_id || null,
    training_slug: parsed.data.training_slug || null,
    device_class:
      parsed.data.device_class || deviceClassFromUserAgent(ua),
  };

  const { error } = await supabase.from("usage_events").insert(row);
  if (error) {
    return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, stored: true });
}
