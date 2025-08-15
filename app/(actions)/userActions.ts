// app/(actions)/leaseActions.ts
"use server";

import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserSchema } from "@/lib/table/configs/user";
import { revalidatePath } from "next/cache";

export async function onCreate(form: FormData) {
    // TODO: VALIDATE REQUEST ARE LEGIT!!!

    const data = Object.fromEntries(form) as any;
    const parsed = UserSchema.omit({ id: true, createdAt: true, isDeleted: true }).parse(data);

    await prisma.user.create({
        data: {
            ...parsed,
        },
    });

    revalidatePath(`/owner/manage-users`);
    return { ok: true, message: "Created" } as const;
}

export async function onUpdate(id: string, form: FormData) {
    const raw = Object.fromEntries(form) as any;
    const parsed = UserSchema.partial().parse(raw);

    await prisma.user.update({
        where: { id },
        data: {
            ...parsed,
        },
    });

    revalidatePath(`/owner/manage-users`);
    return { ok: true, message: "Updated" } as const;
}

export async function onDelete(id: string) {

    await prisma.user.update({
        where: { id },
        data: {
            isDeleted: true
        }
    });

    revalidatePath(`/owner/manage-users`);
    return { ok: true, message: "Deleted" } as const;
}
