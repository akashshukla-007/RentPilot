const {supabaseAdmin}=require("../lib/supabase");const {requireUser}=require("../lib/auth");
module.exports=async(req,res)=>{const u=await requireUser(req,res);if(!u)return;const id=req.query?.flat_id;if(!id)return res.status(400).json({error:"flat_id is required"});
const f=await supabaseAdmin.from("flats").select("*").eq("id",id).eq("owner_id",u.id).single();if(f.error)return res.status(404).json({error:f.error.message});
const t=await supabaseAdmin.from("tenants").select("*").eq("flat_id",id).eq("owner_id",u.id).eq("status","active").limit(1).maybeSingle();
const b=await supabaseAdmin.from("bills").select("month,current_reading,total_amount,total_due,status").eq("flat_id",id).eq("owner_id",u.id).order("month",{ascending:false}).limit(1).maybeSingle();
res.json({flat:f.data,tenant:t.data||null,latestBill:b.data||null});};