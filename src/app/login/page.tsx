"use client";
import { useActionState } from "react";
import { login } from "../actions";
import { useI18n } from "@/components/I18n";

export default function LoginPage() {
  const { t } = useI18n();
  const [err, action, pending] = useActionState(login, null);
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <div className="mb-8 text-center">
        <img src="/icons/icon-192.png" alt="" className="mx-auto mb-4 h-16 w-16 rounded-2xl" />
        <h1 className="text-3xl font-extrabold">{t.appName}</h1>
      </div>
      <form action={action} className="card space-y-4 p-5">
        <label className="block space-y-2">
          <span className="text-sm text-muted">{t.password}</span>
          <input name="password" type="password" autoFocus autoComplete="current-password" required />
        </label>
        {err && <p className="text-sm text-red-600">{t.wrongPassword}</p>}
        <button className="btn btn-primary w-full" disabled={pending}>{t.login}</button>
      </form>
    </main>
  );
}
