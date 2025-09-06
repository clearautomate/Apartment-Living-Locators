import { PaidStatus } from "@/app/generated/prisma";
import { prisma } from "../prisma";
import type { LogRow } from "../table/configs/log";

type SearchParams = Record<string, string | string[] | undefined>;

interface Props {
    userId: string;
    searchParams?: SearchParams;
}

export async function listPending({ userId, searchParams }: Props): Promise<LogRow[]> {
    const rows = await prisma.lease.findMany({
        where: {
            userId,
            paidStatus: PaidStatus.unpaid,
        },
        orderBy: { moveInDate: "asc" },
    });

    return rows.map((r) => ({
        ...r,
        moveInDate: r.moveInDate.toISOString(),
        createdAt: r.createdAt.toISOString(),
    })) as LogRow[];
}

export async function listHistory({ userId, searchParams }: Props): Promise<LogRow[]> {
    const rows = await prisma.lease.findMany({
        where: {
            userId,
            paidStatus: PaidStatus.chargeback
        },
        orderBy: { moveInDate: "asc" },
    });

    return rows.map((r) => ({
        ...r,
        moveInDate: r.moveInDate.toISOString(),
        createdAt: r.createdAt.toISOString(),
    })) as LogRow[];
}
