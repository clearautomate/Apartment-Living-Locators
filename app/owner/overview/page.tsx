// import PayoutGraph from "@/app/Components/PayoutGraph/PayoutGraph";
import StatCard, { StatGrid } from "@/app/Components/UI/StatCard/StatCard";
import { getMonthAndYear, getMonthCutoffs } from "@/lib/getMonthAndYear";
import { prisma } from "@/lib/prisma";
import { withUser } from "@/lib/withUser";
import { redirect } from "next/navigation";
import { HiOutlineUser } from "react-icons/hi2";

type SearchParams = Record<string, string | string[] | undefined>;

interface Props {
    params: Promise<{ id: string }>;
    searchParams: Promise<SearchParams>;
}

export default async function Page() {
    const user = await withUser();

    if (user.permissions !== 'owner') {
        redirect('/unauthorized');
    }

    const { start, nextMonthStart } = getMonthCutoffs();

    const totalLeases = await prisma.lease.count({
        where: {
            createdAt: {
                gte: start,
                lt: nextMonthStart,
            },
        }
    })

    return (
        <div className="page-width section">
            <div className="header">
                <h2>Welcome back, {user?.fname} {user?.lname}</h2>
                <p>Here's your latest update.</p>
            </div>

            <div className="section">
                <StatGrid desktopGridColumns={3} mobileGridColumns={1}>
                    <StatCard
                        icon={<HiOutlineUser size={32} />}
                        label="Total Leases This Month"
                        stat={totalLeases}
                        hue={200}
                    />
                </StatGrid>
            </div>

            {/* <div className="section card">
                <div className="header">
                    <h2>Income</h2>
                    <p>Peroid: motn</p>
                </div>
                <PayoutGraph id={id} sp={sp} showAdvances={false} height={320} />
            </div> */}
        </div>
    );
}