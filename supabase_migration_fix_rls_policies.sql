-- RUN THIS IN SUPABASE SQL EDITOR TO FIX DOCUMENT INSERT POLICIES
-- This fixes the row-level security policies that were preventing document uploads

-- Fix: The old policy incorrectly required document.id = auth.uid()
-- but document IDs are random UUIDs, not user IDs. New policy just requires authentication.

drop policy if exists "Authenticated users can insert documents" on public.documents;
create policy "Authenticated users can insert documents"
  on public.documents for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can insert documents" on public.document_versions;
create policy "Authenticated users can submit document versions"
  on public.document_versions for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can insert documents" on public.document_chunks;
create policy "Authenticated users can insert chunks"
  on public.document_chunks for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can insert documents" on public.approvals;
create policy "Authenticated users can create approval requests"
  on public.approvals for insert
  with check (auth.role() = 'authenticated');
