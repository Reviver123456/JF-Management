"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LockKeyhole, UserRound } from "lucide-react";
import { FeedbackPopups } from "@/components/AppPopup";
import { useUi } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useUi();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"error" | "success">("error");
  const [resetMode, setResetMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signIn = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || password.length < 8) {
      setMessageTone("error");
      setMessage("Please enter a valid email and password.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setMessageTone("error");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });

    setIsSubmitting(false);

    if (error) {
      setMessageTone("error");
      setMessage(error.message);
      return;
    }

    const nextPath = new URLSearchParams(window.location.search).get("next") ?? "/dashboard";
    router.replace(nextPath);
    router.refresh();
  };
  const sendPasswordReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setMessageTone("error");
      setMessage("กรุณากรอกอีเมลก่อนส่งลิงก์รีเซ็ตรหัสผ่าน");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setMessageTone("error");

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    setIsSubmitting(false);

    if (error) {
      setMessageTone("error");
      setMessage(error.message);
      return;
    }

    setMessageTone("success");
    setMessage("ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว");
    setResetMode(false);
  };

  return (
    <main className="loginPage">
      <FeedbackPopups loading={isSubmitting} loadingMessage={t("pm.loadingSubtitle")} alertMessage={message} alertTone={messageTone} />
      <section className="card">
        <div className="brand brandLogo">
          <Image src="/report-templates/LOGO-JF.webp" alt="JF Advance Med" width={360} height={112} priority />
        </div>
        <h1>{t("login.signIn")}</h1>
        <p>{t("app.fullName")}</p>
        <form
          className="form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (resetMode) {
              sendPasswordReset();
            } else {
              signIn();
            }
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
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </span>
          </label>
          {resetMode ? null : (
            <label className="label">
              {t("login.password")}
              <span className="inputWrap">
                <LockKeyhole size={16} />
                <input
                  className="field"
                  type="password"
                  autoComplete="current-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </span>
            </label>
          )}
          <button className="button primary" type="submit" disabled={isSubmitting}>
            {resetMode ? "ส่งลิงก์รหัสผ่าน" : t("login.signIn")}
          </button>
        </form>
        <button
          className="forgotPasswordButton"
          type="button"
          onClick={() => {
            setMessage("");
            setResetMode((current) => !current);
          }}
        >
          {resetMode ? "กลับไปเข้าสู่ระบบ" : "ลืมรหัสผ่าน?"}
        </button>
      </section>
    </main>
  );
}
