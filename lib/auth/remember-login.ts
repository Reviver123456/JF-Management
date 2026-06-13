const REMEMBER_KEY = "jf-login-remember";
const EMAIL_KEY = "jf-login-email";
const PASSWORD_KEY = "jf-login-password";

export function readRememberedLogin() {
  if (typeof window === "undefined") {
    return {
      email: "",
      password: "",
      remember: false
    };
  }

  const remember = window.localStorage.getItem(REMEMBER_KEY) === "1";

  return {
    email: remember ? window.localStorage.getItem(EMAIL_KEY) ?? "" : "",
    password: remember ? window.localStorage.getItem(PASSWORD_KEY) ?? "" : "",
    remember
  };
}

export function writeRememberedLogin(remember: boolean, email: string, password: string) {
  if (typeof window === "undefined") {
    return;
  }

  if (!remember) {
    window.localStorage.removeItem(REMEMBER_KEY);
    window.localStorage.removeItem(EMAIL_KEY);
    window.localStorage.removeItem(PASSWORD_KEY);
    return;
  }

  window.localStorage.setItem(REMEMBER_KEY, "1");
  window.localStorage.setItem(EMAIL_KEY, email);
  window.localStorage.setItem(PASSWORD_KEY, password);
}
