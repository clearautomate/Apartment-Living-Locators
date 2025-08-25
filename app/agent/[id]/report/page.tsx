// app/agent/[id]/leases/page.tsx
import { withUser } from "@/lib/withUser";
import {
    onCreate as onCreateLog,
    onUpdate as onUpdateLog,
    onDelete as onDeleteLog,
} from "@/app/(actions)/logActions";
import {
    onCreate as onCreateDraw,
    onUpdate as onUpdateDraw,
    onDelete as onDeleteDraw,
} from "@/app/(actions)/drawActions";
import { listRows as listLogRows } from "@/lib/queries/logQueries";
import { listOverdue as listAdjustmentRows } from "@/lib/queries/collectionQueries";
import { listRows as listDrawRows } from "@/lib/queries/drawQueries";
import { redirect } from "next/navigation";
import AgentReport from "@/app/Components/AgentReport/AgentReport";
import LogsClient from "./LogsClient";
import DrawsClient from "./DrawsClient";
import AdjustmentsClient from "./AdjustmentsClient";
import DownloadReportButton from "@/app/Components/DownloadReportButton/DownloadReportButton";
import styles from "./styles.module.css";
import { getMonthAndYear } from "@/lib/getMonthAndYear";
import { prisma } from "@/lib/prisma";

type SearchParams = Record<string, string | string[] | undefined>;

interface Props {
    params: Promise<{ id: string }>;
    searchParams: Promise<SearchParams>;
}

// exact-money helpers (avoid float drift)
const toCents = (n: number) => Math.round(n * 100);
const fromCents = (c: number) => c / 100;

export default async function Page(props: Props) {
    const user = await withUser();
    const { id } = await props.params;
    const sp = await props.searchParams;

    if (user.id !== id && user.permissions !== "owner") {
        redirect("/unauthorized");
    }
    if (user.permissions === "agent" && user.id !== id) throw new Error("Forbidden");

    const agent = await prisma.user.findUnique({
        where: { id },
        select: { fname: true, lname: true },
    });

    const isOwner = user.permissions === "owner";

    const logRows = await listLogRows({ userId: id, searchParams: sp });
    const adjustmentRows = await listAdjustmentRows({ userId: id });
    const drawRows = await listDrawRows({ userId: id, searchParams: sp });

    // ✅ Bind server actions (separate per type)
    const logActions = {
        onCreate: onCreateLog.bind(null, id),
        onUpdate: onUpdateLog.bind(null, id),
        onDelete: onDeleteLog.bind(null, id),
    };

    const drawActions = {
        onCreate: isOwner ? onCreateDraw.bind(null, id) : undefined,
        onUpdate: isOwner ? onUpdateDraw.bind(null, id) : undefined,
        onDelete: isOwner ? onDeleteDraw.bind(null, id) : undefined,
    };

    // Totals
    const totalBillOut = logRows.reduce((sum, row) => sum + (row.commission ?? 0), 0);
    const totalDraws = drawRows.reduce((sum, row) => sum + (row.amount ?? 0), 0);

    // 🔢 Calculate split HERE (in dollars, safely via cents)
    const SPLIT_PERCENT = 0.70;
    const splitAmount = fromCents(Math.round(toCents(totalBillOut) * SPLIT_PERCENT));

    // If you want to compute adjustments from rows instead of hardcoding 1000, do:
    // const totalAdjustments = adjustmentRows.reduce((sum, row) => sum + (row.amount ?? 0), 0);
    const totalAdjustments = 1000;

    const { month, year } = getMonthAndYear(
        Number(sp.month),
        Number(sp.year)
    );

    const agentName = `${agent?.fname ?? ""} ${agent?.lname ?? ""}`.trim();

    return (
        <>
            <div className={`page-width ${styles.downloadBtn}`}>
                <DownloadReportButton
                    data={{
                        agent: agentName,
                        period: `${month} ${year}`,
                        totalBillOut,
                        totalAdjustments,
                        totalDraws,
                        splitAmount,
                    }}
                />
            </div>

            <div className="page-width section">
                <AgentReport
                    agent={agentName}
                    period={`${month} ${year}`}
                    showRunningBalance={true}
                    totals={{
                        totalBillOut,
                        totalAdjustments,
                        totalDraws,
                        splitAmount,
                    }}
                />
            </div>

            <div className="page-width section">
                <LogsClient role={user.permissions} rows={logRows} actions={logActions} />
            </div>

            <div className="page-width section">
                <AdjustmentsClient role={user.permissions} rows={adjustmentRows} actions={logActions} />
            </div>

            <div className="page-width section">
                <DrawsClient role={user.permissions} rows={drawRows} actions={drawActions} />
            </div>
        </>
    );
}
