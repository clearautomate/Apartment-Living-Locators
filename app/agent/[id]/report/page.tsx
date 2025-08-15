// app/agent/[id]/leases/page.tsx
import { withUser } from "@/lib/withUser";
import Client from "./Client";
import { onCreate, onUpdate, onDelete } from "@/app/(actions)/logActions";
import { listRows } from "@/lib/queries/logQueries";
import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

interface Props {
    params: Promise<{ id: string }>;
    searchParams: Promise<SearchParams>;
}

export default async function Page(props: Props) {
    const user = await withUser();
    const { id } = await props.params;
    const sp = await props.searchParams;

    if (user.id !== id && user.permissions !== 'owner') {
        redirect('/unauthorized');
    }
    if (user.permissions === "agent" && user.id !== id) throw new Error("Forbidden");

    const rows = await listRows({ userId: id, searchParams: sp });

    // ✅ Bind server actions (no inline arrows)
    const onCreateBound = onCreate.bind(null, id);
    const onUpdateBound = onUpdate.bind(null, id);
    const onDeleteBound = onDelete.bind(null, id);

    return (
        <div className="page-width section">
            <Client
                role={user.permissions}
                rows={rows}
                actions={{
                    onCreate: onCreateBound,
                    onUpdate: onUpdateBound,
                    onDelete: onDeleteBound,
                }}
            />
        </div>
    );
}
