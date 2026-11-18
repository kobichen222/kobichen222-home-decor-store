import { Download } from "lucide-react";
import { ImportWizard } from "@/components/admin/import-wizard";
import { AdminHeader, Card } from "@/components/admin/ui";
import { can, requireAdmin } from "@/lib/auth/admin";

export const metadata = { title: "ייבוא וייצוא" };

const EXPORTS = [
  ["products", "קטלוג מוצרים", "catalog.manage"],
  ["inventory", "מלאי לפי וריאציה", "inventory.manage"],
  ["orders", "הזמנות", "orders.view"],
  ["customers", "לקוחות", "customers.view"],
] as const;

export default async function ImportExportPage() {
  const admin = await requireAdmin("catalog.manage", "orders.view", "customers.view", "inventory.manage");
  return (
    <>
      <AdminHeader title="ייבוא וייצוא" description="קבצי CSV נפתחים ב־Excel עם עברית תקינה." />
      <Card className="mb-6 p-5">
        <h2 className="mb-3 font-bold">ייצוא</h2>
        <div className="flex flex-wrap gap-2">
          {EXPORTS.filter(([, , p]) => can(admin, p)).map(([kind, label]) => (
             
            <a key={kind} href={`/admin/export/${kind}`} download className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold hover:bg-sand">
              <Download className="size-4" />
              {label}
            </a>
          ))}
        </div>
      </Card>
      {can(admin, "catalog.manage") && (
        <section>
          <h2 className="mb-3 font-bold">ייבוא מוצרים ועדכון מחירים ומלאי</h2>
          <ImportWizard />
        </section>
      )}
    </>
  );
}
