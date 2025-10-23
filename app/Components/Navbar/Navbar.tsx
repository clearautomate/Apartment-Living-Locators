// components/Navbar.tsx
"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

import styles from "./styles.module.css";
import Link from "../UI/Link/Link";
import LogoutButton from "./LogoutButton";

interface Props {
    permissions: string;
    id: string;
}

export default function Navbar({ permissions, id }: Props) {
    const pathname = usePathname();

    const isActive = (href: string) =>
        pathname === href || pathname.startsWith(href + "/");

    return (
        <nav className={styles.nav}>
            <div className={`${styles.content} page-width`}>
                <div className={styles.left}>
                    {/* Logo (never active) */}
                    <Link
                        color="var(--bg-dark)" href="/getting-started">
                        <Image
                            src="/alllogo.png"
                            alt="logo"
                            width={291 / 4}
                            height={164 / 4}
                        />
                    </Link>

                    {/* Links */}
                    <div className={styles.links}>
                        {/* Always visible */}
                        <Link
                            color="var(--bg-dark)"
                            href="/getting-started"
                            className={isActive("/getting-started") ? styles.active : ""}
                        >
                            Getting Started
                        </Link>

                        {permissions === "agent" && (
                            <>
                                <Link
                                    color="var(--bg-dark)"
                                    href={`/agent/${id}/overview`}
                                    className={isActive("/agent") ? styles.active : ""}
                                >
                                    Dashboard
                                </Link>
                            </>
                        )}

                        {/* Owner-only links */}
                        {permissions === "owner" && (
                            <>
                                <Link
                                    color="var(--bg-dark)"
                                    href="/owner/overview"
                                    className={isActive("/owner/overview") ? styles.active : ""}
                                >
                                    Overview
                                </Link>
                                <Link
                                    color="var(--bg-dark)"
                                    href="/agent"
                                    className={isActive("/agent") ? styles.active : ""}
                                >
                                    Agents
                                </Link>
                                <Link
                                    color="var(--bg-dark)"
                                    href="/owner/manage-users"
                                    className={isActive("/owner/manage-users") ? styles.active : ""}
                                >
                                    Manage Users
                                </Link>

                            </>
                        )}
                    </div>
                </div>
                <LogoutButton />
            </div>
        </nav>
    );
}
