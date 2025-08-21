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

type ActionResult = { ok: boolean; message: string };

function forbid(message = "Forbidden"): ActionResult {
  return { ok: false, message };
}

/**
 * CREATE lease
 * - Validates input via Zod (LogSchema minus id/createdAt/userId)
 * - Applies ACL: drops/denies any fields the role can't write (strict)
 * - Forces userId = agentId (cannot be set by client)
 */
export async function onCreate(agentId: string, form: FormData): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return forbid("Not authenticated");

  if (user.permissions !== "owner" && user.id !== agentId) return forbid();

  const role: Role = user.permissions;
  if (writableFields(logFieldPolicy, role).length === 0) {
    return forbid();
  }

  try {
    const raw = Object.fromEntries(form) as any;

    // Validate against schema (client cannot set userId/createdAt/id)
    const parsed = LogSchema.omit({ id: true, createdAt: true, userId: true }).parse(raw);

    // Only consider fields we have a policy for
    const scoped = keepPolicyFields(logFieldPolicy, parsed);

    // Enforce ACL strictly (throws if forbidden keys were present)
    const clean = sanitizeWriteInput(logFieldPolicy, role, scoped, { strict: true });

    const { moveInDate, ...rest } = (clean ?? {}) as any;

    await prisma.lease.create({
      data: {
        ...rest,
        ...(moveInDate ? { moveInDate: new Date(moveInDate) } : {}),
        userId: agentId, // 🔒 enforce association
      },
    });

    revalidatePath(`/agent/${agentId}/leases`);
    return { ok: true, message: "Created" };
  } catch (err: any) {
    return { ok: false, message: err?.message ?? "Create failed" };
  }
}

type CommissionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

function computeCommission<T extends Record<string, any>>(input: T): CommissionResult<T> {
  if (input.commissionType === "percent") {
    if (typeof input.commissionPrecent !== "number" || isNaN(input.commissionPrecent)) {
      return { ok: false, message: "Comm. % must be a number when Comm. Type is 'Percent'" };
    }

    return {
      ok: true,
      data: {
        ...input,
        commission: Number((input.rentAmount * (input.commissionPrecent / 100)).toFixed(2)),
      },
    };
  }

  if (input.commissionType === "flat") {
    return {
      ok: true,
      data: {
        ...input,
        commissionPrecent: null, // explicitly clear in DB
      },
    };
  }

  return { ok: true, data: input };
}
/**
 * UPDATE lease
 * - Validates partial payload
 * - Applies ACL with strict mode (throws if attempting to send userId, etc.)
 * - Explicitly ignores id/userId/createdAt even if present
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
  if (writableFields(logFieldPolicy, role).length === 0) {
    return forbid();
  }

  try {
    const raw = Object.fromEntries(form) as any;

    // Strip fields that are never client-controlled
    const {
      id: _ignoreId,
      userId: _ignoreUserId,
      createdAt: _ignoreCreatedAt,
      ...restRaw
    } = raw;

    // Parse only what's allowed by schema (partial)
    const parsed = LogSchema.partial().parse(restRaw);

    // Apply ACL scoping + strict enforcement
    const scoped = keepPolicyFields(logFieldPolicy, parsed);
    const clean = sanitizeWriteInput(logFieldPolicy, role, scoped, { strict: true });

    const result = computeCommission(clean);
    if (!result.ok) {
      return { ok: false, message: result.message };
    }
    const ready = result.data;

    // Final guard
    const {
      id: _4,
      userId: _5,
      createdAt: _6,
      moveInDate,
      ...persist
    } = ready as any;

    await prisma.lease.update({
      where: { id },
      data: {
        ...persist,
        ...(moveInDate ? { moveInDate: new Date(moveInDate) } : {}),
      },
    });

    revalidatePath(`/agent/${agentId}/leases`);
    return { ok: true, message: "Updated" };
  } catch (err: any) {
    return { ok: false, message: err?.message ?? "Update failed" };
  }
}

/**
 * DELETE lease
 * - Owner-only by default; adjust if needed.
 */
export async function onDelete(agentId: string, id: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return forbid("Not authenticated");

  if (user.permissions !== "owner" && user.id !== agentId) return forbid();

  try {
    await prisma.lease.delete({ where: { id } });
    revalidatePath(`/agent/${agentId}/leases`);
    return { ok: true, message: "Deleted" };
  } catch (err: any) {
    return { ok: false, message: err?.message ?? "Delete failed" };
  }
}
