import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

// Vercel Cron: frees stock held by orders that were never paid.
export async function GET(request: Request) {
  const expected = Buffer.from(`Bearer ${serverEnv.cronSecret()}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data, error } = await createServiceClient().rpc("release_expired_orders");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (data) revalidateTag("catalog", "max");
  return NextResponse.json({ released: data });
}
