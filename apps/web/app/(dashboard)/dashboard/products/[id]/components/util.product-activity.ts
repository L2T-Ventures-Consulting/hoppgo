import type { ProductUnitActivityItem } from "@louez/api/services";

export interface GroupedActivityItem {
  event: ProductUnitActivityItem;
  identifiers: string[];
}

const getReservationGroupKey = (event: ProductUnitActivityItem): string | null => {
  if (event.type !== "assigned" && event.type !== "unassigned") {
    return null;
  }

  const reservationId = event.payload?.reservationId;
  if (typeof reservationId !== "string") {
    return null;
  }

  return `${event.type}:${reservationId}`;
};

export const groupReservationActivity = (
  activity: ProductUnitActivityItem[],
): GroupedActivityItem[] => {
  const groups: GroupedActivityItem[] = [];
  const groupIndexByKey = new Map<string, number>();

  for (const event of activity) {
    const groupKey = getReservationGroupKey(event);
    const identifier = event.identifierSnapshot;
    const groupIndex = groupKey ? groupIndexByKey.get(groupKey) : undefined;

    if (groupIndex !== undefined) {
      const group = groups[groupIndex];
      if (group && identifier && !group.identifiers.includes(identifier)) {
        group.identifiers.push(identifier);
      }
      continue;
    }

    groups.push({
      event,
      identifiers: identifier ? [identifier] : [],
    });

    if (groupKey) {
      groupIndexByKey.set(groupKey, groups.length - 1);
    }
  }

  return groups;
};
