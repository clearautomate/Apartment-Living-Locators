// app/login/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Form, FormActions, FormError, Field } from "../Components/UI/Form/Form";
import { Button } from "../Components/UI/Button/Button";
import { Input } from "../Components/UI/Input/Input";

import styles from './styles.module.css'
import Image from "next/image";

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
            router.replace("/getting-started");
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
                <div className={styles.left}>
                    <img className={styles.background} src='/abstract.png' />
                    <div className={styles.portalText}>
                        {/* <Image className={styles.logo} src='/alllogo.png' alt="logo" width={291 / 3} height={164 / 3} /> */}
                        <h1 className={styles.portalTitle}>Apartment Living Locators Portal</h1>
                    </div>
                </div>
                <div className={styles.login}>
                    <h2>Log In</h2>
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
                            <Button size="lg" type="submit" disabled={submitting} fullWidth loading={submitting}>
                                Log In
                            </Button>
                        </FormActions>
                    </Form>
                </div>
            </div>
        </main>
    );
}
