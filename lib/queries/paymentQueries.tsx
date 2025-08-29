import { prisma } from "../prisma";
import { PaymentRow } from "../table/configs/payment";

interface Props {
    id: string;
}

export async function listRows({ id }: Props): Promise<PaymentRow[]> {
    const rows = await prisma.payment.findMany({
        where: {
            leaseId: id
        },
    });

    // Serialize dates to strings to match LogRow shape
    return rows.map((r) => ({
        ...r,
        date: r.date.toISOString(),
        createdAt: r.createdAt.toISOString(),
    })) as PaymentRow[];
}
