"use client";

import styles from "./styles.module.css";
import { Dropdown } from "../UI/Dropdown/Dropdown";
import { useParams, useRouter, useSearchParams } from "next/navigation";

interface Props {
    users: {
        id: string;
        fname: string;
        lname: string;
    }[];
    permissions: string;
}

export default function Users({ users, permissions }: Props) {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Keep current search params as string
    const queryString = searchParams.toString();
    const suffix = queryString ? `?${queryString}` : "";

    const currentUserId = (params?.id as string | undefined) ?? "";
    const value = currentUserId;

    if (permissions !== "owner") return null;

    return (
        <div className={styles.fields}>
            <label htmlFor="user">Select Agent:</label>
            <Dropdown
                id="user"
                name="user"
                value={value}
                options={[
                    { value: "", label: "— Select an agent —" },
                    ...users.map((u) => ({
                        value: u.id,
                        label: `${u.fname} ${u.lname?.charAt(0) ?? ""}.`,
                    })),
                ]}
                onChange={(e) => {
                    const next =
                        typeof e === "string"
                            ? e
                            : (e.target as HTMLSelectElement).value;

                    if (next) {
                        router.push(`/agent/${next}/overview${suffix}`);
                    } else {
                        router.push(`/agent${suffix}`);
                    }
                }}
            />
        </div>
    );
}
