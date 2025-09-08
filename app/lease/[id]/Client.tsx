// app/agent/[id]/leases/Client.tsx
"use client";
import { CudTable } from "@/app/Components/CudTable/CudTable";
import type { Role } from "@/lib/table/types";
import type { ActionResult } from "@/app/Components/CudTable/CudTable";
import { PaymentRow, paymentTableConfig } from "@/lib/table/configs/payment";

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
    rows: PaymentRow[];
    actions: Actions | {};
}) {
    return (
        <CudTable
            config={paymentTableConfig}
            role={role}
            rows={rows}
            actions={actions}
            tableName="Payments"
            allowCreate
        />
    );
}
