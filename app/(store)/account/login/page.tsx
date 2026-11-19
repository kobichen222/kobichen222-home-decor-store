import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/store/auth-layout";
import { LoginForm } from "@/components/store/account-forms";

export const metadata: Metadata = { title: "כניסה לחשבון", robots: { index: false } };

async function Form({ searchParams }: PageProps<"/account/login">) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : undefined} />;
}

export default function LoginPage(props: PageProps<"/account/login">) {
  return (
    <AuthLayout title="כניסה לחשבון" subtitle="ברוכים השבים! הזינו את הפרטים כדי להמשיך.">
      <Suspense fallback={<div className="h-64" />}>
        <Form {...props} />
      </Suspense>
    </AuthLayout>
  );
}
