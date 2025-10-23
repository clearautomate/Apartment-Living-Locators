// lib/payments/computeLeaseTotals.ts

export type LeasePaymentLike = {
    amount: number; // positive = billed/earned this txn; negative allowed if needed by your domain
    payout: number; // cash flow this txn (can be negative for chargebacks)
};

export type LeaseTotals = {
    totalBillOut: number;      // sum of all payouts
    totalChargebacks: number;  // sum of negative payouts (≤ 0)
    remainingBalance: number;  // commission - Σ max(0, amount - payout), floored at 0
};

/**
 * Totals for a single lease (per your simplified rules).
 *
 * Rules implemented:
 * - totalBillOut            = sum of each payout.
 * - totalChargebacks        = sum of each payout that is negative (≤ 0), i.e., chargebacks only.
 * - remainingBalance        = commission - sum over transactions of positive (amount - payout), floored at 0.
 *
 * Notes:
 * - We coerce non-finite numbers to 0 for safety.
 * - remainingBalance never goes below 0.
 */
export function computeLeasePaymentTotals(
    payments: LeasePaymentLike[],
    commission: number
): LeaseTotals {
    const toNum = (v: unknown) =>
        Number.isFinite(v as number) ? (v as number) : 0;

    console.log(payments)

    let totalBillOut = 0;
    let totalChargebacks = 0;
    let positiveDeltasSum = 0; // Σ max(0, amount - payout)

    for (const p of payments) {
        const amount = toNum(p.amount);
        const payout = toNum(p.payout);

        // 1) Total bill-out = sum of payouts (cash picture)
        totalBillOut += payout;

        // 2) Chargebacks = sum of negative payouts only
        if (payout < 0) totalChargebacks += payout;

        // 3) Positive deltas contribute toward reducing remainingBalance
        const delta = amount - payout;
        if (delta > 0) positiveDeltasSum += delta;
    }

    const remainingBalance = Math.max(0, toNum(commission) - positiveDeltasSum);

    return {
        totalBillOut,
        totalChargebacks,
        remainingBalance,
    };
}
