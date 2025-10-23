// app/agent/[id]/leases/Client.tsx
"use client";
import * as React from "react";
import { CudTable } from "@/app/Components/CudTable/CudTable";
import type { Role } from "@/lib/table/types";
import type { ActionResult } from "@/app/Components/CudTable/CudTable";
import { PaymentRow, paymentTableConfig } from "@/lib/table/configs/payment";
import { Button } from "@/app/Components/UI/Button/Button";

import styles from './styles.module.css'

type Actions = {
    onCreate: (form: FormData) => Promise<ActionResult>;
    onUpdate: (id: string, form: FormData) => Promise<ActionResult>;
    onDelete: (id: string) => Promise<ActionResult>;
};

export default function Client({
    role,
    rows,
    actions,
    maxPayment
}: {
    role: Role;
    rows: PaymentRow[];
    actions: Actions | {};
    maxPayment?: number;
}) {
    // Clone + patch only the "amount" column with an end-addon button.
    // If your column key is "paymentAmount" instead of "amount", this checks both.
    const enhancedConfig = React.useMemo(() => {
        const cloned = { ...paymentTableConfig };
        cloned.columns = paymentTableConfig.columns.map((col: any) => {
            const isAmountCol =
                col.key === "amount" || col.key === "paymentAmount";

            if (!isAmountCol) return col;

            return {
                ...col,
                addons: {
                    ...(col.addons ?? {}),
                    // allow programmatic fill via ctx.setInputValue
                    exposeInputRef: true,
                    endAddon: (ctx: any) => (
                        <div className={styles.maxAddon}>
                            <small>
                                {typeof maxPayment === "number"
                                    ? `($${maxPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                                    : "(auto)"}
                            </small>
                            <Button
                                size="sm"
                                type="button"
                                className="addonBtn"
                                title="Set to balance due (server will confirm on save)"
                                onClick={() => {
                                    // 1) Prefill with the server-passed estimate (if provided)
                                    if (typeof maxPayment === "number" && !Number.isNaN(maxPayment)) {
                                        ctx.setInputValue?.(String(maxPayment));
                                    }
                                    // 2) Mark intent so the server recomputes fresh at submit
                                    const hidden = document.createElement("input");
                                    hidden.type = "hidden";
                                    hidden.name = `${ctx.name}__useMax`; // e.g. "amount__useMax"
                                    hidden.value = "1";
                                    const form =
                                        (document.activeElement as HTMLElement | null)?.closest?.("form") ??
                                        document.querySelector("form");
                                    form?.appendChild(hidden);
                                }}
                            >
                                Use Max
                            </Button>
                        </div>
                    ),
                },
            };
        });
        return cloned;
    }, [maxPayment]);

    return (
        <CudTable
            config={enhancedConfig}
            role={role}
            rows={rows}
            actions={actions}
            tableName="Payments"
            allowCreate
        />
    );
}
