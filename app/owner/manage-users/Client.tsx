// app/agent/[id]/leases/Client.tsx
"use client";
import { CudTable } from "@/app/Components/CudTable/CudTable";
import type { Role } from "@/lib/table/types";
import type { ActionResult } from "@/app/Components/CudTable/CudTable";
import { UserRow, userTableConfig } from "@/lib/table/configs/user";

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
    rows: UserRow[];
    actions: Actions;
}) {
    return (
        <CudTable
            config={userTableConfig}
            role={role}
            rows={rows}
            actions={actions}
            tableName="Manage Users"
            allowCreate
        />
    );
}
