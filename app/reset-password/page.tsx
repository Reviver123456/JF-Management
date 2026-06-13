"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { FeedbackPopups } from "@/components/AppPopup";
import { useUi } from "@/lib/i18n";
import { usePageEnterProps } from "@/components/PageEnterTransition";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { t } = useUi();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"error" | "success">("error");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pageEnterProps = usePageEnterProps("loginPage", "reset-password");

  const updatePassword = async () => {
    if (password.length < 8) {
      setMessageTone("error");
      setMessage("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    if (password !== confirmPassword) {
      setMessageTone("error");
      setMessage("รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setMessageTone("error");

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password,
      data: {
        must_change_password: false
      }
    });

    setIsSubmitting(false);

    if (error) {
      setMessageTone("error");
      setMessage(error.message);
      return;
    }

    setMessageTone("success");
    setMessage("ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว");
    window.setTimeout(() => {
      router.replace("/login");
      router.refresh();
    }, 900);
  };

  return (
    <main {...pageEnterProps}>
      <FeedbackPopups loading={isSubmitting} loadingMessage={t("pm.loadingSubtitle")} alertMessage={message} alertTone={messageTone} />
      <section className="card">
        <div className="brand brandLogo">
          <Image src="/report-templates/LOGO-JF.webp" alt="JF Advance Med" width={360} height={112} priority />
        </div>
        <h1>ตั้งรหัสผ่านใหม่</h1>
        <p>กรอกรหัสผ่านใหม่สำหรับบัญชีของคุณ</p>
        <form
          className="form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            updatePassword();
          }}
        >
          <label className="label">
            รหัสผ่านใหม่
            <span className="inputWrap">
              <LockKeyhole size={16} />
              <input
                className="field"
                type={visible ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </span>
          </label>
          <label className="label">
            ยืนยันรหัสผ่านใหม่
            <span className="inputWrap">
              <LockKeyhole size={16} />
              <input
                className="field"
                type={visible ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </span>
          </label>
          <button className="forgotPasswordButton showPasswordToggle" type="button" onClick={() => setVisible((current) => !current)}>
            {visible ? <EyeOff size={15} /> : <Eye size={15} />}
            {visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          </button>
          <button className="button primary" type="submit" disabled={isSubmitting}>
            บันทึกรหัสผ่านใหม่
          </button>
        </form>
      </section>
    </main>
  );
}
