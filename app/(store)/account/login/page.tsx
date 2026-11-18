import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/store/account-forms";

export const metadata: Metadata = { title: "כניסה לחשבון", robots: { index: false } };

async function Form({ searchParams }: PageProps<"/account/login">) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : undefined} />;
}

export default function LoginPage(props: PageProps<"/account/login">) {
  return (
    <div className="container-page grid place-items-center py-14">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-7">
        <h1 className="mb-1 text-2xl font-bold">כניסה לחשבון</h1>
        <p className="mb-6 text-sm text-ink-soft">מעקב הזמנות, כתובות שמורות ומועדפים.</p>
        <Suspense fallback={<div className="h-64" />}>
          <Form {...props} />
        </Suspense>
      </div>
    </div>
  );
}
