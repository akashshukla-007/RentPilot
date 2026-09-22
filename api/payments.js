const {supabaseAdmin}=require("../lib/supabase");const {requireUser}=require("../lib/auth");
module.exports=async(req,res)=>{const u=await requireUser(req,res);if(!u)return;
if(req.method==="GET"){const {data,error}=await supabaseAdmin.from("payments").select("*").eq("owner_id",u.id).order("payment_date",{ascending:false});if(error)return res.status(500).json({error:error.message});return res.json(data)}
if(req.method==="POST"){const b=req.body||{};if(!b.flat_id||!Number(b.amount))return res.status(400).json({error:"Flat and a positive payment amount are required"});
const {data,error}=await supabaseAdmin.rpc("record_payment",{p_owner_id:u.id,p_flat_id:b.flat_id,p_tenant_id:b.tenant_id||null,p_bill_id:b.bill_id||null,p_amount:Number(b.amount),p_payment_date:b.payment_date||new Date().toISOString().slice(0,10),p_mode:b.mode||"cash",p_reference:b.reference||null,p_notes:b.notes||null});
if(error)return res.status(400).json({error:error.message});
if(b.bill_id){
 const billQ=await supabaseAdmin.from("bills").select("*").eq("id",b.bill_id).eq("owner_id",u.id).single();
 if(!billQ.error&&billQ.data){
   const paymentsQ=await supabaseAdmin.from("payments").select("amount").eq("owner_id",u.id).eq("bill_id",b.bill_id);
   if(!paymentsQ.error){
     const paid=paymentsQ.data.reduce((s,x)=>s+Number(x.amount||0),0);
     const total=Number(billQ.data.total_amount||0),due=Math.max(0,total-paid);
     const status=due===0?"paid":paid>0?"partial":"due";
     await supabaseAdmin.from("bills").update({total_due:due,status}).eq("id",b.bill_id).eq("owner_id",u.id);
   }
 }
}
return res.status(201).json(data)}
res.status(405).json({error:"Method not allowed"})};