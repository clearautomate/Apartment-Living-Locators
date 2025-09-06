import { getMonthCutoffs } from "../getMonthAndYear";
import { prisma } from "../prisma";
import type { LogRow } from "../table/configs/log";

type SearchParams = Record<string, string | string[] | undefined>;

interface Props {
    userId: string;
    searchParams?: SearchParams;
}

export async function listRows({ userId, searchParams }: Props): Promise<LogRow[]> {
    // Read month/year (fallback to current UTC month/year)
    const month = Number(searchParams?.month);
    const year = Number(searchParams?.year);
    const { start, nextMonthStart } = getMonthCutoffs(month, year);

    // Filter by moveInDate within the month (UTC)
    const rows = await prisma.lease.findMany({
        where: {
            userId,
            createdAt: {
                gte: start,
                lt: nextMonthStart,
            },
        },
        orderBy: { createdAt: "desc" },
    });

    // Serialize dates to strings to match LogRow shape
    return rows.map((r) => ({
        ...r,
        moveInDate: r.moveInDate.toISOString(),
        createdAt: r.createdAt.toISOString(),
    })) as LogRow[];
}
