// app/layout.tsx or app/agent/[id]/layout.tsx
import type { ReactNode } from "react";
import { withUser } from "@/lib/withUser";
import Navbar from "@/app/Components/Navbar/Navbar";
import AgentNavbar from "@/app/Components/AgentNavbar/AgentNavbar";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface LayoutProps {
    params: Promise<{ id: string }>;
}

export default async function Page({ params }: LayoutProps) {
    const user = await withUser();


    if (user.permissions !== 'owner') {
        redirect('/unauthorized');
    }

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
            <Navbar permissions={user.permissions} id={user.id}/>
            <AgentNavbar permissions={user.permissions} paramId={id} users={users} />
            <div className="page-width section">
                <h2 style={{ textAlign: 'center' }}>Please select an agent to display their data.</h2>
            </div>
        </>
    );
}
