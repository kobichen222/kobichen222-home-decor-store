// Creates (or promotes) an admin user and assigns a role.
//
//   node --env-file=.env.local scripts/create-admin.mjs <email> <password> [role]
//
// role defaults to "owner". Needs NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SECRET_KEY. Run it once per environment to bootstrap the first
// owner; afterwards manage users from the admin panel.
import { createClient } from "@supabase/supabase-js";

const [email, password, role = "owner"] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!email || !password || !url || !key) {
  console.error("usage: node --env-file=.env.local scripts/create-admin.mjs <email> <password> [role]");
  process.exit(1);
}
if (password.length < 12) {
  console.error("Use a password of at least 12 characters.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
let userId;
const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
if (created.error) {
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  userId = data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
  if (!userId) {
    console.error("Could not create user:", created.error.message);
    process.exit(1);
  }
  console.log("User already exists, assigning role only.");
} else {
  userId = created.data.user.id;
}
const { data: roleRow } = await db.from("admin_roles").select("id, name").eq("code", role).single();
if (!roleRow) {
  console.error(`Unknown role "${role}"`);
  process.exit(1);
}
const { error } = await db.from("admin_user_roles").upsert({ user_id: userId, role_id: roleRow.id });
if (error) {
  console.error("Could not assign role:", error.message);
  process.exit(1);
}
console.log(`OK: ${email} is now "${roleRow.name}"`);
