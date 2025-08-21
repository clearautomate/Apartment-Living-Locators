"use client";

import styles from "./styles.module.css";
import { usePathname, useSearchParams } from "next/navigation";

import { HiOutlineCollection, HiOutlineViewGrid } from "react-icons/hi";
import { HiOutlineChartBar, HiOutlineDocumentText } from "react-icons/hi2";
import Link from "../UI/Link/Link";

interface Props {
    paramId: string;
}

export default function Links({ paramId }: Props) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Turn current search params into a string like "?month=08&year=2025"
    const query = searchParams.toString();
    const qs = query ? `?${query}` : "";

    return (
        <div className="page-width">
            <div className={styles.links}>
                <Link
                    href={`/agent/${paramId}/overview${qs}`}
                    icon={<HiOutlineViewGrid size={20} />}
                    className={pathname.endsWith("/overview") ? styles.active : ""}
                >
                    Overview
                </Link>

                <Link
                    href={`/agent/${paramId}/logs${qs}`}
                    icon={<HiOutlineDocumentText size={20} />}
                    className={pathname.endsWith("/logs") ? styles.active : ""}
                >
                    Logs
                </Link>

                <Link
                    href={`/agent/${paramId}/collections${qs}`}
                    icon={<HiOutlineCollection size={20} />}
                    className={pathname.endsWith("/collections") ? styles.active : ""}
                >
                    Collections
                </Link>

                <Link
                    href={`/agent/${paramId}/report${qs}`}
                    icon={<HiOutlineChartBar size={20} />}
                    className={pathname.endsWith("/report") ? styles.active : ""}
                >
                    Report
                </Link>
            </div>
        </div>
    );
}
