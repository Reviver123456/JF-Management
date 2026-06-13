"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Eye, EyeOff, Languages, LockKeyhole, Moon, PenLine, RotateCcw, Save, Sun, UserRound, ArrowLeft } from "lucide-react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { FeedbackPopups } from "@/components/AppPopup";
import { PwaInstallGuidePage } from "@/components/PwaInstallGuideModal";
import { PwaInstallSection } from "@/components/PwaInstallSection";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { getUserSignatureStorageKey } from "@/lib/auth/user-signature";
import { useUi } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

function splitFullName(fullName: string) {
  const trimmed = fullName.trim();

  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  const spaceIndex = trimmed.indexOf(" ");

  if (spaceIndex === -1) {
    return { firstName: trimmed, lastName: "" };
  }

  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1).trim()
  };
}

function joinFullName(firstName: string, lastName: string) {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

export default function SettingsPage() {
  const { lang, theme, setLang, setTheme, t } = useUi();
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signatureEditorOpen, setSignatureEditorOpen] = useState(false);
  const [pwaGuide, setPwaGuide] = useState<{ open: boolean; mode: "ios" | "desktop" }>({ open: false, mode: "ios" });

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile() {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      const metadata = user?.user_metadata ?? {};

      setEmail(user?.email ?? "");
      const fullName = typeof metadata.full_name === "string" ? metadata.full_name : user?.email ?? "";
      const nameParts = splitFullName(fullName);
      setFirstName(nameParts.firstName);
      setLastName(nameParts.lastName);
      setPhone(typeof metadata.phone === "string" ? metadata.phone : "");
    }

    loadProfile();
  }, []);

  const saveProfile = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: joinFullName(firstName, lastName),
        phone
      }
    });

    if (error) {
      setSaved(false);
      setMessage(error.message);
      return;
    }

    setMessage("");
    setSaved(true);
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword) {
      setMessage("Please fill in current and new password.");
      return;
    }

    if (newPassword.length < 8) {
      setMessage("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("New password and confirmation do not match.");
      return;
    }

    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        currentPassword,
        email,
        newPassword
      })
    });
    const payload = await response.json() as { message?: string; ok?: boolean };

    if (!response.ok || !payload.ok) {
      setMessage(payload.message ?? "Cannot change password.");
      return;
    }

    const supabase = createClient();
    await supabase.auth.signInWithPassword({
      email,
      password: newPassword
    });

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage("");
    setSaved(true);
  };

  return (
    <AppShell>
      <div className="settingsPage">
      <FeedbackPopups
        alertMessage={message || (saved ? t("settings.saved") : "")}
        alertTitle={saved ? t("feedback.saveSuccess") : message ? t("feedback.saveFailed") : undefined}
        alertTone={message ? "error" : "success"}
        alertVariant="status"
      />

      {signatureEditorOpen ? (
        <SignatureEditorPage email={email} onClose={() => setSignatureEditorOpen(false)} />
      ) : pwaGuide.open ? (
        <PwaInstallGuidePage mode={pwaGuide.mode} onClose={() => setPwaGuide((current) => ({ ...current, open: false }))} />
      ) : (
        <>
      <PageTitle
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
        actions={
          <button className="button primary" type="button" onClick={saveProfile}>
            <Save size={16} />
            {t("common.save")}
          </button>
        }
      />
      <section className="grid">
        <div className="settingsColumn">
          <article className="card">
            <h2><UserRound size={17} /> {t("settings.profile")}</h2>
            <div className="formGrid">
              <label className="label">{t("fields.firstName")}<input className="field" value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
              <label className="label">{t("fields.lastName")}<input className="field" value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
              <label className="label">{t("fields.phone")}<input className="field" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
              <label className="label">{t("fields.email")}<input className="field" value={email} readOnly /></label>
              <label className="label">{t("fields.contactOther")}<input className="field" defaultValue="Line: pm-admin" /></label>
            </div>
          </article>

          <article className="card">
            <h2><PenLine size={17} /> {t("settings.mySignature")}</h2>
            <SettingsSignaturePad onOpen={() => setSignatureEditorOpen(true)} />
          </article>

          <article className="card">
            <h2>{theme === "dark" ? <Moon size={17} /> : <Sun size={17} />} {t("settings.theme")}</h2>
            <div className="options">
              <button className={theme === "dark" ? "activeOption" : "option"} type="button" onClick={() => setTheme("dark")}>{t("settings.darkTheme")}</button>
              <button className={theme === "light" ? "activeOption" : "option"} type="button" onClick={() => setTheme("light")}>{t("settings.lightTheme")}</button>
            </div>
          </article>
        </div>

        <div className="settingsColumn">
          <article className="card">
            <h2><LockKeyhole size={17} /> {t("settings.password")}</h2>
            <div className="formGridSingle">
              <PasswordField label={t("settings.oldPassword")} value={currentPassword} onChange={setCurrentPassword} />
              <PasswordField label={t("settings.newPassword")} value={newPassword} onChange={setNewPassword} />
              <PasswordField label={t("settings.confirmPassword")} value={confirmPassword} onChange={setConfirmPassword} />
              <button className="button subtle" type="button" onClick={changePassword}>
                <LockKeyhole size={16} />
                {t("settings.password")}
              </button>
            </div>
          </article>

          <article className="card">
            <h2><Languages size={17} /> {t("settings.language")}</h2>
            <div className="options">
              <button className={lang === "th" ? "activeOption" : "option"} type="button" onClick={() => setLang("th")}>{t("settings.thai")}</button>
              <button className={lang === "en" ? "activeOption" : "option"} type="button" onClick={() => setLang("en")}>{t("settings.english")}</button>
            </div>
          </article>

          <PwaInstallSection onShowGuide={(mode) => setPwaGuide({ open: true, mode })} />
        </div>
      </section>
        </>
      )}
      </div>
    </AppShell>
  );
}

function PasswordField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useUi();
  const [visible, setVisible] = useState(false);

  return (
    <label className="label">
      {label}
      <span className="passwordField">
        <input className="field" minLength={8} type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} />
        <button className="iconButton" type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? t("settings.hidePassword") : t("settings.showPassword")}>
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </span>
    </label>
  );
}

function SettingsSignaturePad({ onOpen }: { onOpen: () => void }) {
  const { signature } = useCurrentUser();
  const hasSignature = Boolean(signature.trim());

  return (
    <div className="settingsSignaturePad">
      <button className="button subtle" type="button" onClick={onOpen}>
        <PenLine size={16} />
        {hasSignature ? "แก้ไขลายเซ็นของฉัน" : "เซ็นลายเซ็นของฉัน"}
      </button>
      {hasSignature ? <span className="signatureSavedText">บันทึกลายเซ็นแล้ว</span> : null}
    </div>
  );
}

function SignatureEditorPage({ email, onClose }: { email: string; onClose: () => void }) {
  const { t } = useUi();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [, setSignatureRevision] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const setupCanvas = async () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.strokeStyle = "#0f172a";
      context.lineWidth = 2.4;
      context.lineCap = "round";
      context.lineJoin = "round";

      const savedSignature = window.localStorage.getItem(getUserSignatureStorageKey(email));
      let signature = savedSignature ?? "";

      try {
        const response = await fetch("/api/auth/signature", { cache: "no-store" });
        const payload = await response.json() as { signature?: string };
        if (response.ok && payload.signature) {
          signature = payload.signature;
        }
      } catch {
        // Keep local fallback when the profile API is unavailable.
      }

      if (signature) {
        const image = new window.Image();
        image.onload = () => {
          context.drawImage(image, 0, 0, width, height);
        };
        image.src = signature;
      }
    };

    void setupCanvas();
    const handleResize = () => {
      void setupCanvas();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [email]);

  const saveSignature = async () => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const signature = canvas.toDataURL("image/png");
    const response = await fetch("/api/auth/signature", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ signature })
    });

    if (!response.ok) {
      return;
    }

    window.localStorage.setItem(getUserSignatureStorageKey(email), signature);
    setSignatureRevision((current) => current + 1);
  };

  const getPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };
  const startDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const context = event.currentTarget.getContext("2d");
    if (!context) {
      return;
    }

    const point = getPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
    setIsDrawing(true);
  };
  const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      return;
    }

    const context = event.currentTarget.getContext("2d");
    if (!context) {
      return;
    }

    const point = getPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };
  const stopDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDrawing(false);
    void saveSignature();
  };
  const clearSignature = async () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    await fetch("/api/auth/signature", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ signature: "" })
    });
    window.localStorage.removeItem(getUserSignatureStorageKey(email));
    setSignatureRevision((current) => current + 1);
  };

  return (
    <div className="signatureEditorPage">
      <header className="signatureEditorHeader">
        <button aria-label={t("common.back")} className="signatureEditorBackButton" type="button" onClick={onClose}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1>{t("settings.mySignature")}</h1>
        </div>
      </header>

      <div className="signatureEditorBody">
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
        />
      </div>

      <footer className="signatureEditorFooter">
        <div className="signatureEditorFooterActions">
          <button className="button ghost" type="button" onClick={clearSignature}>
            <RotateCcw size={15} />
            {t("pm.clearSignature")}
          </button>
        </div>
        <button
          className="button primary"
          type="button"
          onClick={() => {
            void saveSignature();
            onClose();
          }}
        >
          <Save size={15} />
          {t("common.save")}
        </button>
      </footer>
    </div>
  );
}
