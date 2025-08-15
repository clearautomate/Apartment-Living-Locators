// components/Navbar.tsx
import Image from "next/image";

import styles from './styles.module.css'
import Link from "../UI/Link/Link";
import { Button } from "../UI/Button/Button";
import LogoutButton from "./LogoutButton";

interface Props {
    permissions: string;
}

export default function Navbar({ permissions }: Props) {
    return (
        <nav className={styles.nav}>
            <div className={`${styles.content} page-width`}>
                <div className={styles.left}>
                    {/* Logo */}
                    <Link href="/">
                        <Image src='/alllogo.png' alt="logo" width={291 / 4} height={164 / 4} />
                    </Link>
                    {/* Links */}
                    {
                        permissions === 'owner' &&
                        <div className={styles.links}>
                            <Link href="/owner/overview" color="primary">
                                Overview
                            </Link>
                            <Link href="/agent" color="primary">
                                Agents
                            </Link>
                            <Link href="/owner/manage-users" color="primary">
                                Manage Users
                            </Link>
                        </div>
                    }
                </div>
                <LogoutButton />
            </div>
        </nav>
    );
}
