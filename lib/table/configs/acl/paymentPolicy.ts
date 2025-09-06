import { z } from "zod";
import type { Role } from "@/lib/table/types";
import { PaymentSchema } from "../payment";

export type FieldPolicy = {
    read: Role[];
    write: Role[];
};

type Payment = z.infer<typeof PaymentSchema>;
type PaymentField = keyof Payment;

export const paymentFieldPolicy = {
    id: { read: ["owner", "agent"], write: [] },
    leaseId: { read: ["owner", "agent"], write: [] },
    paymentType: { read: ["owner", "agent"], write: ["owner"] },
    amount: { read: ["owner", "agent"], write: ["owner"] },
    date: { read: ["owner", "agent"], write: ["owner"] },
    notes: { read: ["owner", "agent"], write: ["owner"] },
    createdAt: { read: ["owner", "agent"], write: [] },
} as const satisfies Record<PaymentField, FieldPolicy>;