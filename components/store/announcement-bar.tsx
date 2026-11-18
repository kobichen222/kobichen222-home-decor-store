"use client";
import Link from "next/link";
import * as React from "react";
import { safeInternalPath } from "@/lib/utils";

export function AnnouncementBar({ messages }: { messages: { id: string; title: string; link_url: string | null }[] }) {
  const [index, setIndex] = React.useState(0);
  React.useEffect(() => {
    if (messages.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), 4500);
    return () => clearInterval(id);
  }, [messages.length]);
  if (!messages.length) return null;
  return (
    <div className="bg-ink text-cream">
      <p
        key={index}
        className="container-page truncate py-2 text-center text-[0.8rem] font-medium tracking-wide motion-safe:animate-[marquee-fade_4.5s_ease-in-out]"
      >
        {messages[index].link_url ? (
          <Link href={safeInternalPath(messages[index].link_url, "/")} className="underline-offset-4 hover:underline">
            {messages[index].title}
          </Link>
        ) : (
          messages[index].title
        )}
      </p>
    </div>
  );
}
