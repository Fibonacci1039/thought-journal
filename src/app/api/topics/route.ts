import { NextRequest, NextResponse } from "next/server";
import { getTopics, createTopic } from "@/lib/storage";
import { validateRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authError = validateRequest(req);
  if (authError) return authError;

  const topics = await getTopics();
  return NextResponse.json(topics);
}

export async function POST(req: NextRequest) {
  const authError = validateRequest(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    const newTopic = await createTopic(body.name);

    return NextResponse.json(newTopic, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create topic" },
      { status: 500 }
    );
  }
}
