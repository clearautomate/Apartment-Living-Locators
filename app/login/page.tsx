// app/login/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Form, FormActions, FormError, Field } from "../Components/UI/Form/Form";
import { Button } from "../Components/UI/Button/Button";
import { Input } from "../Components/UI/Input/Input";

import styles from './styles.module.css'

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            await axios.post("/api/user/login", { username, password });
            router.replace("/overview");
        } catch (err: any) {
            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else {
                setError("Login failed");
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main>
            <div className={styles.grid}>
                <div className={styles.left}></div>
                <div className={styles.login}>
                    <h2>Hello Again!</h2>
                    <Form onSubmit={handleSubmit} className={styles.form}>
                        <Field
                            label="Username"
                            htmlFor="username"
                            requiredMark
                        >
                            <Input
                                id="username"
                                name="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoFocus
                                autoComplete="username"
                            />
                        </Field>

                        <Field
                            label="Password"
                            htmlFor="password"
                            requiredMark
                        >
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                        </Field>

                        <FormError message={error} />

                        <FormActions align="right">
                            <Button type="submit" disabled={submitting} fullWidth>
                                {submitting ? "Logging in..." : "Log In"}
                            </Button>
                        </FormActions>
                    </Form>
                </div>
            </div>
        </main>
    );
}
