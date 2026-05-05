"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage(){
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const wrapper = "flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-200 via-orange-300 to-orange-400";
    const cardContainer = "flex flex-col gap-4 w-full max-w-sm bg-white p-8 rounded shadow text-center";

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>){
        event.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch("/api/forgot-password", {
                method: "POST",
                headers: {"Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (res.ok) {
                setSubmitted(true);
            } else {
                const data = await res.json();
                setError(data.error || "We couldn't find an account with that email.");
            }
        } catch (err) {
            setError("Couldn't connect to the server.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className={wrapper}>
            <div className={cardContainer}>
                <h1 className="text-2x1 font-semibold mb-2">
                    Reset Password
                </h1>

                {error && (
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100 text-left">
                        {error}
                    </p>
                )}

                {!submitted ? (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
                        <p className="text-sm text-gray-600">
                            Enter your email and click the link we send to you.
                        </p>

                        <input
                            className="border rounded p-3 w-full outline-none focus:border-orange-400"
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <button
                            className="orange_button w-full disabled:opacity-60"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? "Sending link" : "Send reset link"}
                        </button>
                    </form>
                ) : (
                    <p className="text-sm text-gray-700 py-4">
                        Check your email
                    </p>    
                )}

                <div className="mt-2">
                    <Link href="/login" className="text-sm text-blue-600 hover:underline">
                        Back to login
                    </Link>
                </div>
            </div>
        </main>
    );
}