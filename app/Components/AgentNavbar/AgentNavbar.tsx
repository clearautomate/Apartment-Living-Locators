"use client";

import styles from "./styles.module.css";
import { Dropdown } from "../UI/Dropdown/Dropdown";
import { Button } from "../UI/Button/Button";
const Links = dynamic(() => import("./Links"), { ssr: false });
import { HiOutlineFilter } from "react-icons/hi";
import Users from "./Users";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

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
    const pathname = usePathname();
    const router = useRouter();

    const defaultMonth =
        searchParams.get("month") || String(now.getUTCMonth() + 1).padStart(2, "0");
    const defaultYear = searchParams.get("year") || String(now.getUTCFullYear());

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(false); // stop loading whenever URL actually changes
    }, [searchParams, pathname]);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const month = formData.get("month") as string;
        const year = formData.get("year") as string;

        // only trigger navigation if params are different
        if (month !== defaultMonth || year !== defaultYear) {
            setLoading(true);
            router.push(`${pathname}?month=${month}&year=${year}`);
        }
    }

    return (
        <>
            <div className="page-width">
                <div className={styles.filters}>
                    <Users users={users} permissions={permissions} />
                    <form onSubmit={handleSubmit} className={styles.fields}>
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
                            loading={loading}
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
