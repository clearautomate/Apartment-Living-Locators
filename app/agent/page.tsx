// app/layout.tsx or app/agent/[id]/layout.tsx
import type { ReactNode } from "react";
import { withUser } from "@/lib/withUser";
import Navbar from "@/app/Components/Navbar/Navbar";
import AgentNavbar from "@/app/Components/AgentNavbar/AgentNavbar";
import { redirect } from "next/navigation";

interface LayoutProps {
    params: Promise<{ id: string }>;
}

export default async function Page({ params }: LayoutProps) {
    const user = await withUser();

    if (user.permissions !== 'owner') {
        redirect('/unauthorized');
    }

    const { id } = await params;

    return (
        <>
            <Navbar permissions={user.permissions} />
            <AgentNavbar permissions={user.permissions} paramId={id} />
            <div className="page-width section">
                <h2 style={{ textAlign: 'center' }}>Please select an agent to display their data.</h2>
            </div>
        </>
    );
}
