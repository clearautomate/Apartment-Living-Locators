import { prisma } from "@/lib/prisma";
import { withUser } from "@/lib/withUser";

/** First moment of the given UTC month, and the first moment of the next UTC month. */
function monthRangeUTC(year: number, month01: number) {
    // month01 is 1–12; JS Date month is 0–11
    const start = new Date(Date.UTC(year, month01 - 1, 1, 0, 0, 0, 0));
    const nextMonthStart = new Date(Date.UTC(year, month01, 1, 0, 0, 0, 0));
    return { start, nextMonthStart };
}

export default async function OwnerOverview() {
    const user = await withUser();

    // Read month/year (fallback to current UTC month/year)
    const now = new Date();
    const fallbackMonth = now.getUTCMonth() + 1; // 1–12
    const fallbackYear = now.getUTCFullYear();

    // const monthStr = pickParam(searchParams?.month); // e.g. "08"
    // const yearStr = pickParam(searchParams?.year);   // e.g. "2025"

    const monthStr = "08"; // e.g. "08"
    const yearStr = "2025";   // e.g. "2025"

    let month01 = Number.parseInt(monthStr, 10);
    let year = Number.parseInt(yearStr, 10);

    if (!Number.isInteger(month01) || month01 < 1 || month01 > 12) {
        month01 = fallbackMonth;
    }
    if (!Number.isInteger(year) || year < 1900 || year > 9999) {
        year = fallbackYear;
    }

    const { start, nextMonthStart } = monthRangeUTC(year, month01);

    const leaseCount = await prisma.lease.count({
        where: {
            createdAt: {
                gte: start,
                lt: nextMonthStart,
            },
        },
    });

    return (
        <div className="page-width">
            Total Number Of Leases This Month {leaseCount}
            {/* Total Rental Income Generated {leaseCount} */}
            Total number and $ amount of unpaid collections
            Monthly comparisons charts
        </div>
    )
}