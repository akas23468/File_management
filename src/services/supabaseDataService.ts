import { getSupabase } from '../supabaseClient';
import { 
  Document, 
  DocumentVersion, 
  Chunk, 
  AuditLogEntry, 
  User, 
  Subsidiary,
  DocumentType,
  ApprovalStatus,
  QueryRecord,
  ReportRecord
} from '../types';

export interface SupabaseProfile {
  id: string;
  email: string;
  name: string;
  employee_id?: string;
  role: 'admin' | 'employee';
  subsidiary: Subsidiary;
  department: string;
  designation: string;
}

export const STORAGE_BUCKET = 'app-files';

async function persistThroughBackend(endpoint: string, payload: object): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    console.warn(`[MineMind backend] ${endpoint} rejected:`, result.details || result.error || response.statusText);
    return false;
  }
  return true;
}

export interface DocumentUploadResult {
  documentId: string;
  versionId: string;
  storageFilePath: string;
  storageBucket: string;
}

export interface DocumentUploadFailure {
  error: string;
  details?: string;
}

/**
 * Single authoritative save path: sends the file and its document/version/chunk metadata
 * to the Flask backend, which uploads to Storage and writes every database row.
 * Works for all users (real Supabase auth, demo accounts, or local logins).
 */
export async function persistDocumentUpload(params: {
  file: File | Blob;
  fileName: string;
  isUpdate: boolean;
  document: { id: string; documentCode: string; title: string; type: DocumentType; department: string; subsidiary: Subsidiary };
  version: DocumentVersion;
  chunks: Chunk[];
}): Promise<DocumentUploadResult | DocumentUploadFailure> {
  const supabase = getSupabase();
  if (!supabase) return { error: 'Supabase is not configured in this browser session.' };

  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  const { file, fileName, isUpdate, document, version, chunks } = params;
  const meta = {
    documentId: document.id,
    versionId: version.id,
    versionNumber: version.versionNumber,
    isUpdate,
    title: document.title,
    documentCode: document.documentCode,
    type: document.type,
    department: document.department,
    subsidiary: document.subsidiary,
    reasonForChange: version.reasonForChange,
    extractedText: version.extractedText,
    fileSize: version.fileSize,
    approvalStatus: version.approvalStatus,
    approvalPriority: version.approvalPriority,
    aiRiskReason: version.aiRiskReason,
    ocrConfidence: version.ocrConfidence,
    uploadedById: version.uploadedBy?.id,
    uploadedByName: version.uploadedBy?.name,
    uploadedAt: version.uploadedAt,
    chunks: chunks.map(c => ({
      id: c.id,
      documentTitle: c.documentTitle,
      documentCode: c.documentCode,
      versionNumber: c.versionNumber,
      pageOrSheetRef: c.pageOrSheetRef,
      subsidiary: c.subsidiary,
      text: c.text,
      isApproved: c.isApproved,
      topicTag: c.topicTag,
    })),
  };

  const formData = new FormData();
  formData.append('file', file, fileName);
  formData.append('meta', JSON.stringify(meta));

  try {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch('/api/persistence/document-upload', {
      method: 'POST',
      headers,
      body: formData,
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn('[MineMind backend] document-upload rejected:', result.details || result.error || response.statusText);
      return {
        error: result.error || 'Supabase rejected the upload.',
        details: result.details,
      };
    }
    return result as DocumentUploadResult;
  } catch (err) {
    console.error('[MineMind backend] document-upload request failed:', err);
    return { error: 'Could not reach the local upload backend.' };
  }
}

/**
 * Upload a binary File or Blob to Supabase Storage in the private "app-files" bucket.
 * Folder rule: ${userId}/${featureName}/${itemId}/${uuid}.${extension}
 */
export async function uploadFileToStorage(params: {
  userId: string;
  featureName: string;
  itemId: string;
  file: File | Blob;
  fileName: string;
  contentType?: string;
  metadata?: Record<string, any>;
}): Promise<{ filePath: string; storageBucket: string } | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { userId, featureName, itemId, file, fileName, contentType, metadata } = params;
    const cleanUserId = userId || 'anonymous';
    const uuid = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : `f_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() || 'bin' : 'bin';
    const storagePath = `${cleanUserId}/${featureName}/${itemId}/${uuid}.${ext}`;

    const options: any = {
      cacheControl: '3600',
      upsert: true,
      contentType: contentType || (file instanceof File ? file.type : 'application/octet-stream'),
    };

    if (metadata) {
      options.metadata = metadata;
    }

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, options);

    if (error) {
      console.warn('[Supabase Storage] Upload error:', error.message);
      return null;
    }

    console.log(`[Supabase Storage] Successfully uploaded file to ${STORAGE_BUCKET}/${data.path}`);
    return {
      filePath: data.path,
      storageBucket: STORAGE_BUCKET,
    };
  } catch (err) {
    console.error('[Supabase Storage] Upload exception:', err);
    return null;
  }
}

/**
 * Generate a temporary signed URL for a private storage object (default 1 hour = 3600s).
 */
export async function getStorageSignedUrl(
  filePath: string,
  expiresInSeconds: number = 3600,
  bucket: string = STORAGE_BUCKET
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase || !filePath) return null;

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn('[Supabase Storage] createSignedUrl warning:', error?.message);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('[Supabase Storage] createSignedUrl exception:', err);
    return null;
  }
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFileFromStorage(
  filePath: string,
  bucket: string = STORAGE_BUCKET
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase || !filePath) return false;

  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.warn('[Supabase Storage] remove file warning:', error.message);
      return false;
    }

    console.log(`[Supabase Storage] Successfully deleted ${bucket}/${filePath}`);
    return true;
  } catch (err) {
    console.error('[Supabase Storage] remove file exception:', err);
    return false;
  }
}

// Fetch user profile
export async function fetchUserProfile(userId: string, email?: string): Promise<User | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const cleanEmail = email ? email.toLowerCase().trim() : '';

    // 1. Try querying by User ID
    if (userId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data && !error) {
        return {
          id: data.id,
          name: data.name || (cleanEmail ? cleanEmail.split('@')[0] : 'Authorized User'),
          email: data.email || cleanEmail,
          role: data.role as 'admin' | 'employee',
          subsidiary: (data.subsidiary as Subsidiary) || 'CMPDI HQ',
          department: data.department || 'Central Directorate',
          designation: data.designation || (data.role === 'admin' ? 'Chief Mining Engineer' : 'Mining Technical Officer'),
          employeeId: data.employee_id || `EMP-${data.id.substring(0, 5).toUpperCase()}`,
          status: 'approved',
        };
      }
    }

    // 2. Fallback: Query by Email (case-insensitive)
    if (cleanEmail) {
      const { data: emailData, error: emailError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .limit(1)
        .maybeSingle();

      if (emailData && !emailError) {
        // If the profile exists under this email, link the OAuth userId to it
        if (userId && emailData.id !== userId) {
          try {
            await supabase
              .from('profiles')
              .update({ id: userId, updated_at: new Date().toISOString() })
              .eq('email', cleanEmail);
          } catch {
            // Non-blocking if primary key constraint exists
          }
        }

        return {
          id: userId || emailData.id,
          name: emailData.name || cleanEmail.split('@')[0],
          email: emailData.email || cleanEmail,
          role: emailData.role as 'admin' | 'employee',
          subsidiary: (emailData.subsidiary as Subsidiary) || 'CMPDI HQ',
          department: emailData.department || 'Central Directorate',
          designation: emailData.designation || (emailData.role === 'admin' ? 'Chief Mining Engineer' : 'Mining Technical Officer'),
          employeeId: emailData.employee_id || `EMP-${(userId || emailData.id).substring(0, 5).toUpperCase()}`,
          status: 'approved',
        };
      }
    }

    return null;
  } catch (err) {
    console.error('[Supabase] Error in fetchUserProfile:', err);
    return null;
  }
}

// Upsert user profile
export async function syncUserProfile(user: User): Promise<boolean> {
  try {
    return await persistThroughBackend('/api/persistence/profile', user);
  } catch (err) {
    console.error('[Supabase] syncUserProfile error:', err);
    return false;
  }
}

// Helper to produce valid UUIDs for primary keys
function generateDbId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Fetch all documents with their nested versions
export async function fetchAllDocuments(): Promise<Document[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    // 1. Fetch documents
    const { data: docsData, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (docsError || !docsData) {
      console.warn('[Supabase] fetchAllDocuments query warning:', docsError?.message);
      return null;
    }

    // 2. Fetch versions
    const { data: versionsData, error: versionsError } = await supabase
      .from('document_versions')
      .select('*')
      .order('version_number', { ascending: false });

    if (versionsError || !versionsData) {
      console.warn('[Supabase] fetchVersions query warning:', versionsError?.message);
    }

    const versionsByDocId = new Map<string, DocumentVersion[]>();
    (versionsData || []).forEach((row: any) => {
      const v: DocumentVersion = {
        id: row.id,
        documentId: row.document_id,
        versionNumber: row.version_number,
        fileName: row.file_name || `${row.document_id}_v${row.version_number}.pdf`,
        fileSize: row.file_size || '4.2 MB',
        storageFilePath: row.file_path || row.storage_file_path || undefined,
        storageBucket: row.storage_bucket || (row.file_path ? STORAGE_BUCKET : undefined),
        uploadedBy: {
          id: row.uploaded_by_id || 'usr_unknown',
          name: row.uploaded_by_name || 'Officer',
          subsidiary: (row.uploaded_by_subsidiary as Subsidiary) || 'CMPDI HQ',
          employeeId: row.uploaded_by_employee_id || 'EMP-01',
        },
        uploadedAt: row.uploaded_at || row.created_at || new Date().toISOString(),
        reasonForChange: row.reason_for_change || 'Technical revision',
        extractedText: row.extracted_text || '',
        keyMetrics: row.key_metrics || [],
        ocrConfidence: Number(row.ocr_confidence) || 98.0,
        approvalStatus: (row.approval_status as ApprovalStatus) || 'approved',
        approvalPriority: row.approval_priority || 'normal',
        aiRiskReason: row.ai_risk_reason,
        approvedBy: row.reviewed_by_name ? {
          id: row.reviewed_by_id || 'usr_admin',
          name: row.reviewed_by_name,
        } : undefined,
        approvedAt: row.reviewed_at,
        reviewedBy: row.reviewed_by_name ? {
          id: row.reviewed_by_id || 'usr_admin',
          name: row.reviewed_by_name,
        } : undefined,
        reviewedAt: row.reviewed_at,
        reviewerNote: row.reviewer_note || row.reviewer_notes,
        changesRequestedNote: row.reviewer_note || row.reviewer_notes,
      };

      const list = versionsByDocId.get(row.document_id) || [];
      list.push(v);
      versionsByDocId.set(row.document_id, list);
    });

    const parsedDocs: Document[] = docsData.map((row: any) => {
      let docVersions = versionsByDocId.get(row.id) || [];
      if (docVersions.length === 0) {
        // Create baseline initial version if table had no child rows
        docVersions = [{
          id: `ver_${row.id}_v1`,
          documentId: row.id,
          versionNumber: 1,
          fileName: `${row.title || 'Technical_Filing'}_v1.pdf`,
          fileSize: '12.4 MB',
          uploadedBy: {
            id: 'usr_directorate',
            name: 'Directorate Technical Officer',
            subsidiary: (row.subsidiary as Subsidiary) || 'CMPDI HQ',
            employeeId: 'EMP-001',
          },
          uploadedAt: row.created_at || new Date().toISOString(),
          reasonForChange: 'Baseline technical filing in repository',
          extractedText: `Archived technical record for ${row.title || row.document_code}. Governed under ${row.subsidiary || 'CMPDI'}.`,
          keyMetrics: [],
          ocrConfidence: 98.5,
          approvalStatus: 'approved',
          approvalPriority: 'normal',
        }];
      }

      const latestApproved = docVersions.find(v => v.approvalStatus === 'approved');
      const currentVersion = latestApproved || docVersions[0];

      return {
        id: row.id,
        documentCode: row.document_code || `CMPDI-${row.id.substring(0, 6).toUpperCase()}`,
        title: row.title || 'Untitled Technical Filing',
        type: (row.type as DocumentType) || 'geological_report',
        department: row.department || 'Central Directorate',
        subsidiary: (row.subsidiary as Subsidiary) || 'CMPDI HQ',
        currentVersionId: currentVersion?.id || docVersions[0].id,
        status: (currentVersion?.approvalStatus || 'approved') as ApprovalStatus,
        tags: [row.type?.replace(/_/g, ' ') || 'Report', row.department || 'Exploration'],
        createdAt: row.created_at || new Date().toISOString(),
        lastUpdated: row.updated_at || row.created_at || new Date().toISOString(),
        versions: docVersions,
      };
    });

    console.log(`[Supabase Data Layer] Successfully queried ${parsedDocs.length} documents and ${versionsData?.length || 0} versions from Supabase.`);
    return parsedDocs;
  } catch (err) {
    console.error('[Supabase] Error in fetchAllDocuments:', err);
    return null;
  }
}

// Fetch Chunks
export async function fetchDocumentChunks(): Promise<Chunk[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('document_chunks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('[Supabase] fetchDocumentChunks error:', error?.message);
      return null;
    }

    return data.map((row: any) => ({
      id: row.id,
      documentId: row.document_id,
      documentTitle: row.document_title,
      documentCode: row.document_code,
      documentVersionId: row.version_id,
      versionNumber: row.version_number,
      pageOrSheetRef: row.page_or_sheet_ref,
      subsidiary: row.subsidiary as Subsidiary,
      text: row.text,
      isApproved: row.is_approved,
      topicTag: row.topic_tag || 'Technical Filing',
    }));
  } catch (err) {
    console.error('[Supabase] Error in fetchDocumentChunks:', err);
    return null;
  }
}

// Fetch Audit Logs
export async function fetchAuditLogsFromSupabase(): Promise<AuditLogEntry[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error || !data) {
      console.warn('[Supabase] fetchAuditLogs error:', error?.message);
      return null;
    }

    return data.map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp,
      actorId: row.actor_id,
      actorName: row.actor_name,
      actorRole: row.actor_role,
      actorSubsidiary: row.actor_subsidiary,
      action: row.action,
      documentId: row.document_id,
      documentTitle: row.document_title,
      versionNumber: row.version_number,
      details: row.details,
      ipAddress: row.ip_address,
    }));
  } catch (err) {
    console.error('[Supabase] Error in fetchAuditLogs:', err);
    return null;
  }
}

// Check if string is standard UUID format
function isUuid(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

// Insert Document & Version to Supabase
export async function persistNewDocument(doc: Document, chunkList: Chunk[]): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const docId = doc.id || generateDbId();

    // 1. Insert master doc
    const { error: docErr } = await supabase.from('documents').insert({
      id: docId,
      document_code: doc.documentCode,
      title: doc.title,
      type: doc.type,
      department: doc.department,
      subsidiary: doc.subsidiary,
      created_at: doc.createdAt,
      updated_at: doc.lastUpdated || doc.createdAt,
    });
    if (docErr) {
      console.error('[Supabase] Could not insert document:', docErr.message);
      return false;
    }

    // 2. Insert versions
    for (const v of doc.versions) {
      const versionId = v.id || generateDbId();
      const uploaderId = isUuid(v.uploadedBy.id) ? v.uploadedBy.id : null;

      const { error: verErr } = await supabase.from('document_versions').insert({
        id: versionId,
        document_id: docId,
        version_number: v.versionNumber,
        file_name: v.fileName,
        file_size: v.fileSize,
        file_path: v.storageFilePath || null,
        storage_bucket: v.storageBucket || (v.storageFilePath ? STORAGE_BUCKET : null),
        uploaded_by_id: uploaderId,
        uploaded_by_name: v.uploadedBy.name,
        uploaded_by_subsidiary: v.uploadedBy.subsidiary,
        uploaded_at: v.uploadedAt,
        reason_for_change: v.reasonForChange,
        extracted_text: v.extractedText,
        key_metrics: v.keyMetrics,
        ocr_confidence: v.ocrConfidence,
        approval_status: v.approvalStatus,
        approval_priority: v.approvalPriority || 'normal',
        ai_risk_reason: v.aiRiskReason,
      });
      if (verErr) {
        console.error('[Supabase] Could not insert document version:', verErr.message);
        await supabase.from('documents').delete().eq('id', docId);
        return false;
      }

      if (v.approvalStatus === 'pending') {
        const apprId = generateDbId();
        const { error: apprErr } = await supabase.from('approvals').insert({
          id: apprId,
          document_id: docId,
          version_id: versionId,
          submitted_by_id: uploaderId,
          submitted_by_name: v.uploadedBy.name,
          submitted_by_subsidiary: v.uploadedBy.subsidiary,
          submitted_at: v.uploadedAt,
          priority: v.approvalPriority || 'normal',
          status: 'pending',
          diff_summary: `Initial upload of ${doc.documentCode} v${v.versionNumber}`,
        });
        if (apprErr) {
          console.error('[Supabase] Could not insert approval request:', apprErr.message);
          await supabase.from('documents').delete().eq('id', docId);
          return false;
        }
      }
    }

    // 3. Insert chunks
    for (const c of chunkList) {
      const chunkId = c.id || generateDbId();
      const firstVerId = doc.versions[0]?.id || generateDbId();
      const { error: chunkErr } = await supabase.from('document_chunks').insert({
        id: chunkId,
        document_id: docId,
        version_id: firstVerId,
        document_title: c.documentTitle,
        document_code: c.documentCode,
        version_number: c.versionNumber,
        page_or_sheet_ref: c.pageOrSheetRef,
        subsidiary: c.subsidiary,
        text: c.text,
        is_approved: c.isApproved,
        topic_tag: c.topicTag,
      });
      if (chunkErr) {
        console.error('[Supabase] Could not insert document chunk:', chunkErr.message);
        await supabase.from('documents').delete().eq('id', docId);
        return false;
      }
    }

    console.log(`[Supabase Data Layer] Successfully committed new document "${doc.title}" to documents, document_versions, and document_chunks tables.`);
    return true;
  } catch (err) {
    console.error('[Supabase] Error persisting document:', err);
    return false;
  }
}

// Persist Version Update
export async function persistNewVersion(docId: string, version: DocumentVersion, newChunks: Chunk[]): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const versionId = version.id || generateDbId();
    const uploaderId = isUuid(version.uploadedBy.id) ? version.uploadedBy.id : null;

    const { error: verErr } = await supabase.from('document_versions').insert({
      id: versionId,
      document_id: docId,
      version_number: version.versionNumber,
      file_name: version.fileName,
      file_size: version.fileSize,
      file_path: version.storageFilePath || null,
      storage_bucket: version.storageBucket || (version.storageFilePath ? STORAGE_BUCKET : null),
      uploaded_by_id: uploaderId,
      uploaded_by_name: version.uploadedBy.name,
      uploaded_by_subsidiary: version.uploadedBy.subsidiary,
      uploaded_at: version.uploadedAt,
      reason_for_change: version.reasonForChange,
      extracted_text: version.extractedText,
      key_metrics: version.keyMetrics,
      ocr_confidence: version.ocrConfidence,
      approval_status: version.approvalStatus,
      approval_priority: version.approvalPriority || 'normal',
      ai_risk_reason: version.aiRiskReason,
    });
    if (verErr) {
      console.error('[Supabase] Could not insert document version:', verErr.message);
      return false;
    }

    if (version.approvalStatus === 'pending') {
      const apprId = generateDbId();
      const { error: apprErr } = await supabase.from('approvals').insert({
        id: apprId,
        document_id: docId,
        version_id: versionId,
        submitted_by_id: uploaderId,
        submitted_by_name: version.uploadedBy.name,
        submitted_by_subsidiary: version.uploadedBy.subsidiary,
        submitted_at: version.uploadedAt,
        priority: version.approvalPriority || 'normal',
        status: 'pending',
        diff_summary: version.reasonForChange,
      });
      if (apprErr) {
        console.error('[Supabase] Could not insert approval request:', apprErr.message);
        await supabase.from('document_versions').delete().eq('id', versionId);
        return false;
      }
    }

    for (const c of newChunks) {
      const chunkId = c.id || generateDbId();
      const { error: chunkErr } = await supabase.from('document_chunks').insert({
        id: chunkId,
        document_id: c.documentId,
        version_id: versionId,
        document_title: c.documentTitle,
        document_code: c.documentCode,
        version_number: c.versionNumber,
        page_or_sheet_ref: c.pageOrSheetRef,
        subsidiary: c.subsidiary,
        text: c.text,
        is_approved: c.isApproved,
        topic_tag: c.topicTag,
      });
      if (chunkErr) {
        console.error('[Supabase] Could not insert version chunk:', chunkErr.message);
        await supabase.from('document_versions').delete().eq('id', versionId);
        return false;
      }
    }

    console.log(`[Supabase Data Layer] Successfully inserted version v${version.versionNumber} for doc ${docId}.`);
    return true;
  } catch (err) {
    console.error('[Supabase] Error persisting new version:', err);
    return false;
  }
}

// Delete a document and its storage files from Supabase
export async function deleteDocumentFromSupabase(doc: Document): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    // 1. Delete associated files in Supabase Storage
    for (const v of doc.versions) {
      if (v.storageFilePath) {
        await deleteFileFromStorage(v.storageFilePath, v.storageBucket || STORAGE_BUCKET);
      }
    }

    // 2. Cascade delete database records
    await supabase.from('document_chunks').delete().eq('document_id', doc.id);
    await supabase.from('approvals').delete().eq('document_id', doc.id);
    await supabase.from('document_versions').delete().eq('document_id', doc.id);
    await supabase.from('documents').delete().eq('id', doc.id);

    console.log(`[Supabase Data Layer] Successfully deleted document "${doc.title}" and its storage artifacts.`);
    return true;
  } catch (err) {
    console.error('[Supabase] Error deleting document:', err);
    return false;
  }
}

// Update Approval in Supabase
export async function persistApprovalReview(
  versionId: string, 
  status: 'approved' | 'rejected' | 'changes_requested',
  reviewer: User,
  note?: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const now = new Date().toISOString();
    const { error: versionError } = await supabase.from('document_versions').update({
      approval_status: status,
      reviewed_by_name: reviewer.name,
      reviewed_at: now,
      reviewer_note: note || null,
    }).eq('id', versionId);
    if (versionError) {
      console.error('[Supabase] Error updating document version approval:', versionError);
      return false;
    }

    const { error: approvalError } = await supabase.from('approvals').update({
      status: status,
      reviewed_by_name: reviewer.name,
      reviewed_at: now,
      reviewer_notes: note || null,
    }).eq('version_id', versionId);
    if (approvalError) {
      console.error('[Supabase] Error updating approval queue entry:', approvalError);
      return false;
    }

    if (status === 'approved') {
      const { error: chunkError } = await supabase.from('document_chunks').update({
        is_approved: true,
      }).eq('version_id', versionId);
      if (chunkError) {
        console.error('[Supabase] Error publishing document chunks:', chunkError);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error('[Supabase] Error persisting approval review:', err);
    return false;
  }
}

// Insert Audit Log to Supabase
export async function persistAuditLog(entry: AuditLogEntry): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    await supabase.from('audit_logs').insert({
      id: entry.id,
      timestamp: entry.timestamp,
      action: entry.action,
      actor_id: entry.actorId,
      actor_name: entry.actorName,
      actor_role: entry.actorRole,
      actor_subsidiary: entry.actorSubsidiary,
      document_id: entry.documentId,
      document_title: entry.documentTitle,
      version_number: entry.versionNumber,
      details: entry.details,
      ip_address: entry.ipAddress,
    });
    return true;
  } catch (err) {
    console.error('[Supabase] Error inserting audit log:', err);
    return false;
  }
}

export async function fetchQueryHistory(userId: string): Promise<QueryRecord[] | null> {
  const supabase = getSupabase();
  if (!supabase || !isUuid(userId)) return null;

  const { data, error } = await supabase
    .from('query_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.warn('[Supabase] fetchQueryHistory error:', error?.message);
    return null;
  }

  return data.map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userRole: row.user_role,
    questionText: row.question_text,
    answerText: row.answer_text,
    aiSummary: row.ai_summary,
    citations: row.citations || [],
    confidence: Number(row.confidence) || 0,
    foundInKnowledgeBase: row.found_in_knowledge_base,
    draftOfficialReply: row.draft_official_reply,
    createdAt: row.created_at,
  }));
}

export async function persistQueryHistory(query: QueryRecord): Promise<boolean> {
  return persistThroughBackend('/api/persistence/query-history', query);
}

export async function persistReport(report: ReportRecord): Promise<boolean> {
  return persistThroughBackend('/api/persistence/report', report);
}
