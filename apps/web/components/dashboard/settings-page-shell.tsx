import type { ReactNode } from "react";

import Link from "next/link";

import { ArrowLeftIcon } from "@louez/ui/icons";

import { cn } from "@louez/utils";

type SettingsPageShellProps = {
  actions?: ReactNode;
  back?: { href: string; label: string };
  children: ReactNode;
  description?: string;
  title: string;
  width?: "default" | "wide";
};

export const SettingsPageShell = ({
  actions,
  back,
  children,
  description,
  title,
  width = "default",
}: SettingsPageShellProps) => {
  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 space-y-4 sm:space-y-6",
        width === "wide" ? "max-w-5xl" : "max-w-4xl",
      )}
    >
      {back && (
        <Link
          href={back.href}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {back.label}
        </Link>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="text-sm sm:text-base text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {children}
    </div>
  );
};
