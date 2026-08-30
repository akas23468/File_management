-- ==============================================================================
-- MINEMIND AI: COMPLETE UNRESTRICTED UPLOAD & CATALOG ACCESS MIGRATION
-- Run this once in your Supabase Dashboard -> SQL Editor
-- This removes all user/folder restrictions so ANY logged-in user can upload
-- and save files to Supabase Storage and database tables without RLS errors.
-- ==============================================================================

-- 1. Ensure private storage bucket 'app-files' exists
insert into storage.buckets (id, name, public)
values ('app-files', 'app-files', false)
on conflict (id) do update set public = false;

-- 2. Grant full schema privileges to authenticated and anonymous users
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to anon;

-- 3. Update document type check constraint to accept all frontend document types
alter table public.documents drop constraint if exists documents_type_check;
alter table public.documents add constraint documents_type_check check (
  type in (
    'geological_report', 'borehole_assay', 'mine_plan', 'statutory_clearance',
    'machinery_log', 'safety_sop', 'production_sheet', 'environmental_audit'
  )
);

-- 4. FIX STORAGE POLICIES: Allow all authenticated users to read/insert/update/delete files in app-files
drop policy if exists "Users can read their own uploaded files" on storage.objects;
drop policy if exists "Upload owners and administrators can read source files" on storage.objects;
drop policy if exists "Users can upload their own files" on storage.objects;
drop policy if exists "Users can delete their own uploaded files" on storage.objects;
drop policy if exists "Allow authenticated uploads to app-files" on storage.objects;
drop policy if exists "Allow authenticated reads from app-files" on storage.objects;
drop policy if exists "Allow authenticated updates to app-files" on storage.objects;
drop policy if exists "Allow authenticated deletes from app-files" on storage.objects;

create policy "Allow authenticated uploads to app-files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'app-files');

create policy "Allow authenticated reads from app-files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'app-files');

create policy "Allow authenticated updates to app-files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'app-files');

create policy "Allow authenticated deletes from app-files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'app-files');

-- 5. FIX DOCUMENTS TABLE POLICIES (Unrestricted access for all logged in users)
drop policy if exists "Admins see all documents; Employees see approved or their own" on public.documents;
drop policy if exists "Authenticated users can view the complete document catalog" on public.documents;
drop policy if exists "Authenticated users can insert documents" on public.documents;
drop policy if exists "Admins can update documents" on public.documents;
drop policy if exists "Allow all authenticated users to read documents" on public.documents;
drop policy if exists "Allow all authenticated users to insert documents" on public.documents;
drop policy if exists "Allow all authenticated users to update documents" on public.documents;

create policy "Allow all authenticated users to read documents"
  on public.documents for select
  to authenticated
  using (true);

create policy "Allow all authenticated users to insert documents"
  on public.documents for insert
  to authenticated
  with check (true);

create policy "Allow all authenticated users to update documents"
  on public.documents for update
  to authenticated
  using (true);

-- 6. FIX DOCUMENT_VERSIONS TABLE POLICIES
drop policy if exists "Admins see all versions; Employees see approved or own" on public.document_versions;
drop policy if exists "Authenticated users can view document submission metadata" on public.document_versions;
drop policy if exists "Authenticated users can submit document versions" on public.document_versions;
drop policy if exists "Admins can update version approval status" on public.document_versions;
drop policy if exists "Allow all authenticated users to read versions" on public.document_versions;
drop policy if exists "Allow all authenticated users to insert versions" on public.document_versions;
drop policy if exists "Allow all authenticated users to update versions" on public.document_versions;

create policy "Allow all authenticated users to read versions"
  on public.document_versions for select
  to authenticated
  using (true);

create policy "Allow all authenticated users to insert versions"
  on public.document_versions for insert
  to authenticated
  with check (true);

create policy "Allow all authenticated users to update versions"
  on public.document_versions for update
  to authenticated
  using (true);

-- 7. FIX DOCUMENT_CHUNKS TABLE POLICIES
drop policy if exists "Admins see all chunks; Employees see approved chunks or own" on public.document_chunks;
drop policy if exists "Authenticated users can insert chunks" on public.document_chunks;
drop policy if exists "Admins can update chunk approval status" on public.document_chunks;
drop policy if exists "Allow all authenticated users to read chunks" on public.document_chunks;
drop policy if exists "Allow all authenticated users to insert chunks" on public.document_chunks;
drop policy if exists "Allow all authenticated users to update chunks" on public.document_chunks;

create policy "Allow all authenticated users to read chunks"
  on public.document_chunks for select
  to authenticated
  using (true);

create policy "Allow all authenticated users to insert chunks"
  on public.document_chunks for insert
  to authenticated
  with check (true);

create policy "Allow all authenticated users to update chunks"
  on public.document_chunks for update
  to authenticated
  using (true);

-- 8. FIX APPROVALS TABLE POLICIES
drop policy if exists "Admins see all approvals; Employees see their own submissions" on public.approvals;
drop policy if exists "Authenticated users can create approval requests" on public.approvals;
drop policy if exists "Admins can update approval status" on public.approvals;
drop policy if exists "Allow all authenticated users to read approvals" on public.approvals;
drop policy if exists "Allow all authenticated users to insert approvals" on public.approvals;
drop policy if exists "Allow all authenticated users to update approvals" on public.approvals;

create policy "Allow all authenticated users to read approvals"
  on public.approvals for select
  to authenticated
  using (true);

create policy "Allow all authenticated users to insert approvals"
  on public.approvals for insert
  to authenticated
  with check (true);

create policy "Allow all authenticated users to update approvals"
  on public.approvals for update
  to authenticated
  using (true);

-- 9. FIX AUDIT_LOGS TABLE POLICIES
drop policy if exists "Admins see all audit logs; Employees see their own actions" on public.audit_logs;
drop policy if exists "Authenticated users can write audit logs" on public.audit_logs;
drop policy if exists "Allow all authenticated users to read audit logs" on public.audit_logs;
drop policy if exists "Allow all authenticated users to insert audit logs" on public.audit_logs;

create policy "Allow all authenticated users to read audit logs"
  on public.audit_logs for select
  to authenticated
  using (true);

create policy "Allow all authenticated users to insert audit logs"
  on public.audit_logs for insert
  to authenticated
  with check (true);
