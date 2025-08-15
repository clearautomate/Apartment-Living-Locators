// app/agent/[id]/leases/Client.tsx
"use client";
import { CudTable } from "@/app/Components/CudTable/CudTable";
import type { Role } from "@/lib/table/types";
import { logTableConfig } from "@/lib/table/configs/log";
import type { LogRow } from "@/lib/table/configs/log";
import type { ActionResult } from "@/app/Components/CudTable/CudTable";

type Actions = {
    onCreate: (form: FormData) => Promise<ActionResult>;
    onUpdate: (id: string, form: FormData) => Promise<ActionResult>;
    onDelete: (id: string) => Promise<ActionResult>;
};

export default function Client({
    role,
    rows,
    actions,
}: {
    role: Role;
    rows: LogRow[];
    actions: Actions;
}) {
    return (
        <CudTable
            config={logTableConfig}
            role={role}
            rows={rows}
            actions={actions}
            tableName="Lease"
            allowCreate
        />
    );
}
