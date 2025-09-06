// import PayoutGraph from "@/app/Components/PayoutGraph/PayoutGraph";
import StatCard, { StatGrid } from "@/app/Components/UI/StatCard/StatCard";
import { getMonthAndYear, getMonthCutoffs } from "@/lib/getMonthAndYear";
import { prisma } from "@/lib/prisma";
import { HiOutlineUser } from "react-icons/hi2";

type SearchParams = Record<string, string | string[] | undefined>;

interface Props {
    params: Promise<{ id: string }>;
    searchParams: Promise<SearchParams>;
}

export default async function Page(props: Props) {
    const { id } = await props.params;
    const sp = await props.searchParams;

    const { start, nextMonthStart } = getMonthCutoffs(Number(sp.month), Number(sp.year));

    const { month, year } = getMonthAndYear(
        Number(sp.month),
        Number(sp.year)
    );

    const agent = await prisma.user.findUnique({
        where: { id, isDeleted: false },
        select: { fname: true, lname: true },
    });

    const totalLeases = await prisma.lease.count({
        where: {
            userId: id,
            createdAt: {
                gte: start,
                lt: nextMonthStart,
            },
        }
    })

    return (
        <div className="page-width section">
            <div className="header">
                <h2>Welcome back, {agent?.fname} {agent?.lname}</h2>
                <p>Here's your latest update.</p>
            </div>

            <div className="section">
                <StatGrid desktopGridColumns={3} mobileGridColumns={1}>
                    <StatCard
                        icon={<HiOutlineUser size={32} />}
                        label="Total Leases"
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