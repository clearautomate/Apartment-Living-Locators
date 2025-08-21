// app/layout.tsx or app/agent/[id]/layout.tsx
import type { ReactNode } from "react";
import { withUser } from "@/lib/withUser";
import Navbar from "@/app/Components/Navbar/Navbar";
import { redirect } from "next/navigation";

interface LayoutProps {
    children: ReactNode;
    params: Promise<{ id: string }>;
}

export default async function AgentLayout({ children, params }: LayoutProps) {
    const user = await withUser();

    if (user.permissions !== 'owner') {
        redirect('/unauthorized');
    }

    return (
        <>
            <header>
                <Navbar permissions={user.permissions} id={user.id}/>
            </header>
            <main>{children}</main>
        </>
    );
}
