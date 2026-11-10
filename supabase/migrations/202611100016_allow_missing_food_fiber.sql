alter table public.foods alter column fiber_g drop not null;
comment on column public.foods.fiber_g is 'Null means the source did not provide fiber data.';
