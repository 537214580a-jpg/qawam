export type Sex = 'male'|'female'|'other';
export type Goal = 'cut'|'bulk'|'maintain';
export function calculateTargets(input:{age:number;sex:Sex;heightCm:number;weightKg:number;activity:number;goal:Goal}) {
  const sexAdjustment=input.sex==='male'?5:input.sex==='female'?-161:-78;
  const bmr=Math.round(10*input.weightKg+6.25*input.heightCm-5*input.age+sexAdjustment);
  const tdee=Math.round(bmr*input.activity);
  const factor=input.goal==='cut'?0.82:input.goal==='bulk'?1.10:1;
  const calories=Math.round(tdee*factor);
  const protein=Math.round(input.weightKg*(input.goal==='bulk'?1.8:2));
  const fat=Math.round(input.weightKg*0.8);
  const carbs=Math.max(0,Math.round((calories-protein*4-fat*9)/4));
  return {bmr,tdee,calories,protein,carbs,fat};
}
