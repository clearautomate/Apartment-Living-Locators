// app/agent/[id]/leases/page.tsx
import { withUser } from "@/lib/withUser";
import Client from "./Client";
import { onCreate, onUpdate, onDelete } from "@/app/(actions)/logActions";
import { redirect } from "next/navigation";
import { listOverdue, listUpcoming, listPast } from "@/lib/queries/collectionQueries";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function Page(props: Props) {
    const user = await withUser();
    const { id } = await props.params;

    if (user.id !== id && user.permissions !== 'owner') {
        redirect('/unauthorized');
    }
    if (user.permissions === "agent" && user.id !== id) throw new Error("Forbidden");

    const isOwner = user.permissions === "owner";

    const overdueRows = await listOverdue({ userId: id });
    const upcomingRows = await listUpcoming({ userId: id });
    const pastRows = await listPast({ userId: id })

    // ✅ Bind server actions (no inline arrows)
    const actions = {
        onCreate: isOwner ? onCreate.bind(null, id) : undefined,
        onUpdate: isOwner ? onUpdate.bind(null, id) : undefined,
        onDelete: isOwner ? onDelete.bind(null, id) : undefined,
    };

    return (
        <div className="page-width section">
            <Client
                role={user.permissions}
                rows={{
                    overdueRows,
                    upcomingRows,
                    pastRows
                }}
                actions={actions}
            />
        </div>
    );
}
