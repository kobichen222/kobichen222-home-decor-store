import "server-only";
import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/server";

export type Customer = { id: string; email: string };

/** The signed-in shopper (token verified with getClaims), or null. */
export const getCustomer = cache(async (): Promise<Customer | null> => {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: (claims.email as string | undefined) ?? "" };
});
