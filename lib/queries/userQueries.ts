import { prisma } from "../prisma";

import type { UserRow } from "../table/configs/user";

export async function listUsers() {
    const rows = await prisma.user.findMany(
        {
            where: {
                isDeleted: false
            },
            select: {
                id: true,
                fname: true,
                lname: true,
                email: true,
                phone: true,
                username: true,
                password: true,
                permissions: true,
                // createdAt: true
            },
            orderBy: [
                { permissions: "asc" }, // or "desc"
                { fname: "desc" },  // or "asc"
            ],
        }
    )

    return rows.map((r) => ({
        ...r,
        // createdAt: r.createdAt.toISOString(),
    })) as UserRow[];
}