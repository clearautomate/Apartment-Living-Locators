"use client";

import styles from "./styles.module.css";
import { Dropdown } from "../UI/Dropdown/Dropdown";
import { Button } from "../UI/Button/Button";
const Links = dynamic(() => import("./Links"), {
    ssr: false,
    loading: () => <div style={{ height: 200 }} />,
});
import { HiOutlineFilter } from "react-icons/hi";
import Users from "./Users";
import { User } from "@/app/generated/prisma";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

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
    users: {
        id: string;
        fname: string;
        lname: string;
    }[];
}

export default function AgentNavbar({ permissions, paramId, users }: Props) {
    const { months, years } = monthYearOptions(2025);
    const now = new Date();

    const searchParams = useSearchParams();

    const defaultMonth =
        searchParams.get("month") || String(now.getUTCMonth() + 1).padStart(2, "0");
    const defaultYear = searchParams.get("year") || String(now.getUTCFullYear());

    return (
        <>
            <div className="page-width">
                <div className={styles.filters}>
                    <Users users={users} permissions={permissions} />
                    <form method="GET" className={styles.fields}>
                        <label htmlFor="month">Month:</label>
                        <Dropdown
                            id="month"
                            name="month"
                            defaultValue={defaultMonth}
                            options={months.map((m) => ({
                                value: m.value,
                                label: m.label,
                            }))}
                        />
                        <Dropdown
                            id="year"
                            name="year"
                            defaultValue={defaultYear}
                            options={years.map((y) => ({
                                value: String(y),
                                label: String(y),
                            }))}
                        />

                        <Button
                            type="submit"
                            size="lg"
                            icon={<HiOutlineFilter size={20} />}
                        >
                            Apply
                        </Button>
                    </form>
                </div>
            </div>

            {paramId && <Links paramId={paramId} />}
        </>
    );
}
