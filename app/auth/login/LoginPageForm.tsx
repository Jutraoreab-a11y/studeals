"use client";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";

export function LoginPageForm({ next }: { next: string }) {
  const router = useRouter();
  return <LoginForm onSuccess={() => { router.replace(next); router.refresh(); }} />;
}
