import styles from "./styles.module.css";

type LineItem = {
    label: string;
    amount: number;            // positive=credit, negative=debit
    note?: string;
};

type Props = {
    agent: string;
    period: string;            // e.g., "August 2025"
    items: LineItem[];
    showRunningBalance?: boolean;
};

function fmtUSD(n: number) {
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function AgentPayoutTable({
    agent,
    period,
    items,
    showRunningBalance = false,
}: Props) {
    const credits = items.filter(i => i.amount >= 0);
    const debits = items.filter(i => i.amount < 0);
    const creditTotal = credits.reduce((s, i) => s + i.amount, 0);
    const debitTotal = debits.reduce((s, i) => s + i.amount, 0);
    const net = creditTotal + debitTotal;

    let running = 0;

    const Row = ({ item }: { item: LineItem }) => {
        running += item.amount;
        const isDebit = item.amount < 0;
        return (
            <tr>
                <td className={styles.type}>{isDebit ? "Debit" : "Credit"}</td>
                <td className={styles.desc}>
                    <div className={styles.label}>{item.label}</div>
                    {item.note ? <div className={styles.note}>{item.note}</div> : null}
                </td>
                <td className={`${styles.amt} ${isDebit ? styles.neg : styles.pos}`}>
                    {fmtUSD(item.amount)}
                </td>
                {showRunningBalance && (
                    <td className={styles.balance}>{fmtUSD(running)}</td>
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
                    <span><strong>Generated:</strong> {new Date().toLocaleString()}</span>
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

                {/* Credits */}
                {credits.length > 0 && (
                    <tbody>
                        <tr className={styles.group}>
                            <td colSpan={showRunningBalance ? 4 : 3}>Credits</td>
                        </tr>
                        {credits.map((item, i) => <Row key={`c-${i}`} item={item} />)}
                        <tr className={styles.subtotal}>
                            <td colSpan={showRunningBalance ? 2 : 2}>Subtotal credits</td>
                            <td className={styles.right} colSpan={showRunningBalance ? 2 : 1}>
                                {fmtUSD(creditTotal)}
                            </td>
                        </tr>
                    </tbody>
                )}

                {/* Debits */}
                {debits.length > 0 && (
                    <tbody>
                        <tr className={styles.group}>
                            <td colSpan={showRunningBalance ? 4 : 3}>Debits</td>
                        </tr>
                        {debits.map((item, i) => <Row key={`d-${i}`} item={item} />)}
                        <tr className={styles.subtotal}>
                            <td colSpan={showRunningBalance ? 2 : 2}>Subtotal debits</td>
                            <td className={`${styles.right} ${styles.neg}`} colSpan={showRunningBalance ? 2 : 1}>
                                {fmtUSD(debitTotal)}
                            </td>
                        </tr>
                    </tbody>
                )}

                {/* Net / Commission */}
                <tfoot>
                    <tr className={styles.net}>
                        <td colSpan={showRunningBalance ? 2 : 2}>Monthly commission check</td>
                        <td className={`${styles.right} ${net < 0 ? styles.neg : styles.pos}`} colSpan={showRunningBalance ? 2 : 1}>
                            {fmtUSD(net)}
                        </td>
                    </tr>
                </tfoot>
            </table>

            <footer className={styles.footnotes}>
                <div className={styles.legend}>
                    <span className={`${styles.bullet} ${styles.credit}`} /> Credit (money in)&nbsp;&nbsp;
                    <span className={`${styles.bullet} ${styles.debit}`} /> Debit (money out)
                </div>
                <div className={styles.small}>
                    Notes: “70% split amount” is calculated from Total bill out × 0.70. Adjustments and draws reduce the net.
                </div>
            </footer>
        </section>
    );
}
