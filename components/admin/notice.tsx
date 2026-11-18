import { cn } from "@/lib/utils";

export function Notice({ tone = "success", children }: { tone?: "success" | "danger" | "info"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "mb-4 rounded-xl border px-4 py-3 text-sm font-semibold",
        tone === "success" && "border-success/30 bg-success/10 text-success",
        tone === "danger" && "border-danger/30 bg-danger/5 text-danger",
        tone === "info" && "border-line bg-white text-ink-soft",
      )}
    >
      {children}
    </p>
  );
}
