import styles from "./styles.module.css";

type StatGridProps = {
    desktopGridColumns?: number;
    mobileGridColumns?: number;
    children: React.ReactNode;
};

export function StatGrid({
    desktopGridColumns = 4,
    mobileGridColumns = 1,
    children,
}: StatGridProps) {
    return (
        <div
            className={styles.grid}
            style={{
                display: "grid",
                gridTemplateColumns: `repeat(${desktopGridColumns}, 1fr)`,
                gap: "1rem"
            }}
        >
            {children}
        </div>
    );
}

type StatCardProps = {
    icon?: React.ReactNode;
    label: string;
    stat: string | number;
    hue?: number;
};

export default function StatCard({
    icon,
    label,
    stat,
    hue,
}: StatCardProps) {
    return (
        <div className='card'>
            <div
                className={styles.icon}
                style={{
                    backgroundColor: `hsl(${hue}, 100%, 90%)`,
                    color: `hsl(${hue}, 100%, 20%)`
                }}
            >
                {icon}
            </div>
            <div className={styles.stat}><h2>{stat}</h2></div>
            <div className={styles.label}><p>{label}</p></div>
        </div >
    );
}
