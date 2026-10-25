import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/adminGuard";
import { getFeatureSettings, updateFeatureSettings, writeAuditLog } from "@/lib/server/data";
import type { FeatureSettings } from "@/lib/types";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    return NextResponse.json({ success: true, features: await getFeatureSettings() });
  } catch (error) {
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  try {
    const body = (await request.json()) as { features?: Partial<FeatureSettings> };
    const features = body.features || {};
    const settings = await updateFeatureSettings(features, session!.employeeId);
    await writeAuditLog({
      actor_employee_id: session!.employeeId,
      action: "update_feature_settings",
      details: JSON.stringify(features),
    });
    return NextResponse.json({ success: true, message: "Feature settings updated", features: settings });
  } catch (error) {
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
  }
}
