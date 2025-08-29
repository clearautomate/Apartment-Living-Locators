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

// If your PaidStatus enum is generated elsewhere, keep this import:
import { PaidStatus } from "../generated/prisma";
// If you use @prisma/client for enums instead, swap the above for:
// import { PaidStatus } from "@prisma/client";

import type { Prisma, PrismaClient } from "@prisma/client";

type ActionResult = { ok: boolean; message: string };

function forbid(message = "Forbidden"): ActionResult {
    return { ok: false, message };
}

/** Recompute and persist lease aggregates from payments + commission */
async function recomputeLeaseAggregates(
    tx: PrismaClient | Prisma.TransactionClient,
    leaseId: string
): Promise<void> {
    const payments: { amount: number | null }[] = await tx.payment.findMany({
        where: { leaseId },
        select: { amount: true },
    });

    const lease = await tx.lease.findUnique({
        where: { id: leaseId },
        select: { commission: true },
    });

    const totalPaid = payments.reduce(
        (sum: number, p: { amount: number | null }) => sum + (p.amount ?? 0),
        0
    );

    const commission = Number(lease?.commission ?? 0);

    let paidStatus: PaidStatus = PaidStatus.unpaid;
    if (totalPaid < 0) paidStatus = PaidStatus.chargeback;
    else if (totalPaid === 0) paidStatus = PaidStatus.unpaid;
    else if (totalPaid < commission) paidStatus = PaidStatus.partially; // enum value
    else paidStatus = PaidStatus.paid;

    // Difference: commission minus totalPaid (negative => overpay)
    const paidDifference = commission - totalPaid;

    await tx.lease.update({
        where: { id: leaseId },
        data: {
            totalPaid,
            paidStatus,
            paidDifference,
        },
    });
}

/**
 * CREATE payment
 * - Validates input via Zod (PaymentSchema minus id/createdAt/leaseId)
 * - Applies ACL (strict)
 * - Associates leaseId
 * - Recomputes lease aggregates
 */
export async function onCreate(
    leaseId: string,
    form: FormData
): Promise<ActionResult> {
    const user = await getUser();
    if (!user) return forbid("Not authenticated");
    if (user.permissions !== "owner") return forbid();

    const role: Role = user.permissions;
    if (writableFields(paymentFieldPolicy, role).length === 0) return forbid();

    try {
        const raw = Object.fromEntries(form) as Record<string, unknown>;

        const parsed = PaymentSchema.omit({
            id: true,
            createdAt: true,
            leaseId: true,
        }).parse(raw);

        const scoped = keepPolicyFields(paymentFieldPolicy, parsed);
        const clean = sanitizeWriteInput(paymentFieldPolicy, role, scoped, {
            strict: true,
        });

        const { date, ...rest } = (clean ?? {}) as {
            date?: string | Date;
            [k: string]: unknown;
        };

        await prisma.$transaction(async (tx) => {
            await tx.payment.create({
                data: {
                    ...rest,
                    ...(date ? { date: new Date(date) } : {}),
                    leaseId,
                } as any, // cast if needed due to narrowed keys after ACL
            });

            await recomputeLeaseAggregates(tx, leaseId);
        });

        revalidatePath(`/lease/${leaseId}`);
        return { ok: true, message: "Created" };
    } catch (err: any) {
        return { ok: false, message: err?.message ?? "Create failed" };
    }
}

/**
 * UPDATE payment
 * - Validates partial payload
 * - Applies ACL (strict)
 * - Ignores id/leaseId/createdAt
 * - Recomputes lease aggregates
 */
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
        const raw = Object.fromEntries(form) as Record<string, unknown>;
        const { id: _i1, leaseId: _i2, createdAt: _i3, ...restRaw } = raw;

        const parsed = PaymentSchema.partial().parse(restRaw);
        const scoped = keepPolicyFields(paymentFieldPolicy, parsed);
        const clean = sanitizeWriteInput(paymentFieldPolicy, role, scoped, {
            strict: true,
        });

        const {
            id: _i4,
            leaseId: _i5,
            createdAt: _i6,
            date,
            ...rest
        } = (clean ?? {}) as {
            date?: string | Date;
            [k: string]: unknown;
        };

        await prisma.$transaction(async (tx) => {
            await tx.payment.update({
                where: { id },
                data: { ...rest, ...(date ? { date: new Date(date) } : {}) } as any,
            });

            await recomputeLeaseAggregates(tx, leaseId);
        });

        revalidatePath(`/lease/${leaseId}`);
        return { ok: true, message: "Updated" };
    } catch (err: any) {
        return { ok: false, message: err?.message ?? "Update failed" };
    }
}

/**
 * DELETE payment
 * - Owner-only
 * - Recomputes lease aggregates
 */
export async function onDelete(
    leaseId: string,
    id: string
): Promise<ActionResult> {
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
    } catch (err: any) {
        return { ok: false, message: err?.message ?? "Delete failed" };
    }
}
