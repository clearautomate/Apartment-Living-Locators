import { z } from "zod";
import type { ColumnDef, TableConfig } from "../types";

export const PaymentSchema = z.object({
    id: z.uuid(),
    leaseId: z.uuid(),
    amount: z.coerce.number(),
    date: z.iso.datetime(),
    notes: z.string().nullable().optional(),
    createdAt: z.iso.datetime().optional(),
})

export type PaymentRow = z.infer<typeof PaymentSchema>;

export const paymentColumns: ColumnDef<PaymentRow>[] = [
    {
        key: "amount",
        label: "Amount",
        input: "number",
        editableBy: ["owner", "agent"],
        required: true,
        format: (v) =>
            typeof v === "number"
                ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v)
                : "",
    },

    {
        key: "date",
        label: "Date",
        input: "date",
        editableBy: ["owner", "agent"],
        required: true,
        format: (v) => (v ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(String(v))) : ""),
    },

    { key: "notes", label: "Notes", input: "text", editableBy: ["owner", "agent"] }
];

export const paymentTableConfig: TableConfig<PaymentRow> = {
    id: "payments",
    schema: PaymentSchema,
    columns: paymentColumns,
};
