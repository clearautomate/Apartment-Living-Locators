import { z } from "zod";
import type { ColumnDef, TableConfig } from "../types";

export const LogSchema = z.object({
    id: z.uuid(),
    moveInDate: z.iso.datetime(),
    invoiceNumber: z.string().min(1),
    complex: z.string().min(1),
    tenantFname: z.string().min(1),
    tenantLname: z.string().min(1),
    apartmentNumber: z.string().min(1),
    rentAmount: z.coerce.number().positive(),
    commissionType: z.enum(["percent", "monthly"]),
    commissionDue: z.coerce.number().nonnegative(),
    extraNotes: z.string().nullable().optional(),
    paidStatus: z.enum(["unpaid", "paid", "goingToPay", "chargeback", "partially"]),
    createdAt: z.iso.datetime().optional(),
    userId: z.uuid(),
})
    .refine(
        (v) => v.commissionType !== "percent" || (v.commissionDue >= 0 && v.commissionDue <= 100),
        { message: "Percent commission must be 0–100", path: ["commissionDue"] }
    )
    .strict();

export type LogRow = z.infer<typeof LogSchema>;

export const logColumns: ColumnDef<LogRow>[] = [
    { key: "invoiceNumber", label: "Invoice #", input: "text", editableBy: ["owner", "agent"], required: true },
    { key: "complex", label: "Complex", input: "text", editableBy: ["owner", "agent"], required: true },
    { key: "tenantFname", label: "First", input: "text", editableBy: ["owner", "agent"], required: true },
    { key: "tenantLname", label: "Last", input: "text", editableBy: ["owner", "agent"], required: true },
    { key: "apartmentNumber", label: "Apt", input: "text", editableBy: ["owner", "agent"], required: true },

    {
        key: "rentAmount",
        label: "Rent",
        input: "number",
        editableBy: ["owner", "agent"],
        required: true,
        format: (v) =>
            typeof v === "number"
                ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v)
                : "",
    },

    {
        key: "commissionType",
        label: "Comm Type",
        input: "select",
        editableBy: ["owner", "agent"],
        options: [
            { value: "percent", label: "Percent" },
            { value: "monthly", label: "Monthly" },
        ],
    },

    {
        key: "commissionDue",
        label: "Comm Due",
        input: "number",
        editableBy: ["owner", "agent"],
        format: (v) =>
            typeof v === "number"
                ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v)
                : "",
    },

    {
        key: "paidStatus",
        label: "Status",
        input: "select",
        editableBy: ["owner"],
        options: [
            { value: "unpaid", label: "Unpaid" },
            { value: "paid", label: "Paid" },
            { value: "goingToPay", label: "Going to Pay" },
            { value: "chargeback", label: "Chargeback" },
            { value: "partially", label: "Partially" },
        ],
    },

    {
        key: "moveInDate",
        label: "Move-in",
        input: "date",
        editableBy: ["owner", "agent"],
        format: (v) => (v ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(String(v))) : ""),
    },

    { key: "extraNotes", label: "Notes", input: "text", editableBy: ["owner", "agent"] },

    {
        key: "createdAt",
        label: "Created",
        input: "text",
        format: (v) => (v
            ? new Intl.DateTimeFormat("en-US", { dateStyle: "short", timeStyle: "short" }).format(new Date(String(v)))
            : ""),
    },
];

export const logTableConfig: TableConfig<LogRow> = {
    id: "logs",
    schema: LogSchema,
    columns: logColumns,
};
