import { NextRequest, NextResponse } from "next/server";
import { getEntries, createEntry } from "@/lib/storage";
import { validateRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authError = validateRequest(req);
  if (authError) return authError;

  const entries = await getEntries();
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const authError = validateRequest(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    if (!body.human_view || !body.ai_view) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newEntry = await createEntry({
      human_view: body.human_view,
      ai_view: body.ai_view,
      topic_ids: body.topic_ids || [],
    });

    return NextResponse.json(newEntry, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create entry" },
      { status: 500 }
    );
  }
}
