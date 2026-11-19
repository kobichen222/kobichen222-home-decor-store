import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/store/auth-layout";
import { RegisterForm } from "@/components/store/account-forms";

export const metadata: Metadata = { title: "הרשמה", robots: { index: false } };

async function Form({ searchParams }: PageProps<"/account/register">) {
  const { next } = await searchParams;
  return <RegisterForm next={typeof next === "string" ? next : undefined} />;
}

export default function RegisterPage(props: PageProps<"/account/register">) {
  return (
    <AuthLayout title="יצירת חשבון" subtitle="דקה אחת, והחשבון שלכם מוכן.">
      <Suspense fallback={<div className="h-96" />}>
        <Form {...props} />
      </Suspense>
    </AuthLayout>
  );
}
