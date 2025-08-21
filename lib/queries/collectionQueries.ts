import { prisma } from "../prisma";
import type { LogRow } from "../table/configs/log";

interface Props {
    userId: string;
}

/** 90-day cutoff: anything <= cutoff is 90+ days old (overdue); > cutoff is 89 days or less (upcoming). */
function ninetyDayCutoff(): Date {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    return cutoff;
}

export async function listOverdue({ userId }: Props): Promise<LogRow[]> {
    const cutoff = ninetyDayCutoff();

    const rows = await prisma.lease.findMany({
        where: {
            userId,
            moveInDate: {
                lte: cutoff, // 90+ days old (includes exactly 90)
            },
        },
        orderBy: { moveInDate: "asc" },
    });

    return rows.map((r) => ({
        ...r,
        moveInDate: r.moveInDate.toISOString(),
        createdAt: r.createdAt.toISOString(),
    })) as LogRow[];
}

export async function listUpcoming({ userId }: Props): Promise<LogRow[]> {
    const cutoff = ninetyDayCutoff();

    const rows = await prisma.lease.findMany({
        where: {
            userId,
            moveInDate: {
                gt: cutoff, // 89 days old or less (and all future dates)
            },
        },
        orderBy: { moveInDate: "asc" },
    });

    return rows.map((r) => ({
        ...r,
        moveInDate: r.moveInDate.toISOString(),
        createdAt: r.createdAt.toISOString(),
    })) as LogRow[];
}

export async function listPast({ userId }: Props): Promise<LogRow[]> {
    const cutoff = ninetyDayCutoff();

    const rows = await prisma.lease.findMany({
        where: {
            userId,
            moveInDate: {
                gt: cutoff,
            },
        },
        orderBy: { moveInDate: "asc" },
    });

    return rows.map((r) => ({
        ...r,
        moveInDate: r.moveInDate.toISOString(),
        createdAt: r.createdAt.toISOString(),
    })) as LogRow[];
}
