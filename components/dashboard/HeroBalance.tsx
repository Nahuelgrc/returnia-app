export function HeroBalance({ total }: { total: number }) {
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
    </section>
  );
}
