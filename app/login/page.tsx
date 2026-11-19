"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { FeedbackPopups } from "@/components/AppPopup";
import { clearAppBrowserCache } from "@/lib/auth/clear-app-cache";
import { syncAuthAfterLogin } from "@/lib/auth/sync-auth-after-login";
import { readRememberedLogin, writeRememberedLogin } from "@/lib/auth/remember-login";
import { useUi } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { DarkThemeAnimatedBackdrop } from "@/components/DarkThemeAnimatedBackdrop";
import { fetchAppAccessState } from "@/lib/auth/ensure-app-access";
import { resolveResetPasswordUrl } from "@/lib/app-url";
import { getSupabaseConfigMessage, hasSupabaseConfig } from "@/lib/supabase/env";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, t } = useUi();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"error" | "success">("error");
  const [resetMode, setResetMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loginBootReady, setLoginBootReady] = useState(false);
  const supabaseReady = hasSupabaseConfig();
  const configErrorMessage = getSupabaseConfigMessage(lang);
  const accessQuery = searchParams.get("access");
  const oauthQueryError = searchParams.get("error");
  const queryNotice = accessQuery === "pending"
    ? t("login.pendingApproval")
    : accessQuery === "rejected"
      ? t("login.rejectedAccess")
      : oauthQueryError === "oauth"
        ? t("login.oauthError")
        : oauthQueryError === "access"
          ? t("login.accessSyncError")
          : "";
  const loginAlertMessage = message || queryNotice || (!supabaseReady ? configErrorMessage : "");
  const loginAlertTone: "error" | "success" = !supabaseReady || queryNotice ? "error" : messageTone;

  useEffect(() => {
    if (!supabaseReady) {
      setLoginBootReady(true);
      return;
    }

    let isCurrent = true;

    async function prepareLoginPage() {
      try {
        const supabase = createClient();
        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          try {
            const access = await fetchAppAccessState();

            if (access.allowed) {
              router.replace("/loading");
              return;
            }

            await supabase.auth.signOut();
          } catch {
            await supabase.auth.signOut();
          }
        }

        await clearAppBrowserCache({ includeLocalStorage: "heavy", preserveAuth: true });

        if (!isCurrent) {
          return;
        }

        const remembered = readRememberedLogin();
        setRememberPassword(remembered.remember);
        setEmail((current) => current || remembered.email);
        setPassword((current) => current || remembered.password);
      } finally {
        if (isCurrent) {
          setLoginBootReady(true);
        }
      }
    }

    void prepareLoginPage();

    return () => {
      isCurrent = false;
    };
  }, [configErrorMessage, router, supabaseReady]);

  const signInWithGoogle = () => {
    if (!supabaseReady) {
      setMessageTone("error");
      setMessage(configErrorMessage);
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setMessageTone("error");
    window.location.assign("/auth/google");
  };

  const signIn = async () => {
    if (!supabaseReady) {
      setMessageTone("error");
      setMessage(configErrorMessage);
      return;
    }

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
    await clearAppBrowserCache({ includeLocalStorage: "heavy" });

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

    try {
      await syncAuthAfterLogin(supabase);
    } catch (sessionError) {
      setMessageTone("error");

      if (sessionError instanceof Error && sessionError.message === "ACCOUNT_PENDING_APPROVAL") {
        setMessage(t("login.pendingApproval"));
        return;
      }

      setMessage(
        sessionError instanceof Error
          ? sessionError.message
          : (lang === "th" ? "ไม่พบ session หลังเข้าสู่ระบบ กรุณาลองใหม่" : "No session after sign-in. Please try again.")
      );
      return;
    }

    writeRememberedLogin(rememberPassword, normalizedEmail, password);
    router.replace("/loading");
  };
  const sendPasswordReset = async () => {
    if (!supabaseReady) {
      setMessageTone("error");
      setMessage(configErrorMessage);
      return;
    }

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
      redirectTo: resolveResetPasswordUrl()
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
      <DarkThemeAnimatedBackdrop scope="login" />
      <FeedbackPopups
        alertMessage={loginAlertMessage}
        alertTone={loginAlertTone}
        alertVariant={loginAlertTone === "success" && loginAlertMessage ? "status" : "default"}
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
          data-login-ready={loginBootReady ? "true" : "false"}
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
          <label className="label" htmlFor="login-email">
            {t("fields.email")}
            <span className="inputWrap">
              <UserRound size={16} />
              <input
                id="login-email"
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
              <label className="label" htmlFor="login-password">
                {t("login.password")}
                <span className="inputWrap inputWrapPassword">
                  <LockKeyhole size={16} />
                  <input
                    id="login-password"
                    className="field"
                    type={passwordVisible ? "text" : "password"}
                    autoComplete="current-password"
                    minLength={8}
                    required
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setMessage("");
                    }}
                  />
                  <button
                    className="loginPasswordToggle"
                    type="button"
                    aria-label={passwordVisible ? t("login.hidePassword") : t("login.showPassword")}
                    aria-pressed={passwordVisible}
                    onClick={() => setPasswordVisible((current) => !current)}
                  >
                    {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
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
          <button className="button primary" type="submit" disabled={isSubmitting || !supabaseReady}>
            {resetMode ? "ส่งลิงก์รหัสผ่าน" : t("login.signIn")}
          </button>
          {!resetMode && loginAlertTone === "error" && loginAlertMessage ? (
            <p className="loginError" role="alert">{loginAlertMessage}</p>
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
        {!resetMode ? (
          <>
            <p className="loginDivider" role="presentation">
              <span>{t("login.orContinueWith")}</span>
            </p>
            <button
              className="button loginGoogleButton"
              type="button"
              disabled={isSubmitting || !supabaseReady}
              onClick={() => {
                void signInWithGoogle();
              }}
            >
              <svg className="loginGoogleLogo" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.56 2.95-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              {t("login.signInWithGoogle")}
            </button>
          </>
        ) : null}
      </section>
    </main>
  );
}

export default function LoginPage() {
  const { t } = useUi();

  return (
    <Suspense
      fallback={(
        <main className="loginPage">
          <DarkThemeAnimatedBackdrop scope="login" />
          <section className="card">
            <h1>{t("login.signIn")}</h1>
            <p>{t("bootstrap.loading")}</p>
          </section>
        </main>
      )}
    >
      <LoginPageContent />
    </Suspense>
  );
}
