"use client";

import React, { use } from "react";
import { useSession } from "@/components/session/SessionProvider";
import { CareProfileView } from "@/components/care/ProfileView";

export default function EmployeeCareProfilePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = use(params);
  const { personId, role } = useSession();

  return (
    <CareProfileView
      employeeId={employeeId}
      isOwnProfile={employeeId === personId}
      currentUserRole={role}
    />
  );
}
