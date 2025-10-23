"use server";

import { getUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
    keepPolicyFields,
    sanitizeWriteInput,
    writableFields,
} from "@/lib/table/configs/acl";
import { paymentFieldPolicy } from "@/lib/table/configs/acl/paymentPolicy";
import type { Role } from "@/lib/table/types";
import { PaymentSchema } from "@/lib/table/configs/payment";
import { prisma } from "@/lib/prisma";

import type { Prisma, PrismaClient } from "@prisma/client";
import { PaidStatus, PaymentType } from "@/app/generated/prisma";

type ActionResult = { ok: boolean; message: string };

type PaymentLike = { id: string; amount: number | null; paymentType: PaymentType };

type PaymentCreateData = Parameters<typeof prisma.payment.create>[0]["data"];
type PaymentUpdateData = Parameters<typeof prisma.payment.update>[0]["data"];

function forbid(message = "Forbidden"): ActionResult {
    return { ok: false, message };
}

/* ─────────────── Core typed helpers ─────────────── */

async function fetchLeaseAndPayments(
    tx: PrismaClient | Prisma.TransactionClient,
    leaseId: string
): Promise<{ commission: number; payments: PaymentLike[]; moveInDate: Date | null }> {
    const [lease, paymentsRaw] = await Promise.all([
        tx.lease.findUnique({
            where: { id: leaseId },
            select: { commission: true, moveInDate: true },
        }),
        tx.payment.findMany({
            where: { leaseId },
            select: { id: true, amount: true, paymentType: true },
        }),
    ]);

    const commission: number = Number(lease?.commission ?? 0);
    const moveInDate: Date | null = lease?.moveInDate ?? null;

    const payments: PaymentLike[] = (paymentsRaw as {
        id: string;
        amount: number | null;
        paymentType: PaymentType;
    }[]).map((p) => ({
        id: p.id,
        amount: p.amount,
        paymentType: p.paymentType,
    }));

    return { commission, payments, moveInDate };
}

/**
 * Aggregates for the simplified 4-type system
 */
function computePaymentAggregates(
    payments: PaymentLike[],
    excludePaymentId?: string
) {
    const filtered = excludePaymentId
        ? payments.filter((p) => p.id !== excludePaymentId)
        : payments;

    let paidAll = 0;
    let paidPayments = 0;
    let totalAdjustments = 0;
    let totalAdvances = 0;
    let totalChargebacks = 0;

    for (const p of filtered) {
        const amt = Number(p.amount ?? 0);
        paidAll += amt;
        switch (p.paymentType) {
            case PaymentType.payment:
                paidPayments += amt;
                break;
            case PaymentType.adjustment:
                totalAdjustments += amt;
                break;
            case PaymentType.advance:
                totalAdvances += amt;
                break;
            case PaymentType.chargeback:
                totalChargebacks += amt;
                break;
        }
    }

    const hasAdvance = filtered.some((p) => p.paymentType === PaymentType.advance);
    const hasChargeback = filtered.some((p) => p.paymentType === PaymentType.chargeback);
    const advanceOutstanding = Math.max(totalAdvances + totalChargebacks, 0);

    return {
        paidAll,
        paidPayments,
        totalAdjustments,
        totalAdvances,
        totalChargebacks,
        advanceOutstanding,
        hasAdvance,
        hasChargeback,
    };
}

async function enforcedAmountForType(options: {
    tx: PrismaClient | Prisma.TransactionClient;
    leaseId: string;
    paymentType?: PaymentType | null;
    submittedAmount?: unknown;
    excludePaymentId?: string;
}): Promise<number> {
    const { tx, leaseId, paymentType, submittedAmount, excludePaymentId } = options;

    const { commission, payments } = await fetchLeaseAndPayments(tx, leaseId);
    const {
        paidAll,
        paidPayments,
        totalAdjustments,
        advanceOutstanding,
    } = computePaymentAggregates(payments, excludePaymentId);

    const numericSubmitted: number = Number(submittedAmount ?? 0);
    const adjustedCap = Math.max(commission + totalAdjustments, 0);
    const remainingIgnoringAdvances = Math.max(adjustedCap - paidPayments, 0);

    switch (paymentType) {
        case PaymentType.payment:
            // Allow ANY positive amount (no cap to remaining).
            // Payout will still be governed by computePayoutForType using advanceOutstanding.
            if (numericSubmitted < 0) throw new Error("Please enter a non-negative amount.");
            return numericSubmitted;

        case PaymentType.advance:
            return Math.max(adjustedCap - paidAll, 0);

        case PaymentType.chargeback:
            return -advanceOutstanding;

        case PaymentType.adjustment:
            return numericSubmitted;

        default:
            return numericSubmitted;
    }
}

/* ─────────────── Payout logic ─────────────── */

function computePayoutForType(
    paymentType: PaymentType,
    amount: number,
    opts: { hasAdvance: boolean; hasChargeback: boolean; advanceOutstanding: number }
): number {
    const { hasAdvance, hasChargeback, advanceOutstanding } = opts;

    switch (paymentType) {
        case PaymentType.advance:
            return amount;

        case PaymentType.payment:
            // PREVIOUSLY: if hasAdvance && !hasChargeback -> payout 0
            // NEW RULE: if a payment exceeds outstanding advances, pay out the difference.
            // Example: advances 1500, payment 2000 => payout 500
            if (hasAdvance && !hasChargeback) {
                return Math.max(amount - advanceOutstanding, 0);
            }
            return amount;

        case PaymentType.chargeback:
            // Ensure chargebacks reduce payout (negative)
            return amount <= 0 ? amount : -Math.abs(amount);

        case PaymentType.adjustment:
            return amount;

        default:
            return 0;
    }
}

/* ─────────────── Safeties ─────────────── */

function assertNonZeroAmount(_type: PaymentType, amt: number) {
    if (amt === 0) {
        throw new Error("This entry would post $0.00. Nothing to record.");
    }
}

function assertNoExistingChargeback(hasChargeback: boolean) {
    if (hasChargeback) {
        throw new Error("A chargeback already exists for this lease.");
    }
}

function assertAdvanceEligible(
    hasAnyAdvance: boolean,
    hasChargeback: boolean,
    hasAnyPayment: boolean
) {
    if (hasAnyAdvance) {
        throw new Error("An advance has already been recorded for this lease.");
    }
    if (hasAnyPayment || hasChargeback) {
        throw new Error("An advance can only be created before payments or chargebacks.");
    }
}

function assertDateNotBeforeMoveIn(d: Date, moveIn: Date | null) {
    if (moveIn && d.getTime() < moveIn.getTime()) {
        const y = moveIn.getFullYear();
        const m = String(moveIn.getMonth() + 1).padStart(2, "0");
        const day = String(moveIn.getDate()).padStart(2, "0");
        throw new Error(
            `Payment date cannot be before the lease move-in date (${y}-${m}-${day}).`
        );
    }
}

/* ─────────────── Recompute aggregates ─────────────── */

async function recomputeLeaseAggregates(
    tx: PrismaClient | Prisma.TransactionClient,
    leaseId: string
): Promise<void> {
    const { commission, payments } = await fetchLeaseAndPayments(tx, leaseId);

    // Reuse your aggregate helper to get what we need
    const {
        paidPayments,
        totalAdjustments,
        hasChargeback,
    } = computePaymentAggregates(payments);

    // Balance fields you already maintain (based on actual payments only)
    const balancePaid: number = paidPayments;
    const balanceDueCap = Math.max(commission + totalAdjustments, 0);
    const balanceDue: number = Math.max(balanceDueCap - paidPayments, 0);

    // Decide paidStatus
    let paidStatus: PaidStatus;
    if (hasChargeback) {
        paidStatus = PaidStatus.chargeback;
    } else if (balanceDueCap === 0 || paidPayments >= balanceDueCap) {
        // If adjusted cap is zero (e.g., full negative adjustments) we consider it paid.
        paidStatus = PaidStatus.paid;
    } else if (paidPayments === 0) {
        paidStatus = PaidStatus.unpaid;
    } else {
        paidStatus = PaidStatus.partially;
    }

    await tx.lease.update({
        where: { id: leaseId },
        data: { balancePaid, balanceDue, paidStatus },
    });
}


/* ─────────────── Actions ─────────────── */

export async function onCreate(leaseId: string, form: FormData): Promise<ActionResult> {
    const user = await getUser();
    if (!user) return forbid("Not authenticated");
    if (user.permissions !== "owner") return forbid();

    const role: Role = user.permissions;
    if (writableFields(paymentFieldPolicy, role).length === 0) return forbid();

    try {
        const raw: Record<string, unknown> = Object.fromEntries(form);
        const parsed = PaymentSchema.omit({
            id: true,
            createdAt: true,
            leaseId: true,
        }).parse(raw);

        const scoped = keepPolicyFields(paymentFieldPolicy, parsed);
        const clean = sanitizeWriteInput(paymentFieldPolicy, role, scoped, { strict: true });

        const { date, amount, paymentType, ...rest } = (clean ?? {}) as {
            date?: string | Date;
            amount?: number;
            paymentType?: PaymentType;
            [k: string]: unknown;
        };

        if (!paymentType) throw new Error("paymentType is required.");

        await prisma.$transaction(async (tx) => {
            const { payments, moveInDate } = await fetchLeaseAndPayments(tx, leaseId);
            const { paidPayments, hasChargeback, hasAdvance, advanceOutstanding } =
                computePaymentAggregates(payments);

            const enforcedAmount: number = await enforcedAmountForType({
                tx,
                leaseId,
                paymentType,
                submittedAmount: amount,
            });

            if (paymentType === PaymentType.chargeback) {
                assertNoExistingChargeback(hasChargeback);
            }
            if (paymentType === PaymentType.advance) {
                const hasAnyPayment = paidPayments > 0;
                assertAdvanceEligible(hasAdvance, hasChargeback, hasAnyPayment);
            }

            assertNonZeroAmount(paymentType, enforcedAmount);

            const concreteDate: Date = date ? new Date(date) : new Date();
            assertDateNotBeforeMoveIn(concreteDate, moveInDate);

            const leaseUser = await tx.lease.findUnique({
                where: { id: leaseId },
                select: { userId: true },
            });
            if (!leaseUser?.userId) {
                throw new Error("Lease has no associated userId.");
            }
            const userId = leaseUser.userId;

            const payout = computePayoutForType(paymentType, enforcedAmount, {
                hasAdvance,
                hasChargeback,
                advanceOutstanding,
            });

            const payload: PaymentCreateData = {
                ...(rest as Record<string, unknown>),
                paymentType,
                amount: enforcedAmount,
                payout,
                date: concreteDate,
                leaseId,
                userId,
            };

            await tx.payment.create({ data: payload });
            await recomputeLeaseAggregates(tx, leaseId);
        });

        revalidatePath(`/lease/${leaseId}`);
        return { ok: true, message: "Created" };
    } catch (err: unknown) {
        const message: string = err instanceof Error ? err.message : "Create failed";
        return { ok: false, message };
    }
}

export async function onUpdate(
    leaseId: string,
    id: string,
    form: FormData
): Promise<ActionResult> {
    const user = await getUser();
    if (!user) return forbid("Not authenticated");
    if (user.permissions !== "owner") return forbid();

    const role: Role = user.permissions;
    if (writableFields(paymentFieldPolicy, role).length === 0) return forbid();

    try {
        const raw: Record<string, unknown> = Object.fromEntries(form);
        const { id: _1, leaseId: _2, createdAt: _3, ...restRaw } = raw;

        const parsed = PaymentSchema.partial().parse(restRaw);
        const scoped = keepPolicyFields(paymentFieldPolicy, parsed);
        const clean = sanitizeWriteInput(paymentFieldPolicy, role, scoped, { strict: true });

        const { date, amount, paymentType, ...rest } = (clean ?? {}) as {
            date?: string | Date;
            amount?: number;
            paymentType?: PaymentType;
            [k: string]: unknown;
        };

        await prisma.$transaction(async (tx) => {
            const { payments, moveInDate } = await fetchLeaseAndPayments(tx, leaseId);
            const { paidPayments, hasChargeback, hasAdvance, advanceOutstanding } =
                computePaymentAggregates(payments, id);

            const current = await tx.payment.findUnique({
                where: { id },
                select: { paymentType: true },
            });
            if (!current) throw new Error("Payment not found.");
            const effectiveType: PaymentType = paymentType ?? current.paymentType;

            const enforcedAmount: number = await enforcedAmountForType({
                tx,
                leaseId,
                paymentType: effectiveType,
                submittedAmount: amount,
                excludePaymentId: id,
            });

            if (effectiveType === PaymentType.chargeback) {
                assertNoExistingChargeback(hasChargeback);
            }
            if (effectiveType === PaymentType.advance) {
                const hasAnyPayment = paidPayments > 0;
                assertAdvanceEligible(hasAdvance, hasChargeback, hasAnyPayment);
            }

            assertNonZeroAmount(effectiveType, enforcedAmount);

            const concreteDate = date ? new Date(date) : undefined;
            if (concreteDate) assertDateNotBeforeMoveIn(concreteDate, moveInDate);

            const payout = computePayoutForType(effectiveType, enforcedAmount, {
                hasAdvance,
                hasChargeback,
                advanceOutstanding,
            });

            const payload: PaymentUpdateData = {
                ...(rest as Record<string, unknown>),
                amount: enforcedAmount,
                payout,
                ...(paymentType != null ? { paymentType: effectiveType } : {}),
                ...(concreteDate ? { date: concreteDate } : {}),
            };

            await tx.payment.update({ where: { id }, data: payload });
            await recomputeLeaseAggregates(tx, leaseId);
        });

        revalidatePath(`/lease/${leaseId}`);
        return { ok: true, message: "Updated" };
    } catch (err: unknown) {
        const message: string = err instanceof Error ? err.message : "Update failed";
        return { ok: false, message };
    }
}

export async function onDelete(leaseId: string, id: string): Promise<ActionResult> {
    const user = await getUser();
    if (!user) return forbid("Not authenticated");
    if (user.permissions !== "owner") return forbid();

    try {
        await prisma.$transaction(async (tx) => {
            await tx.payment.delete({ where: { id } });
            await recomputeLeaseAggregates(tx, leaseId);
        });

        revalidatePath(`/lease/${leaseId}`);
        return { ok: true, message: "Deleted" };
    } catch (err: unknown) {
        const message: string = err instanceof Error ? err.message : "Delete failed";
        return { ok: false, message };
    }
}
