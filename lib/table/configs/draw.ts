import { z } from "zod";
import type { ColumnDef, TableConfig } from "../types";

export const DrawSchema = z.object({
    id: z.uuid(),
    date: z.iso.datetime(),
    amount: z.coerce.number(),
    notes: z.string().nullable().optional(),
    createdAt: z.iso.datetime().optional(),

    userId: z.uuid(),
}).strict();

export type DrawRow = z.infer<typeof DrawSchema>;

const fmtUSD = (n: unknown) =>
    typeof n === "number"
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
        : "";

export const drawColumns: ColumnDef<DrawRow>[] = [
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
        key: "amount",
        label: "Amount",
        input: "number",
        editableBy: ["owner"],
        required: true,
        placeholder: "Enter amount",
        format: fmtUSD,
    },
    {
        key: "notes",
        label: "Notes",
        input: "text",
        editableBy: ["owner"],
        placeholder: "Enter notes",
    },
];

export const drawTableConfig: TableConfig<DrawRow> = {
    id: "draws",
    schema: DrawSchema,
    columns: drawColumns,
};
