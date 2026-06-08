"use client";

import { useEffect, useState } from "react";
import { Languages, LockKeyhole, Moon, Save, Sun, UserRound } from "lucide-react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { FeedbackPopups } from "@/components/AppPopup";
import { defaultLoginUser } from "@/lib/auth/default-user";
import { useUi } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const { lang, theme, setLang, setTheme, t } = useUi();
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [profileName, setProfileName] = useState<string>(defaultLoginUser.name);
  const [phone, setPhone] = useState<string>(defaultLoginUser.phone);
  const [email, setEmail] = useState<string>(defaultLoginUser.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile() {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      const metadata = user?.user_metadata ?? {};

      setEmail(user?.email ?? defaultLoginUser.email);
      setProfileName(typeof metadata.full_name === "string" ? metadata.full_name : defaultLoginUser.name);
      setPhone(typeof metadata.phone === "string" ? metadata.phone : defaultLoginUser.phone);
    }

    loadProfile();
  }, []);

  const saveProfile = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: profileName,
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

    if (newPassword !== confirmPassword) {
      setMessage("New password and confirmation do not match.");
      return;
    }

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword
    });

    if (verifyError) {
      setMessage(verifyError.message);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      data: {
        must_change_password: false
      }
    });

    if (error) {
      setMessage(error.message);
      return;
    }

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
        alertTone={message ? "error" : "success"}
      />
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
        <article className="card">
          <h2><UserRound size={17} /> {t("settings.profile")}</h2>
          <div className="formGrid">
            <label className="label">{t("fields.username")}<input className="field" value={profileName} onChange={(event) => setProfileName(event.target.value)} /></label>
            <label className="label">{t("fields.phone")}<input className="field" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
            <label className="label">{t("fields.email")}<input className="field" value={email} readOnly /></label>
            <label className="label">{t("fields.contactOther")}<input className="field" defaultValue="Line: pm-admin" /></label>
          </div>
        </article>

        <article className="card">
          <h2><LockKeyhole size={17} /> {t("settings.password")}</h2>
          <div className="formGridSingle">
            <label className="label">{t("settings.oldPassword")}<input className="field" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
            <label className="label">{t("settings.newPassword")}<input className="field" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
            <label className="label">{t("settings.confirmPassword")}<input className="field" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
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

        <article className="card">
          <h2>{theme === "dark" ? <Moon size={17} /> : <Sun size={17} />} {t("settings.theme")}</h2>
          <div className="options">
            <button className={theme === "dark" ? "activeOption" : "option"} type="button" onClick={() => setTheme("dark")}>{t("settings.darkTheme")}</button>
            <button className={theme === "light" ? "activeOption" : "option"} type="button" onClick={() => setTheme("light")}>{t("settings.lightTheme")}</button>
          </div>
        </article>
      </section>
      </div>
    </AppShell>
  );
}
