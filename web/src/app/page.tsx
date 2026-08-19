import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { resolveRoleHome } from "@/lib/role-home";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? resolveRoleHome(user) : "/dashboard");
}
