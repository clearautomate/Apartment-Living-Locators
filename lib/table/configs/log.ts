import { z } from "zod";
import type { ColumnDef, TableConfig } from "../types";

export const LogSchema = z
    .object({
        id: z.uuid(),
        moveInDate: z.iso.datetime(),
        invoiceNumber: z.string().min(1).optional(),
        complex: z.string().min(1),
        tenantFname: z.string().min(1),
        tenantLname: z.string().min(1),
        tenantEmail: z.email().nullable().optional(),
        apartmentNumber: z.string().min(1),
        rentAmount: z.coerce.number().positive(),

        commissionType: z.enum(["flat", "percent"]),

        commissionPercent: z.coerce.number().min(0).max(100).optional(),
        commission: z.coerce.number().nonnegative().optional(),

        extraNotes: z.string().nullable().optional(),
        paidStatus: z
            .enum(["unpaid", "paid", "goingToPay", "chargeback", "partially"])
            .optional(),
        createdAt: z.iso.datetime().optional(),
        userId: z.uuid(),
    })
    .superRefine((val, ctx) => {
        if (val.commissionType === "percent") {
            if (
                val.commissionPercent === undefined ||
                val.commissionPercent === null
            ) {
                ctx.addIssue({
                    code: "custom",
                    path: ["commissionPercent"],
                    message: "Commission percent is required when type is 'percent'.",
                });
            }
            if (val.commission !== undefined) {
                ctx.addIssue({
                    code: "custom",
                    path: ["commission"],
                    message: "Commission amount should not be set when type is 'percent'.",
                });
            }
        }

        if (val.commissionType === "flat") {
            if (val.commission === undefined || val.commission === null) {
                ctx.addIssue({
                    code: "custom",
                    path: ["commission"],
                    message: "Commission amount is required when type is 'flat'.",
                });
            }
            if (val.commissionPercent !== undefined) {
                ctx.addIssue({
                    code: "custom",
                    path: ["commissionPercent"],
                    message: "Commission percent should not be set when type is 'flat'.",
                });
            }
        }
    });

export type LogRow = z.infer<typeof LogSchema>;

export const logColumns: ColumnDef<LogRow>[] = [
    { key: "invoiceNumber", label: "Invoice #", input: "text", editableBy: [], required: true, placeholder: "Enter invoice number" },
    { key: "complex", label: "Complex", input: "text", editableBy: ["owner", "agent"], required: true, placeholder: "Enter complex name" },
    { key: "tenantFname", label: "First", input: "text", editableBy: ["owner", "agent"], required: true, placeholder: "Enter tenant's first name" },
    { key: "tenantLname", label: "Last", input: "text", editableBy: ["owner", "agent"], required: true, placeholder: "Enter tenant's last name" },
    { key: "tenantEmail", label: "Email", input: "text", editableBy: ["owner", "agent"], placeholder: "Enter email address" },

    {
        key: "apartmentNumber",
        label: "Apt",
        input: "text",
        editableBy: ["owner", "agent"],
        required: true,
        placeholder: "Enter apt number",
        format: (v) => `#${v}`
    },

    {
        key: "rentAmount",
        label: "Rent",
        input: "number",
        editableBy: ["owner", "agent"],
        required: true,
        placeholder: "Enter rent amount",
        format: (v) =>
            typeof v === "number"
                ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v)
                : "",
    },

    {
        key: "commissionType",
        label: "Comm. Type",
        input: "select",
        editableBy: ["owner", "agent"],
        required: true,
        options: [
            { label: "Percent", value: "percent" },
            { label: "Flat", value: "flat" }
        ]
    },

    {
        key: "commissionPercent",
        label: "Comm. %",
        input: "number",
        editableBy: ["owner", "agent"],
        placeholder: "Enter percent",
        format: (value: unknown) => {
            if (typeof value === "number") {
                return `${value.toFixed(2)}%`;
            }
            if (typeof value === "string" && value.trim() !== "" && !isNaN(Number(value))) {
                return `${Number(value).toFixed(2)}%`;
            }
            return "";
        }
    },

    {
        key: "commission",
        label: "Comm. $",
        input: "number",
        editableBy: ["owner", "agent"],
        placeholder: "Enter flat commission",
        format: (v) =>
            typeof v === "number"
                ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v)
                : "",
    },

    {
        key: "paidStatus",
        label: "Status",
        input: "select",
        editableBy: [],
        options: [
            { value: "unpaid", label: "Unpaid" },
            { value: "paid", label: "Paid" },
            { value: "partially", label: "Partially" },
            { value: "chargeback", label: "Chargeback" },
        ],
    },

    {
        key: "moveInDate",
        label: "Move-in",
        input: "date",
        editableBy: ["owner", "agent"],
        required: true,
        format: (v) => (v ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(String(v))) : ""),
    },
    { key: "extraNotes", label: "Notes", input: "text", editableBy: ["owner", "agent"], placeholder: "Enter notes" }
];

export const logTableConfig: TableConfig<LogRow> = {
    id: "logs",
    schema: LogSchema,
    columns: logColumns,
};
