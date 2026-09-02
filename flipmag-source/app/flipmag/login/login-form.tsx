"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FlipmagLoginForm({ returnTo }: { returnTo: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/flipmag/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setError("Incorrect password. Try again.");
      setLoading(false);
      return;
    }
    window.location.assign(returnTo);
  };

  return (
    <form className="flipmag-login-card" onSubmit={submit}>
      <img src="/assets/mastercard-symbol.png" alt="Mastercard" />
      <span className="flipmag-login-icon"><LockKeyhole /></span>
      <div>
        <p>Page Flip Builder</p>
        <h1>Admin access</h1>
        <span>Enter the workspace password to continue.</span>
      </div>
      <label htmlFor="flipmag-password">Password</label>
      <input id="flipmag-password" type="password" inputMode="numeric" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus required />
      {error && <p className="flipmag-login-error" role="alert">{error}</p>}
      <Button type="submit" size="lg" disabled={loading || !password}>{loading ? "Opening…" : "Open Builder"}</Button>
    </form>
  );
}

