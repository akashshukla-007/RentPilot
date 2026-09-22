const {createClient}=require("@supabase/supabase-js");
const supabaseUrl=process.env.SUPABASE_URL,supabaseServiceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!supabaseUrl)throw new Error("SUPABASE_URL is not configured");
if(!supabaseServiceKey)throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
const supabaseAdmin=createClient(supabaseUrl,supabaseServiceKey,{auth:{autoRefreshToken:false,persistSession:false}});
module.exports={supabaseAdmin};