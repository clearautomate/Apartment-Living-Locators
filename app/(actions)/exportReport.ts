// app/actions/exportReports.ts
"use server";

import ExcelJS from "exceljs";
import { createReportSheet } from "@/lib/excel/createReportSheet";
import { createTransactionsSheet } from "@/lib/excel/createTransactionsSheet";
import type { WorkbookData } from "@/lib/excel/types";
import { createDrawsSheet } from "@/lib/excel/createDrawsSheet";

/** Export ONE workbook containing MULTIPLE report sheets (all unified data). */
export async function exportReport(
    data: WorkbookData
): Promise<{ filename: string; base64: string }> {
    const wb = new ExcelJS.Workbook();

    await createReportSheet(wb, data);
    await createTransactionsSheet(wb, data);
    await createDrawsSheet(wb, data);

    const buf = await wb.xlsx.writeBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    const filename = `reports-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return { filename, base64 };
}
