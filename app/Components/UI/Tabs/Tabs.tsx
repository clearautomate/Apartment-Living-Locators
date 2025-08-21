"use client";

import { useState } from "react";
import styles from "./styles.module.css";

type Tab = {
    label: string;
    content: React.ReactNode;
};

interface TabsProps {
    tabs: Tab[];
    defaultIndex?: number;
}

export default function Tabs({ tabs, defaultIndex = 0 }: TabsProps) {
    const [activeIndex, setActiveIndex] = useState(defaultIndex);

    return (
        <div className={styles.tabs}>
            {/* Tab Headers */}
            <div className={styles.tabHeaders}>
                {tabs.map((tab, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveIndex(idx)}
                        className={`${styles.tabButton} ${activeIndex === idx ? styles.active : ""
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className={styles.tabContent}>
                {tabs[activeIndex].content}
            </div>
        </div>
    );
}
