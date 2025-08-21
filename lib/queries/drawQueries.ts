import { prisma } from "../prisma";
import type { DrawRow } from "../table/configs/draw";

type SearchParams = Record<string, string | string[] | undefined>;

interface Props {
    userId: string;
    searchParams?: SearchParams;
}

/** First moment of the given UTC month, and the first moment of the next UTC month. */
function monthRangeUTC(year: number, month01: number) {
    // month01 is 1–12; JS Date month is 0–11
    const start = new Date(Date.UTC(year, month01 - 1, 1, 0, 0, 0, 0));
    const nextMonthStart = new Date(Date.UTC(year, month01, 1, 0, 0, 0, 0));
    return { start, nextMonthStart };
}

/** Normalize a search param that can be string | string[] | undefined into a trimmed string. */
function pickParam(v: string | string[] | undefined): string {
    if (Array.isArray(v)) return (v[0] ?? "").toString().trim();
    return (v ?? "").toString().trim();
}

export async function listRows({ userId, searchParams }: Props): Promise<DrawRow[]> {
    // Read month/year (fallback to current UTC month/year)
    const now = new Date();
    const fallbackMonth = now.getUTCMonth() + 1; // 1–12
    const fallbackYear = now.getUTCFullYear();

    const monthStr = pickParam(searchParams?.month); // e.g. "08"
    const yearStr = pickParam(searchParams?.year);   // e.g. "2025"

    let month01 = Number.parseInt(monthStr, 10);
    let year = Number.parseInt(yearStr, 10);

    if (!Number.isInteger(month01) || month01 < 1 || month01 > 12) {
        month01 = fallbackMonth;
    }
    if (!Number.isInteger(year) || year < 1900 || year > 9999) {
        year = fallbackYear;
    }

    const { start, nextMonthStart } = monthRangeUTC(year, month01);

    // Filter by moveInDate within the month (UTC)
    const rows = await prisma.draw.findMany({
        where: {
            userId,
            date: {
                gte: start,
                lt: nextMonthStart,
            },
        },
        orderBy: { createdAt: "desc" },
    });

    // Serialize dates to strings to match LogRow shape
    return rows.map((r) => ({
        ...r,
        date: r.date.toISOString(),
        createdAt: r.createdAt.toISOString(),
    })) as DrawRow[];
}
