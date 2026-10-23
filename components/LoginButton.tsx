"use client";
import { useLogin } from "@/components/LoginProvider";

export function LoginButton({
  children = "Me connecter",
  reason,
  className = "block w-full rounded-full bg-ink py-4 text-center font-semibold text-white",
}: { children?: React.ReactNode; reason?: string; className?: string }) {
  const { openLogin } = useLogin();
  return <button onClick={() => openLogin(reason)} className={className}>{children}</button>;
}
