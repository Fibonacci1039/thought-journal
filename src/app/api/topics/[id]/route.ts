import { NextRequest, NextResponse } from "next/server";
import { updateTopic, deleteTopic } from "@/lib/storage";
import { validateRequest } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateRequest(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }
    const updated = await updateTopic(id, body.name);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateRequest(req);
  if (authError) return authError;

  const { id } = await params;
  await deleteTopic(id);
  return NextResponse.json({ success: true });
}
