"use client"

import { Button } from "../UI/Button/Button";

export default function LogoutButton() {
    return (
        <Button
            color="bg"
            onClick={async () => {
                try {
                    const res = await fetch("/api/user/logout", { method: "POST" });
                    if (res.ok) {
                        // Optional: redirect or reload after logout
                        window.location.href = "/login";
                    } else {
                        console.error("Logout failed");
                    }
                } catch (err) {
                    console.error("Error logging out:", err);
                }
            }}
        >
            Logout
        </Button>
    )
}