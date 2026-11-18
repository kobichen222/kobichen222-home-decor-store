import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/store/account-forms";

export const metadata: Metadata = { title: "הרשמה", robots: { index: false } };

async function Form({ searchParams }: PageProps<"/account/register">) {
  const { next } = await searchParams;
  return <RegisterForm next={typeof next === "string" ? next : undefined} />;
}

export default function RegisterPage(props: PageProps<"/account/register">) {
  return (
    <div className="container-page grid place-items-center py-14">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-7">
        <h1 className="mb-1 text-2xl font-bold">יצירת חשבון</h1>
        <p className="mb-6 text-sm text-ink-soft">אפשר גם לקנות בלי הרשמה. חשבון שומר את ההזמנות, הכתובות והמועדפים שלכם.</p>
        <Suspense fallback={<div className="h-96" />}>
          <Form {...props} />
        </Suspense>
      </div>
    </div>
  );
}
