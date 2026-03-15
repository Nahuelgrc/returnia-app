import React from "react";
import { auth } from "@/auth";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { getUserPortfolio } from "@/app/actions/portfolio";

export default async function DashboardPage() {
  const session = await auth();
  const portfolioResult = await getUserPortfolio();
  const initialAssets = portfolioResult.assets || [];

  return <DashboardView user={session?.user} initialAssets={initialAssets} />;
}
