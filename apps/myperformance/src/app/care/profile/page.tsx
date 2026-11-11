"use client";

import React from "react";
import { useSession } from "@/components/session/SessionProvider";
import { CareProfileView } from "@/components/care/ProfileView";

export default function MyCareProfilePage() {
  const { personId, role } = useSession();

  return (
    <CareProfileView
      isOwnProfile={true}
      currentUserRole={role}
    />
  );
}
