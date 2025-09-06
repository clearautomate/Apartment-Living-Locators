// Server Component: per-day payout line chart for a selected month
import dynamic from "next/dynamic";
import { prisma } from "@/lib/prisma";
import { getMonthCutoffs } from "@/lib/getMonthAndYear";
import { PaymentType } from "@/app/generated/prisma"; // enum: advance | full | partial | chargeback

const PayoutGraphClient = dynamic(() => import("./PayoutGraphClient"), { ssr: true });

type SP = { month?: string | number; year?: string | number };

function startOfDayUTC(d: Date) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
}
function addDaysUTC(d: Date, days: number) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days, 0, 0, 0));
}

function buildDailyWindows(start: Date, endExclusive: Date) {
    const days: { dayStart: Date; nextDay: Date; label: string }[] = [];
    let cur = startOfDayUTC(start);
    const stop = startOfDayUTC(endExclusive);
    while (cur < stop) {
        const next = addDaysUTC(cur, 1);
        // Label as day-of-month: "1", "2", ... (clean and compact for dense charts)
        const label = String(cur.getUTCDate());
        days.push({ dayStart: cur, nextDay: next, label });
        cur = next;
    }
    return days;
}

/**
 * Aggregates per-day:
 * - paid = sum(full + partial)
 * - chargebacks = sum(abs(chargeback))
 * - net = paid - chargebacks
 * - advances = sum(advance) (optional display)
 *
 * NOTE: uses payment.date to bin into days. Adjust if you want move-in day, etc.
 */
async function getDailySeriesForMonth(userId: string, sp?: SP) {
    const month = Number(sp?.month);
    const year = Number(sp?.year);
    const { start, nextMonthStart } = getMonthCutoffs(month, year);

    // One query for the whole month window
    const payments = await prisma.payment.findMany({
        where: {
            userId,
            date: { gte: start, lt: nextMonthStart },
        },
        select: { amount: true, paymentType: true, date: true },
        orderBy: { date: "asc" },
    });

    const bins = buildDailyWindows(start, nextMonthStart).map((w) => ({
        name: w.label,
        start: w.dayStart,
        end: w.nextDay,
        paid: 0,
        chargebacks: 0,
        advances: 0,
    }));

    // Bin payments by day
    for (const p of payments) {
        const d = p.date as Date;
        // compute index by diff-in-days to avoid O(n*m) scan
        const dayIndex = Math.floor((startOfDayUTC(d).getTime() - startOfDayUTC(start).getTime()) / 86400000);
        if (dayIndex < 0 || dayIndex >= bins.length) continue;

        const amt = p.amount ?? 0;

        if (p.paymentType === PaymentType.full || p.paymentType === PaymentType.partial) {
            bins[dayIndex].paid += amt;
        } else if (p.paymentType === PaymentType.chargeback) {
            bins[dayIndex].chargebacks += Math.abs(amt); // display as positive
        } else if (p.paymentType === PaymentType.advance) {
            bins[dayIndex].advances += amt;
        }
    }

    // Compute net + round
    return bins.map((b) => {
        const net = b.paid - b.chargebacks;
        return {
            name: b.name,
            paid: round2(b.paid),
            chargebacks: round2(b.chargebacks),
            net: round2(net),
            advances: round2(b.advances),
        };
    });
}

function round2(n: number) {
    return Math.round(n * 100) / 100;
}

export default async function PayoutGraph({
    id,
    sp,
    showAdvances = false,
    height = 320,
    clampNetToZero = true,
}: {
    id: string;          // agent/user id
    sp?: SP;             // { month?, year? } — same shape you use elsewhere
    showAdvances?: boolean;
    height?: number;
    clampNetToZero?: boolean;
}) {
    const data = await getDailySeriesForMonth(id, sp);

    return (
        <div className="w-full">
            <PayoutGraphClient
                data={data}
                showAdvances={showAdvances}
                height={height}
                clampNetToZero={clampNetToZero}
            />
        </div>
    );
}
