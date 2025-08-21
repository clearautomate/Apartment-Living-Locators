import { z } from "zod";
import type { Role } from "@/lib/table/types";
import { UserSchema } from "@/lib/table/configs/user";

export type FieldPolicy = {
    read: Role[];
    write: Role[];
};

type User = z.infer<typeof UserSchema>;
type UserField = keyof User;

export const userFieldPolicy = {
    id: { read: ["owner", "agent"], write: [] },
    fname: { read: ["owner", "agent"], write: ["owner"] },
    lname: { read: ["owner", "agent"], write: ["owner"] },
    email: { read: ["owner", "agent"], write: ["owner"] },
    phone: { read: ["owner", "agent"], write: ["owner"] },
    username: { read: ["owner", "agent"], write: ["owner"] },
    password: { read: ["owner"], write: ["owner"] },
    permissions: { read: ["owner"], write: ["owner"] },
    isDeleted: { read: ["owner"], write: ["owner"] },
    createdAt: { read: ["owner"], write: [] },
} as const satisfies Record<UserField, FieldPolicy>;
