'use client';

import { HiOutlineDocumentDownload } from "react-icons/hi";
import { Button } from "../UI/Button/Button";
import { exportReport } from '@/app/(actions)/exportReport';
import React from "react";

interface Props {
    data: {
        agent: string,
        period: string,
        totalBillOut: number,
        totalAdjustments: number,
        totalDraws: number,
        splitAmount: number,
    }
}

export default function DownloadReportButton({ data }: Props) {
    const [isLoading, startTransition] = React.useTransition();

    const handleClick = () => {
        startTransition(() => {
            (async () => {
                const { filename, base64 } = await exportReport(data); // returns { filename, base64 }

                // Decode base64 -> bytes
                const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

                // XLSX MIME type
                const blob = new Blob([bytes], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                });

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename ?? 'agent-payout-report.xlsx';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            })();
        });
    };

    return (
        <Button onClick={handleClick} loading={isLoading} size="lg" icon={<HiOutlineDocumentDownload size={24} />} iconPosition="right">Download Report</Button>
    );
}