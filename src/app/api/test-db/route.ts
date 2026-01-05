import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase"; // Corrected import

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("entries")
      .insert({
        human_view: "test entry verifying connection",
        ai_view: { test: true },
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { error: "Unexpected error", details: String(err) },
      { status: 500 }
    );
  }
}
