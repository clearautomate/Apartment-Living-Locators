// app/agent/[id]/leases/Client.tsx
"use client";

import { useMemo } from "react";
import { CudTable } from "@/app/Components/CudTable/CudTable";
import type { Role } from "@/lib/table/types";
import { logTableConfig, type LogRow } from "@/lib/table/configs/log";
import type { ActionResult } from "@/app/Components/CudTable/CudTable";
import Tabs from "@/app/Components/UI/Tabs/Tabs";

type Actions = {
    onCreate?: (form: FormData) => Promise<ActionResult>;
    onUpdate?: (id: string, form: FormData) => Promise<ActionResult>;
    onDelete?: (id: string) => Promise<ActionResult>;
};

type RowsByBucket = {
    overdueRows: LogRow[];
    upcomingRows: LogRow[];
    pastRows: LogRow[];
};

interface ClientProps {
    role: Role;
    rows: RowsByBucket;
    actions: Actions;
}

export default function Client({ role, rows, actions }: ClientProps) {
    const sections: Array<{ label: string; key: keyof RowsByBucket }> = [
        { label: "Overdue", key: "overdueRows" },
        { label: "Upcoming", key: "upcomingRows" },
        { label: "Past", key: "pastRows" },
    ];

    const baseTableProps = useMemo(
        () => ({
            config: logTableConfig,
            role,
            actions,
            tableName: "Lease" as const,
            allowCreate: true,
        }),
        [role, actions]
    );

    const tabs = useMemo(
        () =>
            sections.map(({ label, key }) => ({
                label,
                content: <CudTable {...baseTableProps} rows={rows[key]} />,
            })),
        [sections, baseTableProps, rows.overdueRows, rows.upcomingRows, rows.pastRows]
    );

    return <Tabs tabs={tabs} />;
}
