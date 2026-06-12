"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, destroySession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) {
    await prisma.auditLog.create({ data: { actorId: user.id, action: "LOGOUT" } }).catch(() => {});
  }
  await destroySession();
  redirect("/login");
}
