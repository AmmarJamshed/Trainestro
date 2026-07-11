import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { hasSupabase, createServiceClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabase()) {
    return NextResponse.json(
      {
        error:
          "Provider updates require Supabase. Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 400 }
    );
  }

  const body = (await request.json()) as {
    id?: string;
    scraper_enabled?: boolean;
    name?: string;
    website?: string;
    listing_url?: string;
    scraper_key?: string;
  };

  const supabase = await createServiceClient();

  if (body.id && typeof body.scraper_enabled === "boolean") {
    const { error } = await supabase
      .from("providers")
      .update({ scraper_enabled: body.scraper_enabled })
      .eq("id", body.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.name && body.website && body.listing_url && body.scraper_key) {
    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const { error } = await supabase.from("providers").insert({
      name: body.name,
      slug,
      website: body.website,
      listing_url: body.listing_url,
      scraper_key: body.scraper_key,
      country_code: "PK",
      scraper_enabled: true,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}
