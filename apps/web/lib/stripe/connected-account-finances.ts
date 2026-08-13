import type Stripe from "stripe";

import { stripe } from "./client";

export type ConnectedAccountPayoutStatus =
  | "paid"
  | "pending"
  | "in_transit"
  | "failed"
  | "canceled"
  | "unknown";

export interface ConnectedAccountPayout {
  id: string;
  amount: number;
  currency: string;
  status: ConnectedAccountPayoutStatus;
  createdAt: number;
  arrivalAt: number;
  destinationLast4: string | null;
}

export interface ConnectedAccountPayoutPage {
  items: ConnectedAccountPayout[];
  nextCursor: string | null;
}

export interface ConnectedAccountFinances {
  balances: Array<{
    currency: string;
    availableAmount: number;
    pendingAmount: number;
  }>;
  payouts: ConnectedAccountPayout[];
  payoutsNextCursor: string | null;
}

const normalizePayoutStatus = (status: string): ConnectedAccountPayoutStatus => {
  switch (status) {
    case "paid":
    case "pending":
    case "in_transit":
    case "failed":
    case "canceled":
      return status;
    default:
      return "unknown";
  }
};

const getPayoutDestinationLast4 = (destination: Stripe.Payout["destination"]): string | null => {
  if (!destination || typeof destination === "string" || !("last4" in destination)) {
    return null;
  }

  return destination.last4 ?? null;
};

const toConnectedAccountPayout = (payout: Stripe.Payout): ConnectedAccountPayout => ({
  id: payout.id,
  amount: payout.amount,
  currency: payout.currency.toUpperCase(),
  status: normalizePayoutStatus(payout.status),
  createdAt: payout.created * 1000,
  arrivalAt: payout.arrival_date * 1000,
  destinationLast4: getPayoutDestinationLast4(payout.destination),
});

export const getConnectedAccountPayoutPage = async ({
  accountId,
  cursor,
  limit = 12,
}: {
  accountId: string;
  cursor?: string;
  limit?: number;
}): Promise<ConnectedAccountPayoutPage> => {
  const payouts = await stripe.payouts.list(
    {
      limit,
      starting_after: cursor,
      expand: ["data.destination"],
    },
    { stripeAccount: accountId },
  );
  const lastPayout = payouts.data.at(-1);

  return {
    items: payouts.data.map(toConnectedAccountPayout),
    nextCursor: payouts.has_more && lastPayout ? lastPayout.id : null,
  };
};

export const getConnectedAccountFinances = async (
  accountId: string,
): Promise<ConnectedAccountFinances> => {
  const [balance, payoutPage] = await Promise.all([
    stripe.balance.retrieve({ stripeAccount: accountId }),
    getConnectedAccountPayoutPage({ accountId, limit: 3 }),
  ]);

  const balancesByCurrency = new Map<
    string,
    { currency: string; availableAmount: number; pendingAmount: number }
  >();

  for (const available of balance.available) {
    const currency = available.currency.toUpperCase();
    const current = balancesByCurrency.get(currency) ?? {
      currency,
      availableAmount: 0,
      pendingAmount: 0,
    };
    current.availableAmount += available.amount;
    balancesByCurrency.set(currency, current);
  }

  for (const pending of balance.pending) {
    const currency = pending.currency.toUpperCase();
    const current = balancesByCurrency.get(currency) ?? {
      currency,
      availableAmount: 0,
      pendingAmount: 0,
    };
    current.pendingAmount += pending.amount;
    balancesByCurrency.set(currency, current);
  }

  return {
    balances: [...balancesByCurrency.values()].sort((left, right) =>
      left.currency.localeCompare(right.currency),
    ),
    payouts: payoutPage.items,
    payoutsNextCursor: payoutPage.nextCursor,
  };
};
