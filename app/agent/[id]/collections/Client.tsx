// app/agent/[id]/leases/Client.tsx
"use client";

import { useMemo } from "react";
import { CudTable } from "@/app/Components/CudTable/CudTable";
import type { Role } from "@/lib/table/types";
import { logTableConfig, type LogRow } from "@/lib/table/configs/log";
import Tabs from "@/app/Components/UI/Tabs/Tabs";

type RowsByBucket = {
    pendingRows: LogRow[];
    historyRows: LogRow[];
};

interface ClientProps {
    role: Role;
    rows: RowsByBucket;
}

export default function Client({ role, rows }: ClientProps) {
    const sections: Array<{ label: string; key: keyof RowsByBucket }> = [
        { label: "Pending", key: "pendingRows" },
        { label: "History", key: "historyRows" },
    ];

    const baseTableProps = useMemo(
        () => ({
            config: logTableConfig,
            role,
            tableName: "Lease" as const,
            allowCreate: true,
        }),
        [role]
    );

    const tabs = useMemo(
        () =>
            sections.map(({ label, key }) => ({
                label,
                content: <CudTable {...baseTableProps} rows={rows[key]} link={'/lease'}/>,
            })),
        [sections, baseTableProps, rows.pendingRows, rows.historyRows]
    );

    return <Tabs tabs={tabs} />;
}
