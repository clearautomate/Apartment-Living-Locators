import { z } from "zod";
import type { Role } from "@/lib/table/types";
import { DrawSchema } from "@/lib/table/configs/draw";

export type FieldPolicy = {
    read: Role[];
    write: Role[];
};

type Draw = z.infer<typeof DrawSchema>;
type DrawField = keyof Draw;

export const drawFieldPolicy = {
    id: { read: ["owner", "agent"], write: [] },
    date: { read: ["owner", "agent"], write: ["owner"] },
    amount: { read: ["owner", "agent"], write: ["owner"] },
    notes: { read: ["owner", "agent"], write: ["owner"] },
    userId: { read: ["owner", "agent"], write: [] },
    createdAt: { read: ["owner"], write: [] },
} as const satisfies Record<DrawField, FieldPolicy>;
