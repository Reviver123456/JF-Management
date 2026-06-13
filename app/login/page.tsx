"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LockKeyhole, UserRound } from "lucide-react";
import { FeedbackPopups } from "@/components/AppPopup";
import { clearAppBrowserCache } from "@/lib/auth/clear-app-cache";
import { readRememberedLogin, writeRememberedLogin } from "@/lib/auth/remember-login";
import { useUi } from "@/lib/i18n";
import { usePageEnterProps } from "@/components/PageEnterTransition";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const { lang, t } = useUi();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"error" | "success">("error");
  const [resetMode, setResetMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  const pageEnterProps = usePageEnterProps("loginPage", "login");

  useEffect(() => {
    let isCurrent = true;

    async function prepareLoginPage() {
      const supabase = createClient();
      await supabase.auth.signOut();
      await clearAppBrowserCache();

      if (!isCurrent) {
        return;
      }

      const remembered = readRememberedLogin();
      setRememberPassword(remembered.remember);
      setEmail(remembered.email);
      setPassword(remembered.password);
    }

    void prepareLoginPage();

    return () => {
      isCurrent = false;
    };
  }, []);

  const signIn = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || password.length < 8) {
      setMessageTone("error");
      setMessage(lang === "th"
        ? "กรุณากรอกอีเมลและรหัสผ่านให้ถูกต้อง"
        : "Please enter a valid email and password.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setMessageTone("error");

    const supabase = createClient();
    await supabase.auth.signOut();
    await clearAppBrowserCache();

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });

    setIsSubmitting(false);

    if (error) {
      setMessageTone("error");
      if (error.code === "invalid_credentials") {
        setMessage(lang === "th"
          ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบแล้วลองอีกครั้ง"
          : "Incorrect email or password. Please check and try again.");
      } else if (error.code === "email_not_confirmed") {
        setMessage(lang === "th"
          ? "อีเมลนี้ยังไม่ได้ยืนยัน กรุณาตรวจสอบอีเมลของคุณ"
          : "This email has not been confirmed. Please check your inbox.");
      } else {
        setMessage(lang === "th"
          ? `ไม่สามารถเข้าสู่ระบบได้: ${error.message}`
          : `Unable to sign in: ${error.message}`);
      }
      return;
    }

    await fetch("/api/auth/cleanup-metadata", { method: "POST" });
    await supabase.auth.refreshSession();
    writeRememberedLogin(rememberPassword, normalizedEmail, password);

    router.replace("/loading");
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
    <main {...pageEnterProps}>
      <FeedbackPopups
        alertMessage={message}
        alertTone={messageTone}
        alertVariant={messageTone === "success" && message ? "status" : "default"}
        loading={isSubmitting}
        loadingMessage={t("pm.loadingSubtitle")}
      />
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
                onChange={(event) => {
                  setEmail(event.target.value);
                  setMessage("");
                }}
              />
            </span>
          </label>
          {resetMode ? null : (
            <>
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
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setMessage("");
                    }}
                  />
                </span>
              </label>
              <label className="loginRememberToggle">
                <input
                  checked={rememberPassword}
                  type="checkbox"
                  onChange={(event) => setRememberPassword(event.target.checked)}
                />
                <span>{t("login.remember")}</span>
              </label>
            </>
          )}
          <button className="button primary" type="submit" disabled={isSubmitting}>
            {resetMode ? "ส่งลิงก์รหัสผ่าน" : t("login.signIn")}
          </button>
          {!resetMode && messageTone === "error" && message ? (
            <p className="loginError" role="alert">{message}</p>
          ) : null}
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
