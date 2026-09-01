export type Role = 'employee' | 'admin';

export type AccountStatus = 'approved' | 'pending' | 'rejected';

export type Subsidiary = 
  | 'CMPDI HQ'
  | 'BCCL' // Bharat Coking Coal Limited (Dhanbad)
  | 'SECL' // South Eastern Coalfields Limited (Bilaspur)
  | 'NCL'  // Northern Coalfields Limited (Singrauli)
  | 'CCL'  // Central Coalfields Limited (Ranchi)
  | 'ECL'  // Eastern Coalfields Limited (Sanctoria)
  | 'WCL'  // Western Coalfields Limited (Nagpur)
  | 'MCL'; // Mahanadi Coalfields Limited (Sambalpur)

export interface User {
  id: string;
  name: string;
  designation: string;
  role: Role;
  subsidiary: Subsidiary;
  email: string;
  employeeId: string;
  department: string;
  status?: AccountStatus;
  password?: string;
  requestedAt?: string;
  approvedAt?: string;
  rejectedReason?: string;
  phone?: string;
}

export interface AccessRequestPayload {
  name: string;
  employeeId: string;
  email: string;
  subsidiary: Subsidiary;
  department: string;
  designation: string;
  password: string;
}

export interface UserAccessRequest {
  id: string;
  name: string;
  employeeId: string;
  email: string;
  subsidiary: Subsidiary;
  department: string;
  designation: string;
  role: Role;
  status: AccountStatus;
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedReason?: string;
}

export type DocumentType = 'geological_report' | 'safety_sop' | 'production_sheet' | 'environmental_audit' | 'mine_plan';

export type ApprovalStatus = 'approved' | 'pending' | 'changes_requested' | 'rejected';

export type ApprovalPriority = 'urgent' | 'normal' | 'routine';

export interface ExtractedTable {
  id: string;
  sheetName?: string;
  headers: string[];
  rows: (string | number)[][];
  summary?: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number; // e.g. 1, 2, 3
  fileUrl?: string;
  storageFilePath?: string;
  storageBucket?: string;
  fileName: string;
  fileSize: string;
  reasonForChange: string;
  uploadedBy: {
    id: string;
    name: string;
    employeeId: string;
    subsidiary: Subsidiary;
  };
  uploadedAt: string;
  approvalStatus: ApprovalStatus;
  approvalPriority?: ApprovalPriority;
  aiRiskReason?: string; // AI explanation of why this update is flagged
  approvedBy?: {
    id: string;
    name: string;
  };
  approvedAt?: string;
  reviewedBy?: {
    id: string;
    name: string;
  };
  reviewedAt?: string;
  reviewerNote?: string;
  rejectedReason?: string;
  changesRequestedNote?: string;
  extractedText: string;
  extractedTables?: ExtractedTable[];
  ocrConfidence: number; // 0-100
  keyMetrics?: { label: string; value: string; variance?: string }[];
}

export interface Document {
  id: string;
  title: string;
  documentCode: string; // e.g. CMPDI/GEO/2024/082
  subsidiary: Subsidiary;
  type: DocumentType;
  department: string;
  currentVersionId: string;
  versions: DocumentVersion[];
  tags: string[];
  status: ApprovalStatus;
  createdAt: string;
  lastUpdated: string;
  isConfidential?: boolean;
}

export interface Chunk {
  id: string;
  documentId: string;
  documentTitle: string;
  documentCode: string;
  documentVersionId: string;
  versionNumber: number;
  subsidiary: Subsidiary;
  pageOrSheetRef: string; // e.g. "Page 14, Section 3.2" or "Sheet 'Seam_XII_Data', Row 18-24"
  text: string;
  isApproved: boolean;
  topicTag: string;
}

export interface SourceCitation {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  documentCode: string;
  versionNumber: number;
  pageOrSheetRef: string;
  excerpt: string;
  relevanceScore: number;
  subsidiary: Subsidiary;
}

export interface SimilarCase {
  id: string;
  topic: string;
  title: string;
  year: number;
  subsidiary: Subsidiary;
  confidence: number; // 0-100
  outcome: string;
  summary: string;
  referenceDocCode: string;
  tags: string[];
  issueDescription?: string;
  resolution?: string;
  sourceDocName?: string;
  sourcePageRef?: string;
  keyTakeaway?: string;
}

export interface QueryRecord {
  id: string;
  userId?: string;
  userName?: string;
  userRole?: Role;
  questionText: string;
  answerText: string;
  aiSummary?: string;
  citations: SourceCitation[];
  confidence: number;
  foundInKnowledgeBase: boolean;
  isStale?: boolean; // When the underlying document version was upgraded
  staleReason?: string;
  draftOfficialReply?: string;
  draftReply?: string;
  createdAt: string;
  viewCount?: number;
}

export type ReportType = 
  | 'production_variance'
  | 'reserve_assessment'
  | 'compliance_brief'
  | 'safety_memo'
  | 'monthly_production_variance'
  | 'geological_reserve_audit'
  | 'mine_safety_compliance'
  | 'dgms_statutory_brief'
  | 'environmental_clearance_status';

export interface ReportRecord {
  id: string;
  title: string;
  reportCode: string;
  type: ReportType;
  period: string; // e.g. "Q3 FY 2024-25"
  subsidiary: Subsidiary | 'ALL';
  generatedBy: {
    id: string;
    name: string;
    role: Role;
  };
  sourceDocuments?: {
    id: string;
    title: string;
    versionNumber: number;
    pageOrSheetRef: string;
  }[];
  content: string;
  summary?: string;
  summaryExecutive?: string;
  tables?: ExtractedTable[];
  citations: SourceCitation[];
  numberedSources?: SourceCitation[]; // ordered (SOURCE n) map used for inline clickable citations
  status?: 'draft' | 'submitted_to_admin' | 'verified_official';
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  actorSubsidiary: Subsidiary;
  action: 'UPLOAD_DOCUMENT' | 'SUBMIT_VERSION' | 'APPROVE_VERSION' | 'REJECT_VERSION' | 'REQUEST_CHANGES' | 'GENERATE_REPORT' | 'AI_QUERY' | 'EXPORT_AUDIT' | 'REINDEX_KB';
  documentId?: string;
  documentTitle?: string;
  versionNumber?: number;
  details: string;
  ipAddress?: string;
}

export interface TopicInsight {
  topic: string;
  occurrences: number;
  sentiment: 'favorable' | 'neutral' | 'critical';
  confidence: number;
  subsidiaries: Subsidiary[];
  relatedDocsCount: number;
}

export interface TopicTrend {
  month: string;
  boreholeData: number;
  slopeStability: number;
  groundwater: number;
  dgmsCompliance: number;
  inundationAnomaly?: boolean;
}
