"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Shield, UserRound } from "lucide-react";
import { useUi } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useUi();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signIn = async () => {
    setIsSubmitting(true);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    const nextPath = new URLSearchParams(window.location.search).get("next") ?? "/dashboard";
    router.replace(nextPath);
    router.refresh();
  };

  return (
    <main className="loginPage">
      <section className="card">
        <div className="brand">
          <span><Shield size={24} /></span>
          <div>
            <strong>PM Site</strong>
            <small>Management System</small>
          </div>
        </div>
        <h1>{t("login.signIn")}</h1>
        <p>{t("app.fullName")}</p>
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault();
            signIn();
          }}
        >
          <label className="label">
            {t("fields.email")}
            <span className="inputWrap">
              <UserRound size={16} />
              <input
                className="field"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </span>
          </label>
          <label className="label">
            {t("login.password")}
            <span className="inputWrap">
              <LockKeyhole size={16} />
              <input
                className="field"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </span>
          </label>
          {message ? <p className="emptyState">{message}</p> : null}
          <button className="button primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("pm.loadingSubtitle") : t("login.signIn")}
          </button>
        </form>
      </section>
    </main>
  );
}
