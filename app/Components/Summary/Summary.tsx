import {
    HiOutlineBanknotes,
    HiOutlineReceiptPercent,
    HiOutlineWallet,
    HiOutlineXCircle,
} from "react-icons/hi2";
import styles from "./styles.module.css";
import { WorkbookData } from "@/lib/excel/types";
import DownloadReportButton from "../DownloadReportButton/DownloadReportButton";

type Row = {
    label: string;
    value: number;
    icon?: React.ReactNode;
    noTone?: boolean; // <- new flag
};

function getTone(value: number, noTone?: boolean) {
    if (noTone) return ""; // force no color
    if (value > 0) return "success"; // green
    if (value < 0) return "danger";  // red
    return "";                       // no color
}

export default function Summary({
    totalBillOut,
    splitAmount,
    totalChargebacksStat,
    totalDrawsStat,
    monthlyPayout,
    exportData
}: {
    totalBillOut: number;
    splitAmount: number;
    totalChargebacksStat: number;
    totalDrawsStat: number;
    monthlyPayout: number;
    exportData: WorkbookData | undefined
}) {
    const rows: Row[] = [
        { label: "Total Bill Out", value: totalBillOut, icon: <HiOutlineBanknotes size={20} />, noTone: true },
        { label: "70% Split Amount", value: splitAmount, icon: <HiOutlineReceiptPercent size={20} /> },
        { label: "Total Chargebacks", value: totalChargebacksStat, icon: <HiOutlineXCircle size={20} /> },
        { label: "Total Draws", value: totalDrawsStat, icon: <HiOutlineWallet size={20} /> },
    ];

    return (
        <div className={`section card ${styles.summary}`}>
            <div className="header">
                <h3>Report</h3>
            </div>

            <div className={styles.list}>
                {rows.map((r) => {
                    const tone = getTone(r.value, r.noTone);
                    return (
                        <div className={styles.row} key={r.label}>
                            <div className={styles.label}>
                                {r.icon}
                                <span>{r.label}</span>
                            </div>
                            <div className={`${styles.value} ${tone ? styles[tone] : ""}`}>
                                ${r.value.toFixed(2)}
                            </div>
                        </div>
                    );
                })}

                {/* Final total */}
                <div className={`${styles.row} ${styles.totalRow}`}>
                    <div className={`${styles.label} ${styles.totalLabel}`}>
                        Monthly Commission Check
                    </div>
                    <div className={`${styles.value} ${styles.totalValue}`}>
                        ${monthlyPayout.toFixed(2)}
                    </div>
                </div>
            </div>

            <div className={styles.downloadBtn}>
                <DownloadReportButton data={exportData} />
            </div>
        </div>
    );
}
