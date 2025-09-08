// lib/payments/computeLeaseTotals.ts

export type LeasePaymentLike = {
    paymentType: "advance" | "full" | "partial" | "chargeback";
    amount: number; // positives for advance/full/partial, NEGATIVE for chargebacks
};

/**
 * Totals for a single lease.
 *
 * Definitions:
 * - totalBillOut: net cash picture after (only FULL) advance repayment logic + chargebacks.
 * - chargebacks: sum of clawbacks (≤ 0).
 * - remainingBalance: commission - sum(full + partial only).
 *
 * Rules:
 * - **NEW**: Partials do NOT repay advances; only FULL payments repay any (explicit or implicit) advance.
 * - Advances don't count toward bill-out or balance.
 * - Remaining advance can offset chargebacks in totalBillOut.
 * - Implicit advance = commission when leaseHasAdvance is true and there are no advance rows.
 */
export function computeLeasePaymentTotals(
    payments: LeasePaymentLike[],
    leaseHasAdvance: boolean, // true if lease historically had an advance
    commission: number        // used as implicit advance amount when leaseHasAdvance = true
) {
    const toNum = (v: unknown) => (Number.isFinite(v as number) ? (v as number) : 0);

    const sumPos = (types: Array<LeasePaymentLike["paymentType"]>) =>
        payments
            .filter((p) => types.includes(p.paymentType))
            .reduce((acc, p) => acc + Math.max(0, toNum(p.amount)), 0);

    const sumChargebacks = () =>
        payments
            .filter((p) => p.paymentType === "chargeback")
            .reduce((acc, p) => acc + -Math.abs(toNum(p.amount)), 0); // ≤ 0

    // Component sums
    const advances = sumPos(["advance"]);
    const fulls = sumPos(["full"]);
    const partials = sumPos(["partial"]);
    const positivesNonAdvance = fulls + partials;
    const chargebacks = sumChargebacks(); // ≤ 0

    // Implicit advance: if no advance rows but leaseHasAdvance, assume = commission
    const implicitAdvance = advances > 0 ? advances : (leaseHasAdvance ? commission : 0);

    const hasNonAdvancePositive = positivesNonAdvance > 0;
    const hasChargeback = chargebacks < 0;

    /**
     * Repayment policy:
     * - ONLY FULL payments repay advance.
     * - Partials pass straight through to bill-out (i.e., never reduced by advance).
     */
    const repayablePortion = fulls; // only fulls can be used to repay advance
    const implicitRepay = Math.min(repayablePortion, implicitAdvance);
    const remainingAdvance = Math.max(0, implicitAdvance - implicitRepay);

    // The part that survives after repayment:
    // - All partials (untouched)
    // - Fulls minus whatever was used to repay
    const survivingFulls = Math.max(0, fulls - implicitRepay);
    const repaidPortion = partials + survivingFulls; // survives to bill-out

    // TOTAL BILL-OUT
    let totalBillOut = 0;
    if (hasNonAdvancePositive) {
        // Surviving positives count, and remaining advance can offset chargebacks
        totalBillOut = repaidPortion + (hasChargeback ? remainingAdvance : 0);
    } else if (implicitAdvance > 0) {
        // No positives — show remaining advance (offsets chargebacks below)
        totalBillOut = remainingAdvance;
    }
    totalBillOut += chargebacks;

    // REMAINING BALANCE: commission - (full + partial only)
    const nonAdvanceTransactions = positivesNonAdvance; // full + partial only
    const remainingBalance = commission - nonAdvanceTransactions;

    return {
        totalBillOut,
        chargebacks,
        remainingBalance,
    };
}
