import styles from "./styles.module.css";

type Totals = {
    totalBillOut: number;           // info only; not a payout
    splitAmount: number;            // CREDIT – pass this in already computed
    totalAdjustments?: number;      // positive dollars; treated as DEBIT
    totalDraws?: number;            // can be + (debit) or - (credit)
    notes?: {
        billOut?: string;
        split?: string;
        adjustments?: string;
        draws?: string;
    };
};

type Props = {
    agent: string;
    period: string;                 // e.g., "August 2025"
    totals: Totals;
    showRunningBalance?: boolean;
};

// ---- Money helpers (exact math in cents) ----
const toCents = (n: number) => Math.round(n * 100);
const fromCents = (c: number) => c / 100;
const fmtUSDc = (cents: number) =>
    fromCents(cents).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function AgentReport({
    agent,
    period,
    totals,
    showRunningBalance = false,
}: Props) {
    const {
        totalBillOut,
        splitAmount,
        totalAdjustments = 0,
        totalDraws = 0,
        notes,
    } = totals;

    // ---- convert to cents ----
    const billOutC = toCents(totalBillOut);                        // INFO ONLY
    const splitC = toCents(splitAmount);                           // CREDIT
    const adjustmentsC = -toCents(Math.abs(totalAdjustments));     // always a DEBIT
    const drawsC = -toCents(totalDraws);                           // +input => debit, -input => credit

    const creditTotalC = splitC + (drawsC > 0 ? drawsC : 0);
    const debitTotalC = adjustmentsC + (drawsC < 0 ? drawsC : 0);  // <= 0
    const netC = creditTotalC + debitTotalC;

    let runningC = 0;

    const Row = ({
        label,
        amountCents,
        note,
        affectsBalance = true,
        forceNegativeStyle = false,
        typeOverride,
    }: {
        label: string;
        amountCents: number;
        note?: string;
        affectsBalance?: boolean;
        forceNegativeStyle?: boolean; // kept for compatibility; usually not needed
        typeOverride?: string;
    }) => {
        if (affectsBalance) runningC += amountCents;

        const isDebit = amountCents < 0 || forceNegativeStyle;
        const typeText =
            typeOverride ?? (amountCents < 0 ? "Debit" : amountCents > 0 ? "Credit" : "—");

        return (
            <tr>
                <td className={styles.type}>{typeText}</td>
                <td className={styles.desc}>
                    <div className={styles.label}>{label}</div>
                    {note ? <div className={styles.note}>{note}</div> : null}
                </td>
                <td className={`${styles.amt} ${typeOverride ? styles.info : (isDebit ? styles.neg : styles.pos)}`}>
                    {fmtUSDc(amountCents)}
                </td>
                {showRunningBalance && (
                    <td className={styles.balance}>
                        {affectsBalance ? fmtUSDc(runningC) : ""}
                    </td>
                )}
            </tr>
        );
    };

    return (
        <section className={styles.report}>
            <header className={styles.header}>
                <div className={styles.title}>Agent Payout Report</div>
                <div className={styles.meta}>
                    <span><strong>Agent:</strong> {agent}</span>
                    <span><strong>Period:</strong> {period}</span>
                </div>
            </header>

            <table className={styles.table}>
                <colgroup>
                    <col style={{ width: "110px" }} />
                    <col />
                    <col style={{ width: "160px" }} />
                    {showRunningBalance && <col style={{ width: "180px" }} />}
                </colgroup>
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Description</th>
                        <th className={styles.right}>Amount</th>
                        {showRunningBalance && <th className={styles.right}>Running balance</th>}
                    </tr>
                </thead>

                <tbody>
                    <tr className={styles.group}>
                        <td colSpan={showRunningBalance ? 4 : 3}>Summary</td>
                    </tr>
                    <Row
                        label="Total Bill Out"
                        amountCents={billOutC}
                        affectsBalance={false}
                        typeOverride="Info"
                        note={notes?.billOut}
                    />
                </tbody>

                <tbody>
                    <tr className={styles.group}>
                        <td colSpan={showRunningBalance ? 4 : 3}>Credits</td>
                    </tr>
                    <Row
                        label="Split Amount"
                        amountCents={splitC}
                        note={notes?.split}
                    />
                    {drawsC > 0 && (
                        <Row
                            label="Draws"
                            amountCents={drawsC}
                            note={notes?.draws}
                        />
                    )}
                    <tr className={styles.subtotal}>
                        <td colSpan={showRunningBalance ? 2 : 2}>Subtotal credits</td>
                        <td className={`${styles.right} ${styles.pos}`} colSpan={showRunningBalance ? 2 : 1}>
                            {fmtUSDc(creditTotalC)}
                        </td>
                    </tr>
                </tbody>

                <tbody>
                    <tr className={styles.group}>
                        <td colSpan={showRunningBalance ? 4 : 3}>Debits</td>
                    </tr>
                    <Row
                        label="Adjustments"
                        amountCents={adjustmentsC}
                        note={notes?.adjustments}
                    />
                    {drawsC < 0 && (
                        <Row
                            label="Draws"
                            amountCents={drawsC}
                            note={notes?.draws}
                        />
                    )}
                    <tr className={styles.subtotal}>
                        <td colSpan={showRunningBalance ? 2 : 2}>Subtotal debits</td>
                        <td className={`${styles.right} ${styles.neg}`} colSpan={showRunningBalance ? 2 : 1}>
                            {fmtUSDc(debitTotalC)}
                        </td>
                    </tr>
                </tbody>

                <tfoot>
                    <tr className={styles.net}>
                        <td colSpan={showRunningBalance ? 2 : 2}>Monthly commission check</td>
                        <td className={`${styles.right} ${netC < 0 ? styles.neg : styles.pos}`} colSpan={showRunningBalance ? 2 : 1}>
                            {fmtUSDc(netC)}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </section>
    );
}
