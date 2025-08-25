// app/api/collections/chargeback/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays, startOfDay } from "date-fns";

export async function POST() {
    const cutoff = startOfDay(subDays(new Date(), 90));
    const result = await prisma.lease.updateMany({
        where: {
            paidStatus: "unpaid",
            moveInDate: { lte: cutoff },
        },
        data: { paidStatus: "chargeback" },
    });

    return NextResponse.json({ updated: result.count });
}