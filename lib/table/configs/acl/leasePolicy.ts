import { z } from "zod";
import type { Role } from "@/lib/table/types";
import { LogSchema } from "@/lib/table/configs/log";

export type FieldPolicy = {
    read: Role[];
    write: Role[];
};

type Log = z.infer<typeof LogSchema>;
type LogField = keyof Log;

export const logFieldPolicy = {
    id: { read: ["owner", "agent"], write: [] },
    moveInDate: { read: ["owner", "agent"], write: ["owner", "agent"] },
    invoiceNumber: { read: ["owner", "agent"], write: ["owner", "agent"] },
    complex: { read: ["owner", "agent"], write: ["owner", "agent"] },
    tenantFname: { read: ["owner", "agent"], write: ["owner", "agent"] },
    tenantLname: { read: ["owner", "agent"], write: ["owner", "agent"] },
    tenantEmail: { read: ["owner", "agent"], write: ["owner", "agent"] },
    apartmentNumber: { read: ["owner", "agent"], write: ["owner", "agent"] },
    rentAmount: { read: ["owner", "agent"], write: ["owner", "agent"] },
    commissionType: { read: ["owner", "agent"], write: ["owner", "agent"] },
    commissionPrecent: { read: ["owner", "agent"], write: ["owner", "agent"] },
    commission: { read: ["owner", "agent"], write: ["owner", "agent"] },
    extraNotes: { read: ["owner", "agent"], write: ["owner", "agent"] },
    paidStatus: { read: ["owner", "agent"], write: ["owner"] },
    createdAt: { read: ["owner", "agent"], write: [] },
    userId: { read: ["owner", "agent"], write: [] },
} as const satisfies Record<LogField, FieldPolicy>;