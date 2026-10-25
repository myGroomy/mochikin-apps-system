import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { getFeatureSettings } from "@/lib/server/data";

export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ success: false, message: "Unauthenticated" }, { status: 401 });
  }
  try {
    return NextResponse.json({ success: true, features: await getFeatureSettings() });
  } catch (error) {
    console.error("Feature settings lookup failed", error);
    return NextResponse.json({ success: false, message: "Settings unavailable" }, { status: 503 });
  }
}
