"use client"; // if you're in the app directory

import { Button } from "@/app/Components/UI/Button/Button";
import { useRouter } from "next/navigation"; // (for App Router)
import { HiOutlineChevronLeft } from "react-icons/hi2";
// import { useRouter } from "next/router";   // (for Pages Router)

export default function BackLink() {
    const router = useRouter();

    return (
        <Button
            onClick={() => router.back()}
            icon={<HiOutlineChevronLeft />}
        >
            Back
        </Button>
    );
}
