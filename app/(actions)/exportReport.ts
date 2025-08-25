// app/actions/export-xlsx.ts
'use server';

import ExcelJS from 'exceljs';

const usdFmt = '$#,##0.00;[Red]-$#,##0.00';

type Data = {
    agent: string,
    period: string,
    totalBillOut: number,
    totalAdjustments: number,
    totalDraws: number,
    splitAmount: number,
}

export async function exportReport(data: Data): Promise<{ filename: string; base64: string }> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Agent Payout Report', { properties: { tabColor: { argb: 'FFDCE6F1' } } });

    // Column setup
    ws.columns = [
        { header: 'Type', key: 'type', width: 14 },
        { header: 'Description', key: 'desc', width: 60 },
        { header: 'Amount', key: 'amount', width: 16, style: { numFmt: usdFmt } },
        { header: 'Running balance', key: 'running', width: 18, style: { numFmt: usdFmt } },
    ];

    // Header block
    ws.mergeCells('A1:D1'); ws.getCell('A1').value = 'Agent Payout Report';
    ws.getCell('A1').font = { bold: true, size: 16 };
    ws.getCell('A1').alignment = { vertical: 'middle' };
    ws.getRow(1).height = 22;

    ws.getCell('A2').value = 'Agent'; ws.getCell('B2').value = data.agent;
    ws.getCell('A3').value = 'Period'; ws.getCell('B3').value = data.period;
    ws.getCell('A4').value = 'Generated'; ws.getCell('B4').value = new Date().toLocaleString();

    // Spacer
    ws.addRow([]);
    const headerRow = ws.addRow([]); // table header row inserted automatically by columns, style it:
    headerRow.values = ['Type', 'Description', 'Amount', 'Running balance'];
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    headerRow.border = { top: { style: 'thin' }, bottom: { style: 'thin' } };

    let running = 0;
    const add = (type: string, desc: string, delta?: number, opts?: { color?: 'credit' | 'debit' }) => {
        if (typeof delta === 'number') running += delta;
        const r = ws.addRow({
            type,
            desc,
            amount: typeof delta === 'number' ? delta : null,
            running: typeof delta === 'number' ? running : null,
        });

        // style amount by credit/debit
        if (typeof delta === 'number') {
            const amt = r.getCell('amount');
            if (opts?.color === 'credit') amt.font = { color: { argb: 'FF16A34A' } }; // green
            if (opts?.color === 'debit') amt.font = { color: { argb: 'FFDC2626' } }; // red
        }
        r.getCell('running').font = { bold: true };
    };

    const section = (label: string) => {
        const row = ws.addRow(['', label]);
        row.font = { bold: true };
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
    };

    const subtotal = (label: string, value?: number) => {
        const r = ws.addRow(['', label, null, value ?? null]);
        r.font = { bold: true };
        r.border = { top: { style: 'thin' } };
    };

    // CREDITS
    section('CREDITS');
    add('Credit', 'Total bill out', data.totalBillOut, { color: 'credit' });
    add('Credit', '70% split amount – 70% of revenue', data.splitAmount, { color: 'credit' });
    subtotal('Subtotal credits', running);

    // DEBITS
    section('DEBITS');
    add('Debit', 'Adjustment To Check – Chargeback – Lease #12345', data.totalAdjustments, { color: 'debit' });
    add('Debit', 'Total $ of draws – YTD draws applied', data.totalDraws, { color: 'debit' });
    subtotal('Subtotal debits', data.totalAdjustments + data.totalDraws);

    // Final line
    const final = ws.addRow(['', 'Monthly commission check', null, running]);
    final.font = { bold: true, color: { argb: running < 0 ? 'FFDC2626' : 'FF111827' } };

    // Notes
    ws.addRow([]);
    const note = ws.addRow([
        '',
        'Notes: “70% split amount” is calculated from Total bill out × 0.70. Adjustments and draws reduce the net.',
    ]);
    note.getCell(2).alignment = { wrapText: true };

    // Borders for data region
    const firstDataRow = headerRow.number;
    const lastDataRow = ws.lastRow?.number ?? firstDataRow;
    for (let r = firstDataRow; r <= lastDataRow; r++) {
        const row = ws.getRow(r);
        ['A', 'B', 'C', 'D'].forEach(c => {
            const cell = ws.getCell(`${c}${r}`);
            cell.border = {
                left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            };
        });
    }

    const buf = await wb.xlsx.writeBuffer();
    const base64 = Buffer.from(buf).toString('base64');
    const filename = `agent-payout-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return { filename, base64 };
}
