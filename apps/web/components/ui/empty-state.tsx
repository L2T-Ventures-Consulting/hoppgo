import type { ComponentType, ReactNode } from "react";

import { cn } from "@louez/utils";

type EmptyStateProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) => (
  <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
    <div className="bg-muted mb-4 flex h-12 w-12 items-center justify-center rounded-full">
      <Icon className="text-muted-foreground h-6 w-6" />
    </div>
    <h3 className="text-sm font-medium">{title}</h3>
    {description && <p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
