import { withUser } from "@/lib/withUser";
import Navbar from "../Components/Navbar/Navbar";
import styles from "./styles.module.css";
import Link from "../Components/UI/Link/Link";
import { HiOutlineChartBar, HiOutlineChevronRight, HiOutlineDocumentText } from "react-icons/hi2";
import { ReactNode } from "react";
import { HiOutlineCollection, HiOutlineViewGrid } from "react-icons/hi";
import { redirect } from "next/navigation";

interface CardProps {
    title: string;
    description: string;
    icon: ReactNode;
    hue: number
    link: {
        label: string;
        href: string;
    };
}

function Card({ title, description, icon, hue, link }: CardProps) {
    return (
        <div className={styles.card}>
            <div className={styles.icon} style={{ backgroundColor: `hsl(${hue}, 100%, 90%)`, color: `hsl(${hue}, 100%, 20%)` }}>{icon}</div>
            <h3>{title}</h3>
            <p>{description}</p>
            <Link className={styles.link} href={link.href} icon={<HiOutlineChevronRight size={20} />} iconPosition="right">
                {link.label}
            </Link>
        </div >
    );
}

export default async function GettingStartedPage() {
    const user = await withUser();

    if (!user) {
        redirect('/unauthorized')
    }

    const cards: CardProps[] = [
        {
            title: "Overview",
            description: "Metrics and stats for you to get.",
            icon: <HiOutlineViewGrid size={32} />,
            hue: 210,
            link: {
                label: "Go to Overview",
                href: "/owner/overview",
            },
        },
        {
            title: "Leases",
            description: "View all of your current and previous leases. This is where you will create and edit leases.",
            icon: <HiOutlineDocumentText size={32} />,
            hue: 160,
            link: {
                label: "View Agents",
                href: "/agent",
            },
        },
        {
            title: "Collections",
            description: "This is where you will be able to see collections. You will be able to quickly view ones that may be getting chargedback.",
            icon: <HiOutlineCollection size={32} />,
            hue: 280,
            link: {
                label: "Manage Users",
                href: "/owner/manage-users",
            },
        },
        {
            title: "Report",
            description:
                "View your monthly report which you will quickly be able to see all of your finances.",
            icon: <HiOutlineChartBar size={32} />,
            hue: 30,
            link: {
                label: "Open Reports",
                href: "/owner/reports",
            },
        },
    ];

    const tips = [
        "When creating a lease you have two options for the commission type: Percent and Flat. When you choose Flat, directly enter your commission amount. When you choose Percent, it will automatically calculate it for you.",
        "The portal will archive all old data, meaning you can go back and check previous months.",
        "You can download any month's report to a CSV file and view it in spreadsheets."
    ];

    return (
        <div className={styles.wrapper}>
            <Navbar permissions={user.permissions} id={user.id} />
            <div className={`${styles.videoGrid} page-width section`}>
                <div className={styles.title}>
                    <h1>Welcome to the Apartment Living Locators Portal!</h1>
                    <p>Manage your agent data, leases, reports, and more—all in one place.</p>
                </div>
                <video
                    className={styles.video}
                    controls
                    preload="metadata"
                    poster={'poster'}
                    style={{ aspectRatio: "16/9" }}
                >
                    <source src={'src'} type={'type'} />
                    Your browser does not support the video tag.
                </video>
            </div>

            <div className="page-width">
                <div className="section">
                    <h2>Get Started</h2>
                    <p>Learn how to manage your data through these pages.</p>
                    <div className={styles.cards}>
                        {cards.map((c) => (
                            <Card key={c.link.href} {...c} />
                        ))}
                    </div>
                </div>

                <div className="section">
                    <h2>A Few Tips</h2>
                    <div className={styles.tips}>
                        {tips.map((tip, i) => (
                            <div className={styles.tip} key={i}>
                                < HiOutlineChevronRight size={24} />
                                <p>{tip}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="section">
                    <h2>Need help?</h2>
                    <p>
                        Reach out to Joel at{" "}
                        <a href="mailto:joel@clearautomate.io">joel@clearautomate.io</a>.
                    </p>
                </div>
            </div>
        </div >
    );
}
