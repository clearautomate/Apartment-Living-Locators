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
import styles from './styles.module.css'

type SearchParams = Record<string, string | string[] | undefined>;

interface Props {
    params: Promise<{ id: string }>;
    searchParams: Promise<SearchParams>;
}

export default async function Page(props: Props) {
    const user = await withUser();
    const { id } = await props.params;
    const sp = await props.searchParams;

    if (user.id !== id && user.permissions !== "owner") {
        redirect("/unauthorized");
    }
    if (user.permissions === "agent" && user.id !== id) throw new Error("Forbidden");

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

    const items = [
        { label: "Total bill out", amount: 2000.38 },
        { label: "70% split amount", amount: 300.5, note: "70% of revenue" },
        { label: "Adjustment To Check", amount: -1000.0, note: "Chargeback – Lease #12345" },
        { label: "Total $ of draws", amount: -2000.0, note: "YTD draws applied" },
    ];

    return (
        <>
            <div className={`page-width ${styles.downloadBtn}`}>
                <DownloadReportButton />
            </div>

            <div className="page-width section">
                <AgentReport
                    agent="John Agent"
                    period="August 2025"
                    items={items}
                    showRunningBalance={true}
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
