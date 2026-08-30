-- Run once in Supabase Dashboard -> SQL Editor.
-- Keeps the Knowledge Center catalog complete for every authenticated employee,
-- while limiting binary source-file access to the uploader and administrators.

insert into storage.buckets (id, name, public)
values ('app-files', 'app-files', false)
on conflict (id) do update set public = false;

grant select on public.documents, public.document_versions, public.document_chunks to authenticated;

drop policy if exists "Admins see all documents; Employees see approved or their own" on public.documents;
drop policy if exists "Authenticated users can view the complete document catalog" on public.documents;
create policy "Authenticated users can view the complete document catalog"
  on public.documents for select
  using (auth.role() = 'authenticated');

drop policy if exists "Admins see all versions; Employees see approved or own" on public.document_versions;
drop policy if exists "Authenticated users can view document submission metadata" on public.document_versions;
create policy "Authenticated users can view document submission metadata"
  on public.document_versions for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users can read their own uploaded files" on storage.objects;
drop policy if exists "Upload owners and administrators can read source files" on storage.objects;
create policy "Upload owners and administrators can read source files"
  on storage.objects for select
  using (
    bucket_id = 'app-files'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );