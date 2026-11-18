// ONE-TIME database bootstrap, run from a Vercel build of the temporary
// `bootstrap-db` branch. Applies supabase/migrations/* and the demo seed
// through the service-role-only helper public._bootstrap_exec(), which is
// dropped again afterwards. Not part of main.
import { createClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync } from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SHOP_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SHOP_SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("bootstrap-db: missing Supabase URL / secret key");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const q = (s) => `'${s.replace(/'/g, "''")}'`;

async function apply(version, name, sql) {
  const guarded = `do $chk$ begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = ${q(version)}) then
    raise exception 'ALREADY_APPLIED';
  end if;
end $chk$;
${sql}
;insert into supabase_migrations.schema_migrations (version, name) values (${q(version)}, ${q(name)});`;
  const { error } = await db.rpc("_bootstrap_exec", { p_sql: guarded });
  if (error?.message?.includes("ALREADY_APPLIED")) return console.log(`bootstrap-db: skip   ${version} ${name}`);
  if (error) {
    console.error(`bootstrap-db: FAILED ${version} ${name}: ${error.message} ${error.details ?? ""} ${error.hint ?? ""}`);
    process.exit(1);
  }
  console.log(`bootstrap-db: applied ${version} ${name}`);
}

const dir = "supabase/migrations";
for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  const [, version, name] = file.match(/^(\d+)_(.+)\.sql$/);
  await apply(version, name, readFileSync(`${dir}/${file}`, "utf8"));
}
const seed = readFileSync("supabase/seed.sql", "utf8").replace(/^begin;$/m, "").replace(/^commit;$/m, "");
await apply("20261117009999", "demo_seed", seed);

const { count, error } = await db.from("products").select("id", { count: "exact", head: true });
console.log(`bootstrap-db: done, products = ${count}${error ? ` (check failed: ${error.message})` : ""}`);
