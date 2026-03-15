import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const GlassCard = ({ children, className, noPadding = false, ...props }: GlassCardProps) => {
  return (
    <div
      className={twMerge(
        clsx(
          "relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-md",
          "shadow-xl",
          !noPadding && "p-6",
          className
        )
      )}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
