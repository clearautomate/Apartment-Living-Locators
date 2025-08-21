// app/layout.tsx or app/agent/[id]/layout.tsx
import type { ReactNode } from "react";
import { withUser } from "@/lib/withUser";
import Navbar from "@/app/Components/Navbar/Navbar";
import AgentNavbar from "@/app/Components/AgentNavbar/AgentNavbar";
import { prisma } from "@/lib/prisma";

interface LayoutProps {
    children: ReactNode;
    params: Promise<{ id: string }>;
}

export default async function AgentLayout({ children, params }: LayoutProps) {
    const user = await withUser();

    const users =
        user.permissions === "owner"
            ? await prisma.user.findMany({
                select: { id: true, fname: true, lname: true },
                where: {
                    permissions: { not: "owner" },
                    isDeleted: false,
                },
            })
            : [];

    const { id } = await params;

    return (
        <>
            <header>
                <Navbar permissions={user.permissions} id={user.id}/>
                <AgentNavbar permissions={user.permissions} paramId={id} users={users} />
            </header>
            <main>{children}</main>
        </>
    );
}
