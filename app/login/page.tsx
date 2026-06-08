"use client";

import { useRouter } from "next/navigation";
import { LockKeyhole, Shield, UserRound } from "lucide-react";
import { useUi } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useUi();

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
            router.push("/dashboard");
          }}
        >
          <label className="label">
            {t("login.username")}
            <span className="inputWrap">
              <UserRound size={16} />
              <input className="field" defaultValue="admin" />
            </span>
          </label>
          <label className="label">
            {t("login.password")}
            <span className="inputWrap">
              <LockKeyhole size={16} />
              <input className="field" type="password" defaultValue="password" />
            </span>
          </label>
          <button className="button primary" type="submit">{t("login.signIn")}</button>
        </form>
      </section>
    </main>
  );
}
