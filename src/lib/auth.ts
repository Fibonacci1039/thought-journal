import { NextRequest, NextResponse } from "next/server";

export function validateRequest(req: NextRequest) {
  const token = req.headers.get("x-app-token");
  const secret = process.env.APP_SECRET_TOKEN;

  if (!secret) {
    console.error("APP_SECRET_TOKEN is not defined in environment variables.");
    return NextResponse.json(
      { error: "Server Configuration Error" },
      { status: 500 }
    );
  }

  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null; // Valid
}
