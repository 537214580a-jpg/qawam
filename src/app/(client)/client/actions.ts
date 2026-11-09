'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function currentClient(){const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)throw new Error('يجب تسجيل الدخول.');const {data:profile}=await db.from('profiles').select('consent_health_at').eq('id',user.id).single();if(!profile?.consent_health_at)throw new Error('وافق على معالجة بياناتك الصحية أولًا.');const {data,error}=await db.from('clients').select('id').eq('user_id',user.id).single();if(error||!data)throw new Error('أكمل ملفك الشخصي أولًا.');return {db,clientId:data.id,userId:user.id};}
const mealSchema=z.object({name:z.string().min(1).max(120),grams:z.coerce.number().positive().max(5000),calories:z.coerce.number().min(0).max(10000),protein:z.coerce.number().min(0).max(1000),carbs:z.coerce.number().min(0).max(1000),fat:z.coerce.number().min(0).max(1000),mealType:z.string().min(1).max(40),foodId:z.string().uuid().optional().or(z.literal('')),photoPath:z.string().max(500).optional()});
export async function addMeal(formData:FormData){const p=mealSchema.safeParse(Object.fromEntries(formData));if(!p.success)return {error:'تحقق من اسم الطعام والكمية.'};try{const {db,clientId}=await currentClient();const d=p.data;const {data:log,error}=await db.from('meal_logs').insert({client_id:clientId,meal_type:d.mealType,photo_path:d.photoPath||null,source:d.photoPath?'photo':'manual'}).select('id').single();if(error||!log)return {error:'تعذر حفظ الوجبة.'};const {error:itemError}=await db.from('meal_items').insert({meal_log_id:log.id,food_id:d.foodId||null,name:d.name,grams:d.grams,calories:d.calories,protein_g:d.protein,carbs_g:d.carbs,fat_g:d.fat});if(itemError)return {error:'تم إنشاء الوجبة لكن تعذر حفظ الطعام.'};revalidatePath('/client');revalidatePath('/client/food');return {success:true};}catch{return {error:'تعذر حفظ الوجبة. حاول مرة أخرى.'};}}
const waterSchema=z.object({amount:z.coerce.number().int().min(1).max(5000)});
export async function addWater(formData:FormData){const p=waterSchema.safeParse({amount:formData.get('amount')});if(!p.success)return {error:'كمية الماء غير صحيحة.'};try{const {db,clientId}=await currentClient();const {error}=await db.from('water_logs').insert({client_id:clientId,amount_ml:p.data.amount});if(error)return {error:'تعذر تسجيل الماء.'};revalidatePath('/client');return {success:true};}catch{return {error:'تعذر تسجيل الماء.'};}}
const recipeSchema=z.object({name:z.string().min(2).max(100),servings:z.coerce.number().positive().max(100),items:z.string().min(2)});
export async function saveRecipe(formData:FormData){const p=recipeSchema.safeParse(Object.fromEntries(formData));if(!p.success)return {error:'أدخل اسم الوصفة ومكوناتها.'};let items:unknown;try{items=JSON.parse(p.data.items);}catch{return {error:'بيانات المكونات غير صالحة.'};}const itemSchema=z.array(z.object({foodId:z.string().uuid(),grams:z.number().positive().max(5000)})).min(1).max(50);const check=itemSchema.safeParse(items);if(!check.success)return {error:'تحقق من مكونات الوصفة.'};try{const {db,userId}=await currentClient();const {data:recipe,error}=await db.from('recipes').insert({user_id:userId,name:p.data.name,servings:p.data.servings,is_usual:true}).select('id').single();if(error||!recipe)return {error:'تعذر حفظ الوصفة.'};const {error:itemError}=await db.from('recipe_items').insert(check.data.map(i=>({recipe_id:recipe.id,food_id:i.foodId,grams:i.grams})));if(itemError)return {error:'تعذر حفظ مكونات الوصفة.'};revalidatePath('/client/food');return {success:true};}catch{return {error:'تعذر حفظ الوصفة.'};}}

type MealTextFood={id:string;name_ar:string;name_en:string|null;calories:number;protein_g:number;carbs_g:number;fat_g:number};
type MealTextMatch={start:number;end:number;food:MealTextFood};
const foodAliases=[
 {target:'صدر دجاج مطهو',names:['دجاج مطبوخ','دجاج مطهو','صدر دجاج مطبوخ','صدر دجاج','دجاج','chicken breast','cooked chicken','chicken']},
 {target:'أرز أبيض مطهو',names:['أرز مطبوخ','ارز مطبوخ','رز مطبوخ','أرز','ارز','رز','rice']},
 {target:'بطاطس مسلوقة',names:['بطاطس مسلوقة','بطاطس','بطاطا','potato','potatoes']},
 {target:'بيض كامل مطهو',names:['بيض مطبوخ','بيض كامل','بيض','بيضة','egg','eggs']},
 {target:'شوفان جاف',names:['شوفان','اوفان','oats','oatmeal']},
 {target:'زبادي يوناني قليل الدسم',names:['زبادي يوناني','زبادي','yogurt','greek yogurt']},
 {target:'لحم بقري قليل الدهن مطهو',names:['لحم بقري','لحم مطبوخ','لحم','beef','lean beef']},
 {target:'سمك هامور مشوي',names:['هامور مشوي','هامور','سمك مشوي','سمك','fish','grouper']},
 {target:'موز',names:['موز','موزة','banana']},
 {target:'تمر',names:['تمر','تمرة','dates','date']},
 {target:'فول مدمس سادة',names:['فول مدمس','فول','foul','fava beans']},
 {target:'خبز عربي أبيض',names:['خبز عربي','خبز','pita bread','bread']}
];
function normalizeMealText(value:string){
 const digits='٠١٢٣٤٥٦٧٨٩';
 return value.toLocaleLowerCase('ar')
  .replace(/[٠-٩]/g,d=>String(digits.indexOf(d)))
  .replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
  .normalize('NFKD')
  .replace(/[\u064B-\u065F\u0670\u0640]/g,'')
  .replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه')
  .replace(/[^\p{L}\p{N}.,،؛;:+\-\s]/gu,' ')
  .replace(/\s+/g,' ').trim();
}
function isMealWord(char:string|undefined){return !!char&&/[\p{L}\p{N}]/u.test(char);}
function findMealTextMatches(text:string,foods:MealTextFood[]):MealTextMatch[]{
 const byName=new Map(foods.map(food=>[normalizeMealText(food.name_ar),food]));
 const terms=foods.flatMap(food=>[
  {term:normalizeMealText(food.name_ar),food},
  ...(food.name_en?[{term:normalizeMealText(food.name_en),food}]:[])
 ]);
 for(const alias of foodAliases){
  const food=byName.get(normalizeMealText(alias.target));
  if(food)terms.push(...alias.names.map(name=>({term:normalizeMealText(name),food})));
 }
 const candidates:MealTextMatch[]=[];
 for(const {term,food} of terms){
  if(!term)continue;
  let from=0;
  while(from<text.length){
   const start=text.indexOf(term,from);
   if(start<0)break;
   const end=start+term.length;
   if(!isMealWord(text[start-1])&&!isMealWord(text[end]))candidates.push({start,end,food});
   from=start+1;
  }
 }
 candidates.sort((a,b)=>a.start-b.start||(b.end-b.start)-(a.end-a.start));
 const selected:MealTextMatch[]=[];
 for(const candidate of candidates){
  if(selected.some(item=>candidate.start<item.end&&candidate.end>item.start))continue;
  selected.push(candidate);
 }
 return selected.sort((a,b)=>a.start-b.start);
}
function parseMealGrams(text:string,match:MealTextMatch,previousEnd:number,nextStart:number){
 const before=text.slice(previousEnd,match.start);
 const after=text.slice(match.end,nextStart);
 const numberPattern=/(\d+(?:[.,]\d+)?)(?:\s*(?:غرام|جرام|جم|غ|grams?|g))?/i;
 const delimitedPrefix=before.split(/[,،;؛\n+]/).pop()?.trim()||'';
 const prefixAmount=delimitedPrefix.match(new RegExp('^'+numberPattern.source+'$','i'));
 const suffixAmount=after.match(numberPattern);
 const fallbackAmount=before.match(new RegExp(numberPattern.source+'\\s*$','i'));
 const raw=prefixAmount?.[1]||suffixAmount?.[1]||fallbackAmount?.[1];
 if(!raw)return null;
 const grams=Number(raw.replace(',','.'));
 return Number.isFinite(grams)&&grams>0&&grams<=5000?grams:null;
}
const freeTextMealSchema=z.object({text:z.string().trim().min(3).max(1000),mealType:z.string().trim().min(1).max(40)});
export async function logFreeTextMeal(formData:FormData){
 const parsed=freeTextMealSchema.safeParse({text:formData.get('text'),mealType:formData.get('mealType')});
 if(!parsed.success)return {error:'اكتب اسم الوجبة وكميات الأطعمة بالجرام.'};
 try{
  const {db,clientId}=await currentClient();
  const {data:client}=await db.from('clients').select('clinic_id').eq('id',clientId).single();
  const foodQuery=db.from('foods').select('id,name_ar,name_en,calories,protein_g,carbs_g,fat_g').eq('is_public',true);
  const {data:publicFoods,error:foodError}=await foodQuery.order('name_ar');
  if(foodError)return {error:'تعذر البحث في قاعدة الأطعمة.'};
  let clinicFoods:MealTextFood[]=[];
  if(client?.clinic_id){
   const {data,error}=await db.from('foods').select('id,name_ar,name_en,calories,protein_g,carbs_g,fat_g').eq('clinic_id',client.clinic_id).order('name_ar');
   if(error)return {error:'تعذر قراءة أطعمة العيادة.'};
   clinicFoods=(data||[]) as MealTextFood[];
  }
  const foods=[...(publicFoods||[]),...clinicFoods] as MealTextFood[];
  const text=normalizeMealText(parsed.data.text);
  const matches=findMealTextMatches(text,foods);
  if(!matches.length)return {error:'ما تعرّفت على الأطعمة. جرّب أسماء مثل دجاج، أرز، بطاطس أو زبادي.'};
  const items:{food:MealTextFood;grams:number}[]=[];
  for(let index=0;index<matches.length;index++){
   const match=matches[index];
   const grams=parseMealGrams(text,match,index?matches[index-1].end:0,index+1<matches.length?matches[index+1].start:text.length);
   if(!grams)return {error:'اكتب كمية كل صنف بالجرام، مثل: دجاج مطبوخ 150، أرز 150.'};
   items.push({food:match.food,grams});
  }
  const {data:log,error:logError}=await db.from('meal_logs').insert({client_id:clientId,meal_type:parsed.data.mealType,source:'text'}).select('id').single();
  if(logError||!log){console.error('QAWAM free-text meal log failed',logError?.code,logError?.message);return {error:'تعذر حفظ الوجبة. حاول مرة ثانية.'};}
  const rows=items.map(({food,grams})=>{const factor=grams/100;return {meal_log_id:log.id,food_id:food.id,name:food.name_ar,grams,calories:Number(food.calories)*factor,protein_g:Number(food.protein_g)*factor,carbs_g:Number(food.carbs_g)*factor,fat_g:Number(food.fat_g)*factor};});
  const {error:itemError}=await db.from('meal_items').insert(rows);
  if(itemError){await db.from('meal_logs').delete().eq('id',log.id);console.error('QAWAM free-text meal items failed',itemError.code,itemError.message);return {error:'تعذر حفظ مكونات الوجبة.'};}
  revalidatePath('/client');
  revalidatePath('/client/food');
  return {success:true,items:items.map(({food,grams})=>({name:food.name_ar,grams})),totals:rows.reduce((total,item)=>({calories:total.calories+item.calories,protein:total.protein+item.protein_g,carbs:total.carbs+item.carbs_g,fat:total.fat+item.fat_g}),{calories:0,protein:0,carbs:0,fat:0})};
 }catch(error){console.error('QAWAM free-text meal unexpected failure',error);return {error:'تعذر تسجيل الوجبة. تأكد من دخولك وحاول مرة ثانية.'};}
}
