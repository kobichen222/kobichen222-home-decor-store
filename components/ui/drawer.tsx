"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

// Side sheet. `side` is logical: "start" is the right edge in RTL.
export function Drawer({
  open,
  onOpenChange,
  title,
  side = "end",
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  side?: "start" | "end";
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_.2s_ease-out]" />
        <Dialog.Content
          aria-describedby={undefined}
          style={{ "--drawer-from": side === "start" ? "100%" : "-100%" } as React.CSSProperties}
          className={cn(
            "fixed inset-y-0 z-50 flex w-[min(26rem,92vw)] flex-col bg-cream shadow-2xl",
            "data-[state=open]:animate-[drawer-in_.32s_var(--ease-out-soft)]",
            side === "start" ? "start-0" : "end-0",
            className,
          )}
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <Dialog.Title className="font-display text-lg font-semibold">{title}</Dialog.Title>
            <Dialog.Close className="rounded-full p-2 hover:bg-sand" aria-label="סגירה">
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
          {footer && <div className="border-t border-line bg-white px-5 py-4">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
