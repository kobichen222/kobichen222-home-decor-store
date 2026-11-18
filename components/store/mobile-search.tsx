"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, X } from "lucide-react";
import * as React from "react";
import { SearchBox } from "./search-box";

/** Phone search: a sheet from the top with the autocomplete box focused. */
export function MobileSearch() {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="grid size-11 place-items-center rounded-full hover:bg-sand lg:hidden" aria-label="חיפוש מוצרים">
        <Search className="size-[1.35rem]" strokeWidth={1.6} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_.2s_ease-out]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 overflow-y-auto bg-cream px-4 pb-6 pt-4 data-[state=open]:animate-[fade-in_.2s_ease-out]"
        >
          <div className="mb-3 flex items-center justify-between">
            <Dialog.Title className="font-display text-lg font-semibold">חיפוש</Dialog.Title>
            <Dialog.Close className="grid size-10 place-items-center rounded-full hover:bg-sand" aria-label="סגירה">
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <SearchBox autoFocus onNavigate={() => setOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
