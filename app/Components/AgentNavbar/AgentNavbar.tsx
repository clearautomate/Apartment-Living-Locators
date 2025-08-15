import { prisma } from "@/lib/prisma";
import Link from "../UI/Link/Link";
import styles from "./styles.module.css";
import { Dropdown } from "../UI/Dropdown/Dropdown";
import { Button } from "../UI/Button/Button";
import { HiOutlineDownload } from "react-icons/hi";

function monthYearOptions(startYear = 2025) {
    const now = new Date();
    const current = now.getUTCFullYear();

    const months = [
        { value: "01", label: "January" },
        { value: "02", label: "February" },
        { value: "03", label: "March" },
        { value: "04", label: "April" },
        { value: "05", label: "May" },
        { value: "06", label: "June" },
        { value: "07", label: "July" },
        { value: "08", label: "August" },
        { value: "09", label: "September" },
        { value: "10", label: "October" },
        { value: "11", label: "November" },
        { value: "12", label: "December" },
    ];

    const years: number[] = [];
    for (let y = Math.min(startYear, current); y <= current; y++) {
        years.push(y);
    }

    return { months, years };
}

interface Props {
    permissions: "owner" | "admin" | "agent";
    paramId: string;
}

export default async function AgentNavbar({ permissions, paramId }: Props) {
    const users =
        permissions === "owner"
            ? await prisma.user.findMany({
                select: { id: true, fname: true, lname: true },
            })
            : [];

    const { months, years } = monthYearOptions(2025);
    const now = new Date();
    const defaultMonth = String(now.getUTCMonth() + 1).padStart(2, "0");
    const defaultYear = String(now.getUTCFullYear());

    return (
        <>
            {permissions === "owner" && <nav className={styles.nav}>
                <div className="page-width">
                    <div className={styles.agentLinks}>
                        {users.map((u) => (
                            <Link
                                key={u.id}
                                href={`/agent/${u.id}/logs`}
                            >
                                {u.fname} {u.lname?.charAt(0) ?? ""}.
                            </Link>
                        ))}
                    </div>
                </div>
            </nav >
            }

            {paramId && (
                <>
                    <div className="page-width">
                        <div className={styles.links}>
                            <Link href={`/agent/${paramId}/overview`}>Overview</Link>
                            <Link href={`/agent/${paramId}/logs`}>Logs</Link>
                            <Link href={`/agent/${paramId}/collections`}>Collections</Link>
                            <Link href={`/agent/${paramId}/report`}>Report</Link>
                        </div>
                    </div>

                    <div className={`page-width ${styles.filterRow}`}>
                        <form method="GET">
                            <label htmlFor="month">Month</label>
                            <Dropdown
                                id="month"
                                name="month"
                                defaultValue={defaultMonth}
                                options={months.map((m) => ({
                                    value: m.value,
                                    label: m.label,
                                }))}
                            />

                            <label htmlFor="year">Year</label>
                            <Dropdown
                                id="year"
                                name="year"
                                defaultValue={defaultYear}
                                options={years.map((y) => ({
                                    value: String(y),
                                    label: String(y),
                                }))}
                            />

                            <Button type="submit">Apply</Button>
                        </form>

                        <Button icon={<HiOutlineDownload />}>Download Report</Button>
                    </div>
                </>
            )}
        </>
    );
}
