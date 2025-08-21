// app/(actions)/userActions.ts
"use server";

import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserSchema } from "@/lib/table/configs/user";
import { revalidatePath } from "next/cache";

import {
    keepPolicyFields,
    sanitizeWriteInput,
    writableFields,
} from "@/lib/table/configs/acl";
import { userFieldPolicy } from "@/lib/table/configs/acl/userPolicy"; // ← ensure this exists
import type { Role } from "@/lib/table/types";

type ActionResult = { ok: boolean; message: string };

function forbid(message = "Forbidden"): ActionResult {
    return { ok: false, message };
}

/**
 * CREATE user
 * - Owner-only
 * - Validates payload against schema (cannot set id/createdAt/isDeleted)
 * - Applies ACL strictly to prevent writing forbidden fields
 */
export async function onCreate(form: FormData): Promise<ActionResult> {
    const me = await getUser();
    if (!me) return forbid("Not authenticated");

    const role: Role = me.permissions;
    if (role !== "owner") return forbid();

    // Extra guard: if policy for owner somehow empty, also deny
    if (writableFields(userFieldPolicy, role).length === 0) return forbid();

    try {
        const raw = Object.fromEntries(form) as any;

        // Schema-level guardrails
        const parsed = UserSchema.omit({
            id: true,
            createdAt: true,
            isDeleted: true,
        }).parse(raw);

        // Scope to policy keys and enforce strict ACL
        // const scoped = keepPolicyFields(userFieldPolicy, parsed);
        // const clean: = sanitizeWriteInput(userFieldPolicy, role, scoped, { strict: true });

        await prisma.user.create({
            data: {
                ...(parsed ?? {}),
            },
        });

        revalidatePath(`/owner/manage-users`);
        return { ok: true, message: "Created" };
    } catch (err: any) {
        return { ok: false, message: err?.message ?? "Create failed" };
    }
}

/**
 * UPDATE user
 * - Owner-only (no self-edit here; handle profile edits elsewhere if desired)
 * - Validates partial payload
 * - Drops/blocks id/createdAt/isDeleted even if present
 * - Applies strict ACL to prevent forbidden writes (e.g., permissions if policy disallows)
 */
export async function onUpdate(id: string, form: FormData): Promise<ActionResult> {
    const me = await getUser();
    if (!me) return forbid("Not authenticated");

    const role: Role = me.permissions;
    if (role !== "owner") return forbid();
    if (writableFields(userFieldPolicy, role).length === 0) return forbid();

    try {
        const raw = Object.fromEntries(form) as any;

        // Never allow these from client
        const {
            id: _ignoreId,
            createdAt: _ignoreCreatedAt,
            isDeleted: _ignoreIsDeleted,
            ...restRaw
        } = raw;

        // Partial schema parse
        const parsed = UserSchema.partial().parse(restRaw);

        // Policy scope + strict enforcement
        const scoped = keepPolicyFields(userFieldPolicy, parsed);
        const clean = sanitizeWriteInput(userFieldPolicy, role, scoped, { strict: true });

        // Final belt-and-suspenders
        const {
            id: _ignoreId2,
            createdAt: _ignoreCreatedAt2,
            isDeleted: _ignoreIsDeleted2,
            ...data
        } = (clean ?? {}) as any;

        await prisma.user.update({
            where: { id },
            data,
        });

        revalidatePath(`/owner/manage-users`);
        return { ok: true, message: "Updated" };
    } catch (err: any) {
        return { ok: false, message: err?.message ?? "Update failed" };
    }
}

/**
 * DELETE user (soft)
 * - Owner-only
 * - Marks isDeleted = true
 */
export async function onDelete(id: string): Promise<ActionResult> {
    const me = await getUser();
    if (!me) return forbid("Not authenticated");

    const role: Role = me.permissions;
    if (role !== "owner") return forbid();

    try {
        await prisma.user.update({
            where: { id },
            data: { isDeleted: true },
        });

        revalidatePath(`/owner/manage-users`);
        return { ok: true, message: "Deleted" };
    } catch (err: any) {
        return { ok: false, message: err?.message ?? "Delete failed" };
    }
}
