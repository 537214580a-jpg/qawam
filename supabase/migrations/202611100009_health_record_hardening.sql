alter table public.health_documents
  add constraint health_documents_client_id_id_key unique (client_id,id);
alter table public.lab_results
  add constraint lab_results_client_id_id_key unique (client_id,id);
alter table public.lab_results
  drop constraint if exists lab_results_document_id_fkey;
alter table public.lab_results
  add constraint lab_results_document_same_client_fkey
  foreign key (client_id,document_id)
  references public.health_documents(client_id,id);
alter table public.lab_results
  drop constraint if exists lab_results_supersedes_id_fkey;
alter table public.lab_results
  add constraint lab_results_supersedes_same_client_fkey
  foreign key (client_id,supersedes_id)
  references public.lab_results(client_id,id);

revoke update on public.health_conditions from authenticated;
grant update(status,updated_at) on public.health_conditions to authenticated;
