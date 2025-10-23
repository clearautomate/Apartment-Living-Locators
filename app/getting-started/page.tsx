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
    hue: number;
    link: {
        label: string;
        href: string;
    };
}

function Card({ title, description, icon, hue, link }: CardProps) {
    return (
        <div className={styles.card}>
            <div
                className={styles.icon}
                style={{
                    backgroundColor: `hsl(${hue}, 100%, 90%)`,
                    color: `hsl(${hue}, 100%, 20%)`
                }}
            >
                {icon}
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
            <Link
                underline={true}
                className={styles.link}
                href={link.href}
                icon={<HiOutlineChevronRight size={16} />}
                iconPosition="right"
            >
                {link.label}
            </Link>
        </div>
    );
}

export default async function GettingStartedPage() {
    const user = await withUser();

    if (!user) {
        redirect("/unauthorized");
    }

    const cards: CardProps[] = [
        {
            title: "Overview",
            description: "Track key metrics and insights at a glance.",
            icon: <HiOutlineViewGrid size={32} />,
            hue: 210,
            link: {
                label: "Go to Overview",
                href: "/owner/overview"
            }
        },
        {
            title: "Leases",
            description: "Create, edit, and review current or past leases—all in one place.",
            icon: <HiOutlineDocumentText size={32} />,
            hue: 160,
            link: {
                label: "View Leases",
                href: "/agent"
            }
        },
        {
            title: "Collections",
            description: "Monitor collections and quickly spot items at risk of being charged back.",
            icon: <HiOutlineCollection size={32} />,
            hue: 280,
            link: {
                label: "View Collections",
                href: "/owner/collections"
            }
        },
        {
            title: "Reports",
            description: "See your monthly numbers, drill into details, and export to CSV any time.",
            icon: <HiOutlineChartBar size={32} />,
            hue: 30,
            link: {
                label: "Open Reports",
                href: "/owner/reports"
            }
        }
    ];

    const tips = [
        "When creating a lease, choose a commission type: Flat (enter manually) or Percent (we’ll calculate automatically).",
        "All your data is archived, so you can revisit any previous month at any time.",
        "You can download any month’s report as a CSV file and view it in your preferred spreadsheet tool."
    ];

    return (
        <div className={styles.wrapper}>
            <Navbar permissions={user.permissions} id={user.id} />

            <div className={`${styles.videoGrid} page-width section`}>
                <div className="header">
                    <h1>Welcome to the Apartment Living Locators Portal!</h1>
                    <p>
                        Manage your agent data, leases, collections, reports, and more—
                        all in one place.
                    </p>
                </div>
                <video
                    className={styles.video}
                    controls
                    preload="metadata"
                    poster="https://czjpdfzvuyiiqsbf.public.blob.vercel-storage.com/thumbnail.jpg"
                    style={{ aspectRatio: "16/9" }}
                >
                    <source
                        src="https://czjpdfzvuyiiqsbf.public.blob.vercel-storage.com/explainer.mp4"
                        type="video/mp4"
                    />
                    Your browser does not support the video tag.
                </video>
            </div>

            <div className="page-width">
                <div className="section">
                    <div className="header">
                        <h2>Get Started</h2>
                        <p>Explore these pages to learn how to manage your data effectively.</p>
                    </div>
                    <div className={styles.cards}>
                        {cards.map((c) => (
                            <Card key={c.link.href} {...c} />
                        ))}
                    </div>
                </div>

                <div className="section">
                    <div className="header">
                        <h2>A Few Tips</h2>
                    </div>
                    <div className={styles.tips}>
                        {tips.map((tip, i) => (
                            <div className={styles.tip} key={i}>
                                <HiOutlineChevronRight size={16} />
                                <p>{tip}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="section">
                    <div className="header">
                        <h2>Need Help?</h2>
                    </div>
                    <p>
                        Reach out to Joel at{" "}
                        <a href="mailto:joel@clearautomate.io">joel@clearautomate.io</a>.
                    </p>
                </div>
            </div>
        </div>
    );
}
