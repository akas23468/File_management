-- Run this file once in Supabase Dashboard -> SQL Editor.
-- It adds persistent chat history, generated reports, and file-upload policies.

create table if not exists public.query_history (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null,
  user_role text not null check (user_role in ('admin', 'employee')),
  question_text text not null,
  answer_text text not null,
  ai_summary text,
  citations jsonb not null default '[]'::jsonb,
  confidence numeric not null default 0,
  found_in_knowledge_base boolean not null default false,
  draft_official_reply text,
  created_at timestamptz default now()
);

create table if not exists public.reports (
  id text primary key,
  title text not null,
  report_code text not null unique,
  type text not null,
  period text not null,
  subsidiary text not null,
  generated_by_id uuid not null references auth.users(id) on delete cascade,
  generated_by_name text not null,
  generated_by_role text not null check (generated_by_role in ('admin', 'employee')),
  content text not null,
  summary text,
  citations jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'submitted_to_admin', 'verified_official')),
  created_at timestamptz default now()
);

alter table public.query_history enable row level security;
alter table public.reports enable row level security;

grant select, insert on public.query_history to authenticated;
grant select, insert on public.reports to authenticated;

drop policy if exists "Users see their own AI query history or admins see all" on public.query_history;
create policy "Users see their own AI query history or admins see all"
  on public.query_history for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Authenticated users can save their own AI query history" on public.query_history;
create policy "Authenticated users can save their own AI query history"
  on public.query_history for insert
  with check (user_id = auth.uid());

drop policy if exists "Users see their own reports or admins see all" on public.reports;
create policy "Users see their own reports or admins see all"
  on public.reports for select
  using (generated_by_id = auth.uid() or public.is_admin());

drop policy if exists "Authenticated users can create reports" on public.reports;
create policy "Authenticated users can create reports"
  on public.reports for insert
  with check (generated_by_id = auth.uid());

-- Let the frontend's document classifications be saved.
alter table public.documents drop constraint if exists documents_type_check;
alter table public.documents add constraint documents_type_check check (
  type in (
    'geological_report', 'borehole_assay', 'mine_plan', 'statutory_clearance',
    'machinery_log', 'safety_sop', 'production_sheet'
  )
);

-- The frontend stores binary uploads under: {authenticated-user-id}/...
drop policy if exists "Users can read their own uploaded files" on storage.objects;
create policy "Users can read their own uploaded files"
  on storage.objects for select
  using (bucket_id = 'app-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can upload their own files" on storage.objects;
create policy "Users can upload their own files"
  on storage.objects for insert
  with check (bucket_id = 'app-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own uploaded files" on storage.objects;
create policy "Users can delete their own uploaded files"
  on storage.objects for delete
  using (bucket_id = 'app-files' and (storage.foldername(name))[1] = auth.uid()::text);
