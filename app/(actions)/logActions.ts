"use server";

import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogSchema } from "@/lib/table/configs/log";
import { revalidatePath } from "next/cache";

import {
  keepPolicyFields,
  sanitizeWriteInput,
  writableFields,
} from "@/lib/table/configs/acl";
import { logFieldPolicy } from "@/lib/table/configs/acl/leasePolicy";
import type { Role } from "@/lib/table/types";
import { PaymentType } from "../generated/prisma";
import { getMonthCutoffs } from "@/lib/getMonthAndYear";

type ActionResult = { ok: boolean; message: string };

function forbid(message = "Forbidden"): ActionResult {
  return { ok: false, message };
}

/* ───────────────────────── Helpers ───────────────────────── */

type CommissionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

function computeCommission<T extends Record<string, any>>(input: T): CommissionResult<T> {
  if (input.commissionType === "percent") {
    if (typeof input.commissionPercent !== "number" || isNaN(input.commissionPercent)) {
      return { ok: false, message: "Comm. % must be a number when Comm. Type is 'Percent'" };
    }

    return {
      ok: true,
      data: {
        ...input,
        commission: Number((input.rentAmount * (input.commissionPercent / 100)).toFixed(2)),
      },
    };
  }

  if (input.commissionType === "flat") {
    return {
      ok: true,
      data: {
        ...input,
        commissionPercent: null,
      },
    };
  }

  return { ok: true, data: input };
}

function initials(fname?: string | null, lname?: string | null) {
  const f = (fname?.trim()?.[0] ?? "X").toUpperCase();
  const l = (lname?.trim()?.[0] ?? "X").toUpperCase();
  return `${f}${l}`;
}

function mmYYYY(month: number, year: number) {
  return `${String(month).padStart(2, "0")}${year}`;
}

/* ───────────────────────── CREATE ───────────────────────── */
/**
 * CREATE lease
 * - Validates input via Zod (LogSchema minus id/createdAt/userId)
 * - Applies ACL strictly
 * - Computes commission
 * - Creates an advance payment matching the commission
 */
export async function onCreate(agentId: string, form: FormData): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, message: "Not authenticated" };
  if (user.permissions !== "owner" && user.id !== agentId) return { ok: false, message: "Forbidden" };

  const role: Role = user.permissions;
  if (writableFields(logFieldPolicy, role).length === 0) return { ok: false, message: "Forbidden" };

  try {
    const raw = Object.fromEntries(form) as any;
    const parsed = LogSchema.omit({ id: true, createdAt: true, userId: true }).parse(raw);
    const scoped = keepPolicyFields(logFieldPolicy, parsed);
    const clean = sanitizeWriteInput(logFieldPolicy, role, scoped, { strict: true });

    const result = computeCommission(clean);
    if (!result.ok) return { ok: false, message: result.message };
    const ready = result.data as any;

    const { moveInDate, ...persist } = ready;

    const agent = await prisma.user.findUnique({
      where: { id: agentId },
      select: { fname: true, lname: true },
    });
    if (!agent) return { ok: false, message: "Agent not found" };

    const now = new Date();
    const month = now.getUTCMonth() + 1;
    const year = now.getUTCFullYear();

    await prisma.$transaction(async (tx) => {
      // increment monthly counter for this agent
      const counter = await tx.monthlyCounter.upsert({
        where: { userId_month_year: { userId: agentId, month, year } },
        update: { value: { increment: 1 } },
        create: { userId: agentId, month, year, value: 1 },
        select: { value: true },
      });

      const invoiceNumber =
        `${initials(agent.fname, agent.lname)}-` +
        `${mmYYYY(month, year)}-` +
        `${String(counter.value).padStart(2, "0")}`;

      await tx.lease.create({
        data: {
          ...persist,
          ...(moveInDate ? { moveInDate: new Date(moveInDate) } : {}),
          invoiceNumber,
          userId: agentId,
          Payment: {
            create: [
              {
                paymentType: PaymentType.advance,
                amount: Number(ready.commission ?? 0),
                date: new Date(),
                userId: agentId,
              },
            ],
          },
        },
      });
    });

    revalidatePath(`/agent/${agentId}/logs`);
    return { ok: true, message: "Created" };
  } catch (err: any) {
    return { ok: false, message: err?.message ?? "Create failed" };
  }
}

/* ───────────────────────── UPDATE ───────────────────────── */
/**
 * UPDATE lease
 * - Validates partial payload
 * - Applies ACL strictly
 * - Computes commission
 * - Updates or creates advance payment
 */
export async function onUpdate(
  agentId: string,
  id: string,
  form: FormData
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return forbid("Not authenticated");
  if (user.permissions !== "owner" && user.id !== agentId) return forbid();

  const role: Role = user.permissions;
  if (writableFields(logFieldPolicy, role).length === 0) return forbid();

  try {
    const raw = Object.fromEntries(form) as any;
    const { id: _ignoreId, userId: _ignoreUserId, createdAt: _ignoreCreatedAt, ...restRaw } = raw;

    const parsed = LogSchema.partial().parse(restRaw);
    const scoped = keepPolicyFields(logFieldPolicy, parsed);
    const clean = sanitizeWriteInput(logFieldPolicy, role, scoped, { strict: true });

    const result = computeCommission(clean);
    if (!result.ok) {
      return { ok: false, message: result.message };
    }
    const ready = result.data;

    const { id: _1, userId: _2, createdAt: _3, moveInDate, ...persist } = ready as any;

    await prisma.lease.update({
      where: { id },
      data: {
        ...persist,
        ...(moveInDate ? { moveInDate: new Date(moveInDate) } : {}),
      },
    });

    const existing = await prisma.payment.findFirst({
      where: { leaseId: id, paymentType: PaymentType.advance },
    });

    if (existing) {
      await prisma.payment.update({
        where: { id: existing.id },
        data: { amount: Number(ready.commission ?? 0) },
      });
    } else {
      await prisma.payment.create({
        data: {
          leaseId: id,
          paymentType: PaymentType.advance,
          amount: Number(ready.commission ?? 0),
          date: new Date(),
          userId: agentId,
        },
      });
    }

    revalidatePath(`/agent/${agentId}/logs`);
    return { ok: true, message: "Updated" };
  } catch (err: any) {
    return { ok: false, message: err?.message ?? "Update failed" };
  }
}

/* ───────────────────────── DELETE ───────────────────────── */
/**
 * DELETE lease
 * - Owner-only by default
 */
export async function onDelete(agentId: string, id: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return forbid("Not authenticated");
  if (user.permissions !== "owner" && user.id !== agentId) return forbid();

  try {
    await prisma.lease.delete({ where: { id } });
    revalidatePath(`/agent/${agentId}/logs`);
    return { ok: true, message: "Deleted" };
  } catch (err: any) {
    return { ok: false, message: err?.message ?? "Delete failed" };
  }
}
