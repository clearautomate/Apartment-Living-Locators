// app/agent/[id]/leases/Client.tsx
"use client";
import { CudTable } from "@/app/Components/CudTable/CudTable";
import type { Role } from "@/lib/table/types";
import type { ActionResult } from "@/app/Components/CudTable/CudTable";
import { DrawRow, drawTableConfig } from "@/lib/table/configs/draw";

type Actions = {
    onCreate?: (form: FormData) => Promise<ActionResult>;
    onUpdate?: (id: string, form: FormData) => Promise<ActionResult>;
    onDelete?: (id: string) => Promise<ActionResult>;
};

export default function DrawsClient({
    role,
    rows,
    actions,
}: {
    role: Role;
    rows: DrawRow[];
    actions: Actions;
}) {
    const allowCreate = Boolean(actions?.onCreate);

    return (
        <CudTable
            config={drawTableConfig}
            role={role}
            rows={rows}
            actions={actions}
            tableName="Draws"
            allowCreate={allowCreate}
        />
    );
}
