"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { LockKeyhole, UserRound } from "lucide-react";
import { FeedbackPopups } from "@/components/AppPopup";
import { clearAppBrowserCache } from "@/lib/auth/clear-app-cache";
import { signOutSession } from "@/lib/auth/client-session";
import { readRememberedLogin, writeRememberedLogin } from "@/lib/auth/remember-login";
import { useUi } from "@/lib/i18n";
import { usePageEnterProps } from "@/components/PageEnterTransition";

function googleErrorMessage(code: string, lang: "th" | "en") {
  const messages: Record<string, { en: string; th: string }> = {
    google_cancelled: {
      en: "Google sign-in was cancelled.",
      th: "ยกเลิกการเข้าสู่ระบบด้วย Google"
    },
    google_config: {
      en: "Google sign-in is not configured.",
      th: "ยังไม่ได้ตั้งค่า Google OAuth"
    },
    google_email: {
      en: "Google account email is not verified.",
      th: "อีเมล Google ยังไม่ยืนยัน"
    },
    google_failed: {
      en: "Cannot sign in with Google.",
      th: "เข้าสู่ระบบด้วย Google ไม่สำเร็จ"
    },
    google_state: {
      en: "Google sign-in expired. Try again.",
      th: "การยืนยัน Google หมดเวลา ลองใหม่"
    },
    not_registered: {
      en: "This Google account is not registered in the system.",
      th: "อีเมล Google นี้ยังไม่มีในระบบ"
    }
  };

  const entry = messages[code];
  return entry ? entry[lang] : (lang === "th" ? "เข้าสู่ระบบไม่สำเร็จ" : "Sign-in failed.");
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, t } = useUi();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"error" | "success">("error");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [googleLoginEnabled, setGoogleLoginEnabled] = useState(false);
  const pageEnterProps = usePageEnterProps("loginPage", "login");

  useEffect(() => {
    let isCurrent = true;

    async function prepareLoginPage() {
      await signOutSession();
      await clearAppBrowserCache();

      if (!isCurrent) {
        return;
      }

      const remembered = readRememberedLogin();
      setRememberPassword(remembered.remember);
      setEmail(remembered.email);
      setPassword(remembered.password);

      const errorCode = searchParams.get("error");

      if (errorCode) {
        setMessageTone("error");
        setMessage(googleErrorMessage(errorCode, lang));
      }

      try {
        const statusResponse = await fetch("/api/auth/google/status", { cache: "no-store" });
        const status = await statusResponse.json() as { enabled?: boolean };

        if (isCurrent) {
          setGoogleLoginEnabled(Boolean(status.enabled));
        }
      } catch {
        if (isCurrent) {
          setGoogleLoginEnabled(false);
        }
      }
    }

    void prepareLoginPage();

    return () => {
      isCurrent = false;
    };
  }, [lang, searchParams]);

  const signInWithPassword = async () => {
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

    await signOutSession();
    await clearAppBrowserCache();

    const response = await fetch("/api/auth/login", {
      body: JSON.stringify({
        email: normalizedEmail,
        password
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const payload = await response.json() as { code?: string; message?: string; ok?: boolean };

    setIsSubmitting(false);

    if (!response.ok || !payload.ok) {
      setMessageTone("error");
      if (payload.code === "invalid_credentials") {
        setMessage(lang === "th"
          ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
          : "Incorrect email or password.");
      } else {
        setMessage(payload.message ?? (lang === "th" ? "เข้าสู่ระบบไม่สำเร็จ" : "Cannot sign in."));
      }
      return;
    }

    writeRememberedLogin(rememberPassword, normalizedEmail, password);
    router.replace("/loading");
    router.refresh();
  };

  const signInWithGoogle = () => {
    setMessage("");
    window.location.href = "/api/auth/google";
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
        <p>
          {lang === "th"
            ? "เข้าสู่ระบบด้วยอีเมล/รหัสผ่าน หรือบัญชี Google ที่ลงทะเบียนในระบบ"
            : "Sign in with email/password or a registered Google account."}
        </p>
        <form
          className="form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            signInWithPassword();
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
          <button className="button primary" type="submit" disabled={isSubmitting}>
            {t("login.signIn")}
          </button>
          {messageTone === "error" && message ? (
            <p className="loginError" role="alert">{message}</p>
          ) : null}
        </form>

        {googleLoginEnabled ? (
          <>
            <p className="loginDivider">{lang === "th" ? "หรือ" : "or"}</p>
            <button
              className="button googleSignInButton"
              type="button"
              disabled={isSubmitting}
              onClick={signInWithGoogle}
            >
              {lang === "th" ? "เข้าสู่ระบบด้วย Google" : "Sign in with Google"}
            </button>
          </>
        ) : null}
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
