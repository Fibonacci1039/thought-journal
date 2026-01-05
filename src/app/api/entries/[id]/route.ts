import { NextRequest, NextResponse } from "next/server";
import { getEntry, updateEntry, deleteEntry } from "@/lib/storage";
import { validateRequest } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Spec says "All API routes and Server Actions that mutate or READ data MUST... compare it".
  // So GET requests are ALSO protected from direct client-side access.
  // Server-side pages fetch via `storage.ts` logic which is purely server-side (Service Role) and internal.
  // The API routes are exposed to the browser. So yes, protect GET too.
  // Note: Standard Next.js pages call `getEntry` directly on server.
  // But if we ever call this API from client (e.g. SWR?), it needs auth.
  // The current app fetches data in Server Components (`page.tsx`) EXCEPT for `TopicManager` and `EntryForm` (submit).
  // Wait, `EntryForm` submits to API.
  // `TopicManager` submits to API.
  // Are there any client-side FETCHES for data?
  // `EntryPage` uses Server component.
  // So we only really need API protection for mutations?
  // Spec says "mutate or read". So protect EVERYTHING exposed.
  // If we protect GET, and we fetch GET from client, we need token.
  // The current app DOES NOT fetch GET from client (except for testing?).
  // Wait, `EditEntryPage` fetches entry via server component (`getEntry`).
  // So actually, protecting GET is safe and correct.

  const authError = validateRequest(req);
  if (authError) return authError;

  const { id } = await params;
  const entry = await getEntry(id);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(entry);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateRequest(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const body = await req.json();
    const updated = await updateEntry(id, {
      human_view: body.human_view,
      ai_view: body.ai_view,
      topic_ids: body.topic_ids,
    });
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
  await deleteEntry(id);
  return NextResponse.json({ success: true });
}
