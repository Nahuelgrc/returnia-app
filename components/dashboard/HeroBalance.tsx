export function HeroBalance({
  total,
  invested,
  realizedPnl,
}: {
  total: number;
  invested: number;
  realizedPnl: number;
}) {
  const gain = total - invested;
  const gainPercent = invested > 0 ? (gain / invested) * 100 : 0;

  return (
    <section className="flex flex-col lg:flex-row gap-6 items-end justify-between">
      <div className="flex flex-col gap-1">
        <p className="text-slate-500 dark:text-[#9da6b9] font-medium">
          Total Balance
        </p>
        <div className="flex items-baseline gap-4">
          <h1 className="text-5xl font-extrabold tracking-tight">
            $
            {total.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h1>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-slate-500 dark:text-[#9da6b9] font-medium">
          Total Gain/Loss
        </p>
        <div
          className={`flex items-center gap-1 text-2xl font-extrabold tracking-tight ${
            gain >= 0 ? "text-success" : "text-danger"
          }`}
        >
          <span className="material-symbols-outlined">
            {gain >= 0 ? "trending_up" : "trending_down"}
          </span>
          {gain > 0 ? "+" : gain < 0 ? "-" : ""}$
          {Math.abs(gain).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          ({gainPercent > 0 ? "+" : ""}
          {gainPercent.toFixed(2)}%)
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-slate-500 dark:text-[#9da6b9] font-medium">
          Realized P&L
        </p>
        <div
          data-testid="realized-pnl"
          className={`flex items-center gap-1 text-2xl font-extrabold tracking-tight ${
            realizedPnl >= 0 ? "text-success" : "text-danger"
          }`}
        >
          {realizedPnl > 0 ? "+" : realizedPnl < 0 ? "-" : ""}$
          {Math.abs(realizedPnl).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>
    </section>
  );
}
