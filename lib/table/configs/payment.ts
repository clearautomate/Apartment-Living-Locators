import { z } from "zod";
import type { ColumnDef, TableConfig } from "../types";

export const PaymentSchema = z.object({
    id: z.uuid(),
    leaseId: z.uuid(),
    paymentType: z.enum(["advance", "full", "partial", "chargeback"]),
    amount: z.coerce.number().optional(),
    date: z.iso.datetime(),
    notes: z.string().nullable().optional(),
    createdAt: z.iso.datetime().optional(),
}).superRefine((val, ctx) => {
    const needsAmount = val.paymentType === "partial";
    const hasAmount =
        typeof val.amount === "number" && Number.isFinite(val.amount);

    if (needsAmount && !hasAmount) {
        ctx.addIssue({
            code: "custom",
            path: ["amount"],
            message: "Amount is required for Partial payments.",
        });
    }
});

export type PaymentRow = z.infer<typeof PaymentSchema>;

export const paymentColumns: ColumnDef<PaymentRow>[] = [
    {
        key: "paymentType",
        label: "Type",
        input: "select",
        editableBy: ["owner"],
        options: [
            { value: "advance", label: "Advance" },
            { value: "full", label: "Full" },
            { value: "partial", label: "Partial" },
            { value: "chargeback", label: "Chargeback" },
        ],
    },

    {
        key: "amount",
        label: "Amount",
        input: "number",
        editableBy: ["owner"],
        placeholder: "Enter amount",
        format: (v) =>
            typeof v === "number"
                ? new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 2,
                }).format(v)
                : "",
    },

    {
        key: "date",
        label: "Date",
        input: "date",
        editableBy: ["owner"],
        required: true,
        format: (v) =>
            v
                ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(String(v)))
                : "",
    },

    {
        key: "notes",
        label: "Notes",
        input: "text",
        editableBy: ["owner"],
        placeholder: "Enter notes",
    },
];

export const paymentTableConfig: TableConfig<PaymentRow> = {
    id: "payments",
    schema: PaymentSchema,
    columns: paymentColumns,
};
