// app/lib/excel/reportSheet.ts
"use server";

import type { Workbook, Worksheet } from "exceljs";
import { numberFormats, fonts } from "./excelStyles";
import type { WorkbookData } from "./types";

function parseMoney(maybe: string): number | null {
    const raw = maybe.trim();
    if (!raw) return null;

    const isParenNeg = /^\(.*\)$/.test(raw);
    const cleaned = raw.replace(/[$,()\s]/g, "");
    if (!cleaned) return null;

    const n = Number(cleaned);
    if (!Number.isFinite(n)) return null;

    return isParenNeg ? -n : n;
}

/** Creates the "Monthly Report" summary sheet from unified data */
export async function createReportSheet(
    wb: Workbook,
    data: WorkbookData,
): Promise<Worksheet> {
    const ws = wb.addWorksheet("Report");

    // Add an empty first column to shift everything right
    ws.columns = [
        { key: "spacer", width: 5 },  // empty spacer column
        { key: "label", width: 30 },
        { key: "value", width: 30 },
    ];

    // Merge now starts from B1:C1
    ws.mergeCells("B1:C1");
    const title = ws.getCell("B1");
    title.value = "Monthly Report";
    title.font = fonts.h1;

    const meta = [
        ["Agent", data.agent],
        ["Time Period", data.period],
        ["Generated", new Date().toDateString()],
    ];
    meta.forEach((m, i) => {
        const row = ws.getRow(3 + i);
        row.getCell(2).value = m[0]; // now column B
        row.getCell(2).font = { bold: true };
        row.getCell(3).value = m[1]; // now column C
    });

    const stats: Array<{ label: string; value: string, isPayoutRow?: boolean }> = [
        { label: "Total Bill Out", value: data.stats.totalBillOut },
        { label: "70% Split Amount", value: data.stats.splitAmount },
        { label: "Total Chargebacks", value: data.stats.chargebacks },
        { label: "Total Draws", value: data.stats.draws },
        { label: "Monthly Commission Check", value: data.stats.monthlyPayout, isPayoutRow: true },
    ];

    let startRow = 8;
    stats.forEach((s, i) => {
        const row = ws.getRow(startRow + i);
        row.getCell(2).value = s.label; // now column B

        if (s.isPayoutRow) {
            row.getCell(2).font = { bold: true };
            row.getCell(3).font = { bold: true };
        }

        const parsed = parseMoney(s.value);
        if (parsed !== null) {
            row.getCell(3).value = parsed; // now column C
            row.getCell(3).numFmt = numberFormats.usd;
        } else {
            row.getCell(3).value = s.value;
        }
    });

    return ws;
}
