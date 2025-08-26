import StatCard, { StatGrid } from "@/app/Components/UI/StatCard/StatCard";
import { getMonthAndYear, getMonthCutoffs } from "@/lib/getMonthAndYear";
import { prisma } from "@/lib/prisma";
import { HiOutlineTrendingUp } from "react-icons/hi";
import { HiOutlineCurrencyDollar, HiOutlineUser } from "react-icons/hi2";

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
        where: { id },
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
            <h2>Hello Agent {agent?.fname} {agent?.lname}</h2>
            <p>Peroid: {month} {year}</p>
            { }
            <StatGrid desktopGridColumns={3} mobileGridColumns={1}>
                <StatCard
                    icon={<HiOutlineUser size={32} />}
                    label="Total Leases"
                    stat={totalLeases}
                    hue={200}
                />
                <StatCard
                    icon={<HiOutlineCurrencyDollar size={32} />}
                    label="Upcoming Unpaid Leases"
                    stat="$82,410"
                    hue={120}
                />
                <StatCard
                    icon={<HiOutlineTrendingUp size={32} />}
                    label="Chargebacks"
                    stat="12%"
                    hue={30}
                />
            </StatGrid>
        </div>
    );
}