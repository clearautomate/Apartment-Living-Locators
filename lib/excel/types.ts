import { DrawRow } from "../table/configs/draw";

// app/lib/excel/workbookData.ts
export type WorkbookData = {
    // Always available / commonly used across sheets
    agent: string;
    period: string;
    stats: {
        totalBillOut: string;
        splitAmount: string;
        chargebacks: string;
        draws: string;
        monthlyPayout: string;
    };

    payments: {
        rows: Array<{
            headerRow: {
                invoice: string;
                moveInDate: string;
                rent: string;
                commission: string;
                status: string;
                totalBillout: string;
            }
            transactionRow: Array<{
                type: string;
                date: string;        // e.g., "2025-08-15"
                leaseId: string;
                amount: string;      // keep as string; sheets will parse
                note?: string;
            }>
        }>;
    };

    draws: {
        rows: Array<{
            date: string;
            amount: string;
            note: string | undefined;
        }>
    }
};
