# Upload Fix Checklist

## Step 1: Clear Browser Cache & Service Worker
1. Open DevTools: Press `F12`
2. Go to **Application** tab
3. Click **Service Workers** → click **Unregister** 
4. Click **Cache Storage** → click **Delete** all caches
5. Close DevTools and press `Ctrl + Shift + R` (hard reload)

## Step 2: Run Supabase Migration (CRITICAL)
1. Open your Supabase Dashboard at https://app.supabase.com
2. Go to **SQL Editor** → click **New Query**
3. Copy & paste the entire content from this file: `supabase_migration_document_catalog_visibility.sql`
4. Click **Run** button
5. Wait for success message (should say "Success. No rows returned.")

**Without this step, uploads will ALWAYS fail with "Supabase Storage rejected the file upload"**

## Step 3: Verify You're Logged In with Real Supabase Account
1. In the MineMind app at `http://localhost:3000`
2. Click **SignIn** button
3. Use your **real Supabase credentials** (Google login or email/password)
4. Do NOT use the demo/local fallback session
5. Confirm the page shows your real user name (not "Demo User")

## Step 4: Try Upload Again
1. Go to **Knowledge Center**
2. Click **Upload New CMPDI Filing**
3. Select a small file (PDF, CSV, or TXT)
4. Fill in Title, Document Code, Reason for Change
5. Click **Ingest Document**
6. If it still fails, check:
   - Flask console for error details (next step)
   - Your email/password is correct for Supabase
   - Your Supabase project has `app-files` bucket visible in Storage

## Step 5: Debug Flask Logs (if still failing)
Look at the terminal running Flask. You should see POST requests to `/api/persistence/document-upload` with HTTP status:
- **200** = Success ✓
- **401** = Not logged in with Supabase. Go back to Step 3.
- **502** = Supabase Storage/bucket error. Verify Step 2 was done correctly.
- **400** = Missing metadata. Check browser console for errors.
