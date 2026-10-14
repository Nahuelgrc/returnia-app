import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { getPortfolioData } from "@/lib/portfolio-data";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { holdings, history } = await getPortfolioData(session.user.id);

  return (
    <DashboardView user={session.user} holdings={holdings} history={history} />
  );
}
