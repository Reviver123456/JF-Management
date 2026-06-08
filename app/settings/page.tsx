"use client";

import { useState } from "react";
import { Languages, LockKeyhole, Moon, Save, Sun, UserRound } from "lucide-react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { useUi } from "@/lib/i18n";

export default function SettingsPage() {
  const { lang, theme, setLang, setTheme, t } = useUi();
  const [saved, setSaved] = useState(false);

  return (
    <AppShell>
      <div className="settingsPage">
      <PageTitle
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
        actions={
          <button className="button primary" type="button" onClick={() => setSaved(true)}>
            <Save size={16} />
            {t("common.save")}
          </button>
        }
      />
      {saved ? <p className="settingsNotice">{t("settings.saved")}</p> : null}

      <section className="grid">
        <article className="card">
          <h2><UserRound size={17} /> {t("settings.profile")}</h2>
          <div className="formGrid">
            <label className="label">{t("fields.username")}<input className="field" defaultValue="admin" /></label>
            <label className="label">{t("fields.phone")}<input className="field" defaultValue="081-234-8890" /></label>
            <label className="label">{t("fields.email")}<input className="field" defaultValue="admin@pm-site.local" /></label>
            <label className="label">{t("fields.contactOther")}<input className="field" defaultValue="Line: pm-admin" /></label>
          </div>
        </article>

        <article className="card">
          <h2><LockKeyhole size={17} /> {t("settings.password")}</h2>
          <div className="formGridSingle">
            <label className="label">{t("settings.oldPassword")}<input className="field" type="password" /></label>
            <label className="label">{t("settings.newPassword")}<input className="field" type="password" /></label>
            <label className="label">{t("settings.confirmPassword")}<input className="field" type="password" /></label>
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
