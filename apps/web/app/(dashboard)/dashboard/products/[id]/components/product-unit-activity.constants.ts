import type { ComponentType } from "react";

import {
  ArrowDownLeftSolidIcon,
  CheckSolidIcon,
  ClockSolidIcon,
  FailedSolidIcon,
  PendingSolidIcon,
  PencilSolidIcon,
  ProductSolidIcon,
  RepeatSolidIcon,
  ReviewSolidIcon,
  TrashSolidIcon,
  XCircleSolidIcon,
} from "@louez/ui/icons";

export type UnitEventType =
  | "created"
  | "deleted"
  | "downtime_declared"
  | "downtime_updated"
  | "downtime_closed"
  | "downtime_deleted"
  | "retired"
  | "reinstated"
  | "assigned"
  | "unassigned"
  | "updated";

export type UnitActivityBadgeVariant =
  | "pending"
  | "progress"
  | "submitted"
  | "review"
  | "success"
  | "failed"
  | "expired";

export const UNIT_EVENT_CONFIG: Record<
  UnitEventType,
  {
    icon: ComponentType<{ className?: string }>;
    variant: UnitActivityBadgeVariant;
  }
> = {
  created: { icon: ProductSolidIcon, variant: "success" },
  deleted: { icon: TrashSolidIcon, variant: "failed" },
  downtime_declared: { icon: PendingSolidIcon, variant: "pending" },
  downtime_updated: { icon: ReviewSolidIcon, variant: "review" },
  downtime_closed: { icon: CheckSolidIcon, variant: "success" },
  downtime_deleted: { icon: XCircleSolidIcon, variant: "failed" },
  retired: { icon: FailedSolidIcon, variant: "expired" },
  reinstated: { icon: RepeatSolidIcon, variant: "success" },
  assigned: { icon: ClockSolidIcon, variant: "progress" },
  unassigned: { icon: ArrowDownLeftSolidIcon, variant: "submitted" },
  updated: { icon: PencilSolidIcon, variant: "review" },
};
