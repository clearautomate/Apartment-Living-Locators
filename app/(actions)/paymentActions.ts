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

// Aggregation shape
type PaymentLike = { id: string; amount: number | null; paymentType: PaymentType };

// Infer payload types from client
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

    const payments: PaymentLike[] = (paymentsRaw as Array<{
        id: string; amount: number | null; paymentType: PaymentType;
    }>).map(
        (p: { id: string; amount: number | null; paymentType: PaymentType }): PaymentLike => ({
            id: p.id,
            amount: p.amount,
            paymentType: p.paymentType,
        })
    );

    return { commission, payments, moveInDate };
}

/**
 * Compute aggregates with these invariants:
 * - paidAll: sum of ALL amounts (advances, fulls, partials, and chargebacks [negative])
 * - paidNonAdvance: sum of ONLY real positive payments (full + partial)
 * - hasAdvance: whether any advance exists
 * - hasChargeback: whether any chargeback exists
 */
function computePaymentAggregates(
    payments: PaymentLike[],
    excludePaymentId?: string
): {
    paidAll: number;
    paidNonAdvance: number;
    hasAdvance: boolean;
    hasChargeback: boolean;
} {
    const filtered: PaymentLike[] = excludePaymentId
        ? payments.filter((p: PaymentLike) => p.id !== excludePaymentId)
        : payments;

    const hasAdvance: boolean = filtered.some(
        (p: PaymentLike) => p.paymentType === PaymentType.advance
    );

    const hasChargeback: boolean = filtered.some(
        (p: PaymentLike) => p.paymentType === PaymentType.chargeback
    );

    const paidAll: number = filtered.reduce(
        (sum: number, p: PaymentLike) => sum + Number(p.amount ?? 0),
        0
    );

    const paidNonAdvance: number = filtered
        .filter(
            (p: PaymentLike) =>
                p.paymentType === PaymentType.full ||
                p.paymentType === PaymentType.partial
        )
        .reduce((sum: number, p: PaymentLike) => sum + Number(p.amount ?? 0), 0);

    return { paidAll, paidNonAdvance, hasAdvance, hasChargeback };
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
    const { paidAll, paidNonAdvance } = computePaymentAggregates(payments, excludePaymentId);

    const numericSubmitted: number = Number(submittedAmount ?? 0);

    switch (paymentType) {
        case PaymentType.full: {
            // FULL ignores ADVANCE; cover remaining non-advance gap up to commission
            const remainingIgnoringAdvances: number = Math.max(commission - paidNonAdvance, 0);
            return remainingIgnoringAdvances;
        }
        case PaymentType.advance: {
            // Advance tops up remaining against overall total (incl. prior advances)
            const remaining: number = Math.max(commission - paidAll, 0);
            return remaining;
        }
        case PaymentType.chargeback:
            return -commission;
        case PaymentType.partial:
            return Math.max(numericSubmitted, 0);
        default:
            return numericSubmitted;
    }
}

/* ─────────────── Safeties ─────────────── */

/** Reject zero-amount posts for advance/full/partial. */
function assertNonZeroAmount(type: PaymentType, amt: number) {
    if ((type === PaymentType.advance || type === PaymentType.full || type === PaymentType.partial) && amt === 0) {
        throw new Error("This entry would post $0.00. Nothing to record.");
    }
}

/** Only one chargeback per lease */
function assertNoExistingChargeback(hasChargeback: boolean) {
    if (hasChargeback) {
        throw new Error("A chargeback already exists for this lease. Only one chargeback is allowed.");
    }
}

/**
 * Advance only before any real activity AND only one allowed.
 * Blocks if: there is any non-advance payment, any chargeback, or an advance already exists.
 */
function assertAdvanceEligible(paidNonAdvance: number, hasChargeback: boolean, hasAdvance: boolean) {
    if (hasAdvance) {
        throw new Error("An advance has already been recorded for this lease. Use a partial or full payment instead.");
    }
    if (paidNonAdvance > 0 || hasChargeback) {
        throw new Error("An advance can only be created before any payments or chargebacks have been recorded.");
    }
}

/** Date sanity: payment date not before lease move-in date */
function assertDateNotBeforeMoveIn(d: Date, moveIn: Date | null) {
    if (moveIn && d.getTime() < moveIn.getTime()) {
        const y = moveIn.getFullYear();
        const m = String(moveIn.getMonth() + 1).padStart(2, "0");
        const day = String(moveIn.getDate()).padStart(2, "0");
        throw new Error(`Payment date cannot be before the lease move-in date (${y}-${m}-${day}).`);
    }
}

/**
 * Recompute and persist lease aggregates:
 * - unpaid       → ONLY an advance exists (no non-advance payments), and net is not negative
 * - chargeback   → at least one chargeback exists AND net ≤ 0
 * - partially    → some non-advance payment (> 0) but < commission, and net is not negative
 * - paid         → non-advance payments ≥ commission
 */
async function recomputeLeaseAggregates(
    tx: PrismaClient | Prisma.TransactionClient,
    leaseId: string
): Promise<void> {
    const { commission, payments } = await fetchLeaseAndPayments(tx, leaseId);
    const { paidAll, paidNonAdvance, hasAdvance, hasChargeback } = computePaymentAggregates(payments);

    let paidStatus: PaidStatus;

    if (hasChargeback && paidAll <= 0) {
        paidStatus = PaidStatus.chargeback;
    } else if (paidNonAdvance >= commission) {
        paidStatus = PaidStatus.paid;
    } else if (paidNonAdvance > 0) {
        paidStatus = PaidStatus.partially;
    } else if (hasAdvance) {
        paidStatus = PaidStatus.unpaid;
    } else {
        paidStatus = PaidStatus.unpaid;
    }

    const totalPaid: number = paidAll;
    const paidDifference: number = commission - totalPaid;

    await tx.lease.update({
        where: { id: leaseId },
        data: { totalPaid, paidStatus, paidDifference, hasAdvance },
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

        if (paymentType == null) throw new Error("paymentType is required.");

        await prisma.$transaction(async (tx) => {
            // Load context
            const { commission, payments, moveInDate } = await fetchLeaseAndPayments(tx, leaseId);
            const { paidNonAdvance, hasChargeback, hasAdvance } = computePaymentAggregates(payments);

            // Enforce amount for this type
            const enforcedAmount: number = await enforcedAmountForType({
                tx,
                leaseId,
                paymentType,
                submittedAmount: amount,
            });

            // Type-specific safeties
            if (paymentType === PaymentType.chargeback) {
                assertNoExistingChargeback(hasChargeback);
            }
            if (paymentType === PaymentType.advance) {
                assertAdvanceEligible(paidNonAdvance, hasChargeback, hasAdvance); // ← also blocks second advance
            }

            // Existing policy: partials require prior chargeback if < commission
            if (
                paymentType === PaymentType.partial &&
                enforcedAmount < commission &&
                !hasChargeback
            ) {
                throw new Error(
                    "Cannot record a underpaid partial payment before a chargeback exists for this lease. Please create a chargeback first."
                );
            }

            // Block $0.00 posts
            assertNonZeroAmount(paymentType, enforcedAmount); // ← prevents second advance posting as $0

            // Date sanity
            const concreteDate: Date = date ? new Date(date) : new Date();
            assertDateNotBeforeMoveIn(concreteDate, moveInDate);

            // Resolve userId from lease
            const leaseUser = await tx.lease.findUnique({
                where: { id: leaseId },
                select: { userId: true },
            });
            if (!leaseUser?.userId) {
                throw new Error("Lease has no associated userId; cannot create payment.");
            }
            const userId: string = leaseUser.userId;

            const payload: PaymentCreateData = {
                ...(rest as Record<string, unknown>),
                paymentType,
                amount: enforcedAmount,
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
        const { id: _i1, leaseId: _i2, createdAt: _i3, ...restRaw } = raw;

        const parsed = PaymentSchema.partial().parse(restRaw);
        const scoped = keepPolicyFields(paymentFieldPolicy, parsed);
        const clean = sanitizeWriteInput(paymentFieldPolicy, role, scoped, { strict: true });

        const {
            id: _i4,
            leaseId: _i5,
            createdAt: _i6,
            date,
            amount,
            paymentType,
            ...rest
        } = (clean ?? {}) as {
            date?: string | Date;
            amount?: number;
            paymentType?: PaymentType;
            [k: string]: unknown;
        };

        await prisma.$transaction(async (tx) => {
            // Context, excluding this payment from aggregates
            const { commission, payments, moveInDate } = await fetchLeaseAndPayments(tx, leaseId);
            const { paidNonAdvance, hasChargeback, hasAdvance } = computePaymentAggregates(payments, id);

            // Determine effective type if not changing it
            const current = await tx.payment.findUnique({
                where: { id },
                select: { paymentType: true },
            });
            if (!current) throw new Error("Payment not found.");
            const effectiveType: PaymentType = (paymentType ?? current.paymentType)!;

            // Compute amount
            const enforcedAmount: number = await enforcedAmountForType({
                tx,
                leaseId,
                paymentType: effectiveType,
                submittedAmount: amount,
                excludePaymentId: id,
            });

            // Type-specific safeties
            if (effectiveType === PaymentType.chargeback) {
                assertNoExistingChargeback(hasChargeback);
            }
            if (effectiveType === PaymentType.advance) {
                assertAdvanceEligible(paidNonAdvance, hasChargeback, hasAdvance); // ← also blocks creating a second advance via update
            }

            // Partial requires prior chargeback if < commission
            if (
                effectiveType === PaymentType.partial &&
                enforcedAmount < commission &&
                !hasChargeback
            ) {
                throw new Error(
                    "Cannot record a partial payment before a chargeback exists for this lease. Please create a chargeback first."
                );
            }

            // Block $0.00 posts
            assertNonZeroAmount(effectiveType, enforcedAmount);

            // Date sanity (only if date is changing)
            const concreteDate = date ? new Date(date) : undefined;
            if (concreteDate) {
                assertDateNotBeforeMoveIn(concreteDate, moveInDate);
            }

            const payload: PaymentUpdateData = {
                ...(rest as Record<string, unknown>),
                amount: enforcedAmount,
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
