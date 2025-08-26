import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const subscribeToTable = (
  table: string,
  callback: (payload: any) => void,
  userWallet?: string
) => {
  const client = userWallet 
    ? createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            'x-wallet-address': userWallet
          }
        }
      })
    : supabase;
    
  return client
    .channel(`${table}_changes`)
    .on("postgres_changes", { event: "*", schema: "public", table }, callback)
    .subscribe();
};
