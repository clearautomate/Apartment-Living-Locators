import { listUsers } from "@/lib/queries/userQueries";
import Client from "./Client";
import { onCreate, onDelete, onUpdate } from "@/app/(actions)/userActions";

export default async function ManageUsersPage() {
    const rows = await listUsers();

    // ✅ Bind server actions (no inline arrows)
    const onCreateBound = onCreate.bind(null);
    const onUpdateBound = onUpdate.bind(null);
    const onDeleteBound = onDelete.bind(null);

    return (
        <div className="page-width section">
            <Client
                role={'owner'}
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