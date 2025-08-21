"use server";

import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DrawSchema } from "@/lib/table/configs/draw";
import { revalidatePath } from "next/cache";

import {
    keepPolicyFields,
    sanitizeWriteInput,
    writableFields,
} from "@/lib/table/configs/acl";
import { drawFieldPolicy } from "@/lib/table/configs/acl/drawPolicy";
import type { Role } from "@/lib/table/types";

type ActionResult = { ok: boolean; message: string };

function forbid(message = "Forbidden"): ActionResult {
    return { ok: false, message };
}

/**
 * CREATE draw
 * - Validates input via Zod (DrawSchema minus id/createdAt)
 * - Applies ACL: drops/denies any fields the role can't write (strict)
 * - Forces userId = agentId (cannot be set by client)
 */
export async function onCreate(agentId: string, form: FormData): Promise<ActionResult> {
    const user = await getUser();
    if (!user) return forbid("Not authenticated");

    if (user.permissions !== "owner") return forbid();

    const role: Role = user.permissions;
    if (writableFields(drawFieldPolicy, role).length === 0) {
        return forbid();
    }

    try {
        const raw = Object.fromEntries(form) as any;

        // Validate user payload against schema
        const parsed = DrawSchema.omit({ id: true, createdAt: true, userId: true }).parse(raw);

        // Only consider fields that exist in the policy
        const scoped = keepPolicyFields(drawFieldPolicy, parsed);

        // Will throw if any forbidden fields (e.g., userId) are present
        const clean = sanitizeWriteInput(drawFieldPolicy, role, scoped, { strict: true });

        const { date, ...rest } = (clean ?? {}) as any;

        await prisma.draw.create({
            data: {
                ...rest,
                ...(date ? { date: new Date(date) } : {}),
                userId: agentId, // 🔒 enforce association here
            },
        });

        revalidatePath(`/agent/${agentId}/report`);
        return { ok: true, message: "Created" };
    } catch (err: any) {
        return { ok: false, message: err?.message ?? "Create failed" };
    }
}

/**
 * UPDATE draw
 * - Validates partial payload
 * - Applies ACL with strict mode (throws if attempting to send userId, etc.)
 * - Explicitly ignores any userId even if somehow present
 */
export async function onUpdate(
    agentId: string,
    id: string,
    form: FormData
): Promise<ActionResult> {
    const user = await getUser();
    if (!user) return forbid("Not authenticated");

    if (user.permissions !== "owner") return forbid();

    const role: Role = user.permissions;
    if (writableFields(drawFieldPolicy, role).length === 0) {
        return forbid();
    }

    try {
        const raw = Object.fromEntries(form) as any;

        // Strip fields that should *never* be client-controlled
        const { id: _ignoreId, userId: _ignoreUserId, createdAt: _ignoreCreatedAt, ...restRaw } = raw;

        // Parse allowed fields only
        const parsed = DrawSchema.partial().parse(restRaw);

        // Apply ACL scoping
        const scoped = keepPolicyFields(drawFieldPolicy, parsed);
        const clean = sanitizeWriteInput(drawFieldPolicy, role, scoped, { strict: true });

        // Final destructure for safety
        const { id: _ignoreId2, userId: _ignoreUserId2, createdAt: _ignoreCreatedAt2, date, ...rest } =
            (clean ?? {}) as any;

        await prisma.draw.update({
            where: { id },
            data: {
                ...rest,
                ...(date ? { date: new Date(date) } : {}),
            },
        });

        revalidatePath(`/agent/${agentId}/report`);
        return { ok: true, message: "Updated" };
    } catch (err: any) {
        return { ok: false, message: err?.message ?? "Update failed" };
    }
}

/**
 * DELETE draw
 * - Owner-only by default; adjust if needed.
 */
export async function onDelete(agentId: string, id: string): Promise<ActionResult> {
    const user = await getUser();
    if (!user) return forbid("Not authenticated");

    const role: Role = user.permissions;
    if (role !== "owner") return forbid();

    try {
        await prisma.draw.delete({ where: { id } });
        revalidatePath(`/agent/${agentId}/report`);
        return { ok: true, message: "Deleted" };
    } catch (err: any) {
        return { ok: false, message: err?.message ?? "Delete failed" };
    }
}
