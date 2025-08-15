// app/layout.tsx or app/agent/[id]/layout.tsx
import type { ReactNode } from "react";
import { withUser } from "@/lib/withUser";
import Navbar from "@/app/Components/Navbar/Navbar";
import AgentNavbar from "@/app/Components/AgentNavbar/AgentNavbar";

interface LayoutProps {
    children: ReactNode;
    params: Promise<{ id: string }>;
}

export default async function AgentLayout({ children, params }: LayoutProps) {
    const user = await withUser();
    const { id } = await params;

    return (
        <>
            <header>
                <Navbar permissions={user.permissions} />
                <AgentNavbar permissions={user.permissions} paramId={id} />
            </header>
            <main>{children}</main>
        </>
    );
}
