"use client";

import React from "react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Legend,
} from "recharts";

export type DailyPoint = {
    /** Day label, e.g. "1", "2", ..., or "01/15" if you prefer */
    name: string;
    /** Sum of FULL + PARTIAL payments that day */
    paid: number;
    /** Sum of CHARGEBACK amounts that day (kept positive for display) */
    chargebacks: number;
    /** Convenience: paid - chargebacks (non-negative clamp optional) */
    net: number;
    /** Optional: total ADVANCE payments that day */
    advances?: number;
};

export default function PayoutGraphClient({
    data,
    height = 320,
    showAdvances = false,
    clampNetToZero = true,
}: {
    data: DailyPoint[];
    height?: number;
    showAdvances?: boolean;
    /** If true, show `net` as at least 0 for nicer visuals */
    clampNetToZero?: boolean;
}) {
    // create a derived array if we need to clamp net
    const finalData = clampNetToZero
        ? data.map((d) => ({ ...d, net: Math.max(0, d.net) }))
        : data;

    return (
        <div className="w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={finalData} margin={{ top: 12, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v) => `$${Math.round(v).toLocaleString()}`} />
                    <Tooltip
                        formatter={(value: number, key) => {
                            const label =
                                typeof key === "string"
                                    ? key.charAt(0).toUpperCase() + key.slice(1)
                                    : String(key);
                            return [`$${Number(value).toLocaleString()}`, label];
                        }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="paid" name="Paid (full+partial)" dot={false} />
                    <Line type="monotone" dataKey="chargebacks" name="Chargebacks" dot={false} />
                    <Line type="monotone" dataKey="net" name="Net" dot={false} />
                    {showAdvances && <Line type="monotone" dataKey="advances" name="Advances" dot={false} />}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
