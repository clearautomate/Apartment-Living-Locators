// app/agent/[id]/leases/page.tsx
import { withUser } from "@/lib/withUser";
import Client from "./Client";
import { redirect } from "next/navigation";
import { listPending, listHistory } from "@/lib/queries/collectionQueries";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function Page(props: Props) {
    const user = await withUser();
    const { id } = await props.params;

    if (user.id !== id && user.permissions !== "owner") {
        redirect("/unauthorized");
    }
    if (user.permissions === "agent" && user.id !== id) throw new Error("Forbidden");

    const pendingRows = await listPending({ userId: id });
    const historyRows = await listHistory({ userId: id });

    return (
        <div className="page-width section">
            <Client
                role={user.permissions}
                rows={{
                    pendingRows,
                    historyRows,
                }}
            />
        </div>
    );
}
