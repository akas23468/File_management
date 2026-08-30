-- ==============================================================================
-- MINEMIND AI / COAL INDIA / CMPDI SUPABASE SCHEMA & RLS POLICIES
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE (Linked to auth.users)
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  employee_id text,
  role text not null default 'employee' check (role in ('admin', 'employee')),
  subsidiary text not null default 'CMPDI HQ',
  department text not null default 'Geology & Exploration',
  designation text not null default 'Mining Engineer',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------------------------
-- 2. DOCUMENTS TABLE (Master Document Catalog)
-- ------------------------------------------------------------------------------
create table if not exists public.documents (
  id text primary key,
  document_code text not null unique,
  title text not null,
  type text not null check (type in ('geological_report', 'borehole_assay', 'mine_plan', 'statutory_clearance', 'machinery_log')),
  department text not null,
  subsidiary text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------------------------
-- 3. DOCUMENT VERSIONS TABLE (Append-Only Controlled History)
-- ------------------------------------------------------------------------------
create table if not exists public.document_versions (
  id text primary key,
  document_id text not null references public.documents(id) on delete cascade,
  version_number integer not null default 1,
  uploaded_by_id uuid references auth.users(id) on delete set null,
  uploaded_by_name text not null,
  uploaded_by_subsidiary text not null,
  uploaded_at timestamptz default now(),
  reason_for_change text not null,
  file_name text,
  file_size text,
  file_path text,
  storage_bucket text default 'app-files',
  extracted_text text not null,
  key_metrics jsonb default '[]'::jsonb,
  ocr_confidence numeric default 98.0,
  approval_status text not null default 'pending' check (approval_status in ('approved', 'pending', 'rejected', 'changes_requested')),
  approval_priority text not null default 'normal' check (approval_priority in ('urgent', 'normal', 'routine')),
  ai_risk_reason text,
  reviewed_by_id uuid references auth.users(id) on delete set null,
  reviewed_by_name text,
  reviewed_at timestamptz,
  reviewer_note text
);

-- ------------------------------------------------------------------------------
-- 4. DOCUMENT CHUNKS TABLE (Semantic & Lexical Search Index)
-- ------------------------------------------------------------------------------
create table if not exists public.document_chunks (
  id text primary key,
  document_id text not null references public.documents(id) on delete cascade,
  version_id text not null references public.document_versions(id) on delete cascade,
  document_title text not null,
  document_code text not null,
  version_number integer not null,
  page_or_sheet_ref text not null,
  subsidiary text not null,
  text text not null,
  is_approved boolean not null default false,
  topic_tag text,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------------------------
-- 5. APPROVALS TABLE (Governance Workflow Queue)
-- ------------------------------------------------------------------------------
create table if not exists public.approvals (
  id text primary key,
  document_id text not null references public.documents(id) on delete cascade,
  version_id text not null references public.document_versions(id) on delete cascade,
  submitted_by_id uuid references auth.users(id) on delete set null,
  submitted_by_name text not null,
  submitted_by_subsidiary text not null,
  submitted_at timestamptz default now(),
  priority text not null default 'normal' check (priority in ('urgent', 'normal', 'routine')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'changes_requested')),
  diff_summary text not null,
  reviewer_notes text,
  reviewed_by_id uuid references auth.users(id) on delete set null,
  reviewed_by_name text,
  reviewed_at timestamptz
);

-- ------------------------------------------------------------------------------
-- 6. AUDIT LOGS TABLE (Statutory Compliance Ledger)
-- ------------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id text primary key,
  timestamp timestamptz default now(),
  action text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null,
  actor_role text not null,
  actor_subsidiary text not null,
  document_id text,
  document_title text,
  document_code text,
  version_number integer,
  details text not null,
  ip_address text default '10.144.18.24'
);

-- ------------------------------------------------------------------------------
-- 7. AI QUERY HISTORY AND GENERATED REPORTS
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 7. AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    email,
    name,
    employee_id,
    role,
    subsidiary,
    department,
    designation
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'employeeId', 'EMP-' || substr(new.id::text, 1, 6)),
    coalesce(new.raw_user_meta_data->>'role', 'employee'),
    coalesce(new.raw_user_meta_data->>'subsidiary', 'CMPDI HQ'),
    coalesce(new.raw_user_meta_data->>'department', 'Geology & Exploration'),
    coalesce(new.raw_user_meta_data->>'designation', 'Mining Engineer')
  )
  on conflict (id) do update set
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==============================================================================
-- 8. TABLE GRANTS & ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Ensure roles have standard table access so RLS can filter safely
grant usage on schema public to anon, authenticated;
grant select, insert, update on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

-- Helper function: Check if active user is Admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.document_chunks enable row level security;
alter table public.approvals enable row level security;
alter table public.audit_logs enable row level security;
alter table public.query_history enable row level security;
alter table public.reports enable row level security;

-- PROFILES POLICIES
create policy "Users can view own profile or admins view all"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin() or auth.role() = 'authenticated');

create policy "Users can update own profile or admins update all"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin());

create policy "Authenticated users can insert profile"
  on public.profiles for insert
  with check (auth.role() = 'authenticated');

-- DOCUMENTS POLICIES
create policy "Admins see all documents; Employees see approved or their own"
  on public.documents for select
  using (true);

create policy "Authenticated users can insert documents"
  on public.documents for insert
  with check (auth.role() = 'authenticated');

create policy "Admins can update documents"
  on public.documents for update
  using (public.is_admin());

-- DOCUMENT VERSIONS POLICIES
create policy "Admins see all versions; Employees see approved or own"
  on public.document_versions for select
  using (
    approval_status = 'approved'
    or uploaded_by_id = auth.uid()
    or public.is_admin()
  );

create policy "Authenticated users can submit document versions"
  on public.document_versions for insert
  with check (auth.role() = 'authenticated');

create policy "Admins can update version approval status"
  on public.document_versions for update
  using (public.is_admin() or uploaded_by_id = auth.uid());

-- DOCUMENT CHUNKS POLICIES
create policy "Admins see all chunks; Employees see approved chunks or own"
  on public.document_chunks for select
  using (
    is_approved = true
    or public.is_admin()
  );

create policy "Authenticated users can insert chunks"
  on public.document_chunks for insert
  with check (auth.role() = 'authenticated');

create policy "Admins can update chunk approval status"
  on public.document_chunks for update
  using (public.is_admin());

-- APPROVALS POLICIES
create policy "Admins see all approvals; Employees see their own submissions"
  on public.approvals for select
  using (
    public.is_admin()
    or submitted_by_id = auth.uid()
  );

create policy "Authenticated users can create approval requests"
  on public.approvals for insert
  with check (auth.role() = 'authenticated');

create policy "Admins can update approval status"
  on public.approvals for update
  using (public.is_admin());

-- AUDIT LOGS POLICIES
create policy "Admins see all audit logs; Employees see their own actions"
  on public.audit_logs for select
  using (
    public.is_admin()
    or actor_id = auth.uid()
  );

create policy "Authenticated users can write audit logs"
  on public.audit_logs for insert
  with check (auth.role() = 'authenticated');

-- QUERY HISTORY POLICIES
create policy "Users see their own AI query history or admins see all"
  on public.query_history for select
  using (user_id = auth.uid() or public.is_admin());

create policy "Authenticated users can save their own AI query history"
  on public.query_history for insert
  with check (user_id = auth.uid());

-- REPORT POLICIES
create policy "Users see their own reports or admins see all"
  on public.reports for select
  using (generated_by_id = auth.uid() or public.is_admin());

create policy "Authenticated users can create reports"
  on public.reports for insert
  with check (generated_by_id = auth.uid());

-- SUPABASE STORAGE POLICIES FOR THE PRIVATE app-files BUCKET
insert into storage.buckets (id, name, public)
values ('app-files', 'app-files', false)
on conflict (id) do update set public = false;

create policy "Users can read their own uploaded files"
  on storage.objects for select
  using (bucket_id = 'app-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload their own files"
  on storage.objects for insert
  with check (bucket_id = 'app-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own uploaded files"
  on storage.objects for delete
  using (bucket_id = 'app-files' and (storage.foldername(name))[1] = auth.uid()::text);
