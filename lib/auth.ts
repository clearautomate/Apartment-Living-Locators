// lib/auth.ts
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export type SessionUser = { id: string; permissions: "owner" | "agent" } | null;

export async function getUser(): Promise<SessionUser> {
    const token = (await cookies()).get("token")?.value;
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        return { id: decoded.id, permissions: decoded.permissions };
    } catch {
        return null;
    }
}