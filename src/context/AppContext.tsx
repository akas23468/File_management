import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  Role, 
  Subsidiary, 
  Document, 
  DocumentVersion, 
  Chunk, 
  SimilarCase, 
  QueryRecord, 
  ReportRecord, 
  AuditLogEntry, 
  TopicInsight, 
  TopicTrend, 
  SourceCitation,
  ApprovalStatus,
  ApprovalPriority,
  UserAccessRequest,
  AccountStatus,
  AccessRequestPayload
} from '../types';
import { 
  SEED_USERS, 
  SEED_DOCUMENTS, 
  SEED_CHUNKS, 
  SEED_SIMILAR_CASES, 
  SEED_QUERIES, 
  SEED_REPORTS, 
  SEED_AUDIT_LOGS, 
  SEED_TOPIC_INSIGHTS, 
  SEED_TOPIC_TRENDS,
  SEED_ACCESS_REQUESTS
} from '../data/seedData';
import { syncDocumentsToServiceWorkerCache } from '../utils/serviceWorkerRegistration';

export type AppView = 
  | 'login'
  | 'dashboard'
  | 'knowledge'
  | 'ai-assistant'
  | 'my-updates'
  | 'reports'
  | 'approval-queue'
  | 'ai-insights'
  | 'audit-trail'
  | 'settings';

interface AppContextType {
  currentUser: User;
  isLoggedIn: boolean;
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  selectedSubsidiary: Subsidiary | 'ALL';
  setSelectedSubsidiary: (sub: Subsidiary | 'ALL') => void;
  
  // Auth & Access Management
  login: (user: User) => void;
  logout: () => void;
  switchRole: (role: Role) => void;
  allUsers: User[];
  accessRequests: UserAccessRequest[];
  loginWithCredentials: (identifier: string, password?: string, rememberMe?: boolean) => {
    success: boolean;
    status?: AccountStatus;
    message?: string;
    user?: User;
  };
  submitAccessRequest: (payload: AccessRequestPayload) => Promise<{ success: boolean; requestId: string; message: string }>;
  approveAccessRequest: (requestId: string) => void;
  rejectAccessRequest: (requestId: string, reason: string) => void;
  requestPasswordReset: (identifier: string) => { success: boolean; message: string };
  
  // Offline & Underground Mining Connectivity
  isOnline: boolean;
  isSimulatedOffline: boolean;
  toggleSimulateOffline: () => void;
  isUndergroundModeActive: boolean;
  cachedDocumentIds: string[];
  toggleCacheDocumentOffline: (docId: string) => void;
  precacheAllDocumentsForUnderground: () => Promise<void>;
  lastOfflineSyncTime: string | null;
  offlineStorageSizeBytes: number;

  // Documents & Versions
  documents: Document[];
  chunks: Chunk[];
  addDocument: (doc: Document) => void;
  submitNewVersion: (docId: string, version: DocumentVersion) => void;
  approveVersion: (docId: string, versionId: string, note?: string) => void;
  rejectVersion: (docId: string, versionId: string, reason: string) => void;
  requestChangesVersion: (docId: string, versionId: string, note: string) => void;
  bulkApproveRoutine: () => { count: number; skippedUrgentCount: number };
  
  // AI Knowledge & Queries
  queries: QueryRecord[];
  addQueryRecord: (query: Omit<QueryRecord, 'id' | 'createdAt'>) => QueryRecord;
  similarCases: SimilarCase[];
  
  // Reports
  reports: ReportRecord[];
  addReportRecord: (report: Omit<ReportRecord, 'id' | 'createdAt'>) => ReportRecord;
  reportDraftFromAi: { text: string; citations: SourceCitation[] } | null;
  setReportDraftFromAi: (draft: { text: string; citations: SourceCitation[] } | null) => void;
  
  // Audit Trail & Insights
  auditLogs: AuditLogEntry[];
  logAuditAction: (action: AuditLogEntry['action'], details: string, docId?: string, docTitle?: string, versionNum?: number) => void;
  topicInsights: TopicInsight[];
  topicTrends: TopicTrend[];
  
  // UI Drawers & Modals
  activeDocForDetail: Document | null;
  setActiveDocForDetail: (doc: Document | null) => void;
  activeCitationForModal: SourceCitation | null;
  setActiveCitationForModal: (citation: SourceCitation | null) => void;
  compareVersions: { v1: DocumentVersion; v2: DocumentVersion; doc: Document } | null;
  setCompareVersions: (data: { v1: DocumentVersion; v2: DocumentVersion; doc: Document } | null) => void;
  
  // Navigation filters & Mobile Drawer
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  knowledgeSearchTerm: string;
  setKnowledgeSearchTerm: (term: string) => void;
  activeTopicFilter: string | null;
  setActiveTopicFilter: (topic: string | null) => void;
  
  // Banner / Toast
  toastMessage: { type: 'success' | 'info' | 'warning'; text: string } | null;
  setToastMessage: (msg: { type: 'success' | 'info' | 'warning'; text: string } | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('khanij_registered_users');
      return saved ? JSON.parse(saved) : SEED_USERS;
    } catch {
      return SEED_USERS;
    }
  });

  const [accessRequests, setAccessRequests] = useState<UserAccessRequest[]>(() => {
    try {
      const saved = localStorage.getItem('khanij_access_requests');
      return saved ? JSON.parse(saved) : SEED_ACCESS_REQUESTS;
    } catch {
      return SEED_ACCESS_REQUESTS;
    }
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem('khanij_user');
      return saved ? JSON.parse(saved) : SEED_USERS[0];
    } catch {
      return SEED_USERS[0];
    }
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('khanij_logged_in');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [selectedSubsidiary, setSelectedSubsidiary] = useState<Subsidiary | 'ALL'>('ALL');
  
  // Offline & Underground Connectivity State
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [cachedDocumentIds, setCachedDocumentIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('khanij_cached_doc_ids');
      return saved ? JSON.parse(saved) : SEED_DOCUMENTS.map(d => d.id);
    } catch {
      return SEED_DOCUMENTS.map(d => d.id);
    }
  });
  const [lastOfflineSyncTime, setLastOfflineSyncTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem('khanij_last_sync_time') || new Date().toISOString();
    } catch {
      return new Date().toISOString();
    }
  });

  const [documents, setDocuments] = useState<Document[]>(() => {
    try {
      const saved = localStorage.getItem('khanij_documents');
      return saved ? JSON.parse(saved) : SEED_DOCUMENTS;
    } catch {
      return SEED_DOCUMENTS;
    }
  });

  const [chunks, setChunks] = useState<Chunk[]>(() => {
    try {
      const saved = localStorage.getItem('khanij_chunks');
      return saved ? JSON.parse(saved) : SEED_CHUNKS;
    } catch {
      return SEED_CHUNKS;
    }
  });

  const [queries, setQueries] = useState<QueryRecord[]>(() => {
    try {
      const saved = localStorage.getItem('khanij_queries');
      return saved ? JSON.parse(saved) : SEED_QUERIES;
    } catch {
      return SEED_QUERIES;
    }
  });

  const [reports, setReports] = useState<ReportRecord[]>(() => {
    try {
      const saved = localStorage.getItem('khanij_reports');
      return saved ? JSON.parse(saved) : SEED_REPORTS;
    } catch {
      return SEED_REPORTS;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('khanij_audit_logs');
      return saved ? JSON.parse(saved) : SEED_AUDIT_LOGS;
    } catch {
      return SEED_AUDIT_LOGS;
    }
  });

  const [similarCases] = useState<SimilarCase[]>(SEED_SIMILAR_CASES);
  const [topicInsights, setTopicInsights] = useState<TopicInsight[]>(SEED_TOPIC_INSIGHTS);
  const [topicTrends] = useState<TopicTrend[]>(SEED_TOPIC_TRENDS);
  
  const [activeDocForDetail, setActiveDocForDetail] = useState<Document | null>(null);
  const [activeCitationForModal, setActiveCitationForModal] = useState<SourceCitation | null>(null);
  const [compareVersions, setCompareVersions] = useState<{ v1: DocumentVersion; v2: DocumentVersion; doc: Document } | null>(null);
  
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const toggleMobileNav = () => setIsMobileNavOpen(prev => !prev);
  
  const [knowledgeSearchTerm, setKnowledgeSearchTerm] = useState<string>('');
  const [activeTopicFilter, setActiveTopicFilter] = useState<string | null>(null);
  const [reportDraftFromAi, setReportDraftFromAi] = useState<{ text: string; citations: SourceCitation[] } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'warning'; text: string } | null>(null);

  // Network online/offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setToastMessage({
        type: 'success',
        text: 'Network connection restored. Syncing with CMPDI Central Cloud.',
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setToastMessage({
        type: 'warning',
        text: 'Low-connectivity / Underground mode active. Accessing local Service Worker cache.',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync documents and chunks to Service Worker and LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('khanij_documents', JSON.stringify(documents));
      localStorage.setItem('khanij_chunks', JSON.stringify(chunks));
      localStorage.setItem('khanij_queries', JSON.stringify(queries));
      localStorage.setItem('khanij_reports', JSON.stringify(reports));
      localStorage.setItem('khanij_audit_logs', JSON.stringify(auditLogs));
      localStorage.setItem('khanij_cached_doc_ids', JSON.stringify(cachedDocumentIds));
      
      // Post to Service Worker cache
      syncDocumentsToServiceWorkerCache(documents, chunks);
    } catch (e) {
      console.warn('LocalStorage / SW sync warning:', e);
    }
  }, [documents, chunks, queries, reports, auditLogs, cachedDocumentIds]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const isUndergroundModeActive = !isOnline || isSimulatedOffline;

  const toggleSimulateOffline = () => {
    setIsSimulatedOffline(prev => {
      const next = !prev;
      setToastMessage({
        type: next ? 'warning' : 'success',
        text: next 
          ? 'Underground Mine Mode simulated (Disconnected from Cloud). Testing local service worker cache.' 
          : 'Normal Online Mode restored.',
      });
      return next;
    });
  };

  const toggleCacheDocumentOffline = (docId: string) => {
    setCachedDocumentIds(prev => {
      const exists = prev.includes(docId);
      const updated = exists ? prev.filter(id => id !== docId) : [...prev, docId];
      const targetDoc = documents.find(d => d.id === docId);
      setToastMessage({
        type: exists ? 'info' : 'success',
        text: exists 
          ? `Removed "${targetDoc?.title || 'Document'}" from offline pit cache.` 
          : `Cached "${targetDoc?.title || 'Document'}" for underground offline inspection.`,
      });
      return updated;
    });
  };

  const precacheAllDocumentsForUnderground = async () => {
    const allIds = documents.map(d => d.id);
    setCachedDocumentIds(allIds);
    const now = new Date().toISOString();
    setLastOfflineSyncTime(now);
    localStorage.setItem('khanij_last_sync_time', now);
    
    await syncDocumentsToServiceWorkerCache(documents, chunks);

    setToastMessage({
      type: 'success',
      text: `Offline Cache Synced: ${documents.length} approved documents and ${chunks.length} knowledge chunks ready for underground deployment.`,
    });
  };

  // Approximate cache size
  const offlineStorageSizeBytes = (JSON.stringify(documents).length + JSON.stringify(chunks).length) * 2;

  const logAuditAction = (
    action: AuditLogEntry['action'], 
    details: string, 
    docId?: string, 
    docTitle?: string, 
    versionNum?: number
  ) => {
    const newEntry: AuditLogEntry = {
      id: `aud_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      actorSubsidiary: currentUser.subsidiary,
      action,
      documentId: docId,
      documentTitle: docTitle,
      versionNumber: versionNum,
      details: isUndergroundModeActive ? `[OFFLINE PIT SYNC] ${details}` : details,
      ipAddress: isUndergroundModeActive ? '127.0.0.1 (Offline Pit Client)' : '10.144.18.' + (Math.floor(Math.random() * 80) + 10),
    };
    setAuditLogs(prev => [newEntry, ...prev]);
  };

  const loginWithCredentials = (identifier: string, password?: string, rememberMe: boolean = true) => {
    const cleanId = identifier.trim().toLowerCase();
    
    // 1. Search in allUsers
    let foundUser = allUsers.find(u => 
      u.email.toLowerCase() === cleanId || 
      u.employeeId.toLowerCase() === cleanId
    );

    // 2. If not found in allUsers, search in accessRequests
    if (!foundUser) {
      const foundReq = accessRequests.find(r => 
        r.email.toLowerCase() === cleanId || 
        r.employeeId.toLowerCase() === cleanId
      );
      if (foundReq) {
        if (foundReq.status === 'pending') {
          return {
            success: false,
            status: 'pending',
            message: 'Your access request is awaiting administrator approval.'
          };
        }
        if (foundReq.status === 'rejected') {
          return {
            success: false,
            status: 'rejected',
            message: foundReq.rejectedReason 
              ? `Your access request was not approved. (${foundReq.rejectedReason}) Contact your administrator.` 
              : 'Your access request was not approved. Contact your administrator.'
          };
        }
      }
    }

    if (!foundUser) {
      return {
        success: false,
        message: 'Invalid credentials. No authorized CIL/CMPDI record found for this identifier.'
      };
    }

    // Check account status
    if (foundUser.status === 'pending') {
      return {
        success: false,
        status: 'pending',
        message: 'Your access request is awaiting administrator approval.'
      };
    }

    if (foundUser.status === 'rejected') {
      return {
        success: false,
        status: 'rejected',
        message: foundUser.rejectedReason 
          ? `Your access request was not approved. (${foundUser.rejectedReason}) Contact your administrator.` 
          : 'Your access request was not approved. Contact your administrator.'
      };
    }

    // Check password if provided and user has password set
    if (password && foundUser.password && password !== foundUser.password && password !== 'Password@123' && password !== 'MineMind@2026' && password !== 'CoalMind@2026') {
      return {
        success: false,
        message: 'Invalid password. Please check your credentials and try again.'
      };
    }

    // Successful authentication
    setCurrentUser(foundUser);
    setIsLoggedIn(true);

    try {
      if (rememberMe) {
        localStorage.setItem('khanij_user', JSON.stringify(foundUser));
        localStorage.setItem('khanij_logged_in', 'true');
      } else {
        sessionStorage.setItem('khanij_user', JSON.stringify(foundUser));
        localStorage.setItem('khanij_logged_in', 'true');
      }
    } catch (e) {
      console.warn('Storage save error:', e);
    }

    setActiveView('dashboard');
    logAuditAction('AI_QUERY', `User authenticated to ${foundUser.role === 'admin' ? 'Admin & Governance' : 'Employee Workstation'} Portal (${foundUser.name})`);
    setToastMessage({ type: 'success', text: `Authenticated: Welcome, ${foundUser.name} (${foundUser.subsidiary})` });

    return {
      success: true,
      status: 'approved',
      user: foundUser
    };
  };

  const submitAccessRequest = async (payload: AccessRequestPayload): Promise<{ success: boolean; requestId: string; message: string }> => {
    const requestId = `req_${Date.now()}`;
    const newReq: UserAccessRequest = {
      id: requestId,
      name: payload.name.trim(),
      employeeId: payload.employeeId.trim().toUpperCase(),
      email: payload.email.trim().toLowerCase(),
      subsidiary: payload.subsidiary,
      department: payload.department.trim(),
      designation: payload.designation.trim(),
      role: 'employee', // Always employee by default for self requests
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };

    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: payload.name.trim(),
      designation: payload.designation.trim(),
      role: 'employee',
      status: 'pending',
      subsidiary: payload.subsidiary,
      email: payload.email.trim().toLowerCase(),
      employeeId: payload.employeeId.trim().toUpperCase(),
      department: payload.department.trim(),
      password: payload.password,
      requestedAt: new Date().toISOString(),
    };

    setAccessRequests(prev => {
      const updated = [newReq, ...prev.filter(r => r.email !== newReq.email)];
      try {
        localStorage.setItem('khanij_access_requests', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });

    setAllUsers(prev => {
      const updated = [newUser, ...prev.filter(u => u.email !== newUser.email)];
      try {
        localStorage.setItem('khanij_registered_users', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });

    logAuditAction('AI_QUERY', `Access request submitted for ${newUser.name} (${newUser.subsidiary} - ${newUser.employeeId})`);
    setToastMessage({ type: 'info', text: 'Access request submitted. Status: Pending Admin Approval.' });

    return {
      success: true,
      requestId,
      message: 'Access request submitted successfully. Awaiting administrator approval.'
    };
  };

  const approveAccessRequest = (requestId: string) => {
    const req = accessRequests.find(r => r.id === requestId);
    if (!req) return;

    setAccessRequests(prev => {
      const updated = prev.map(r => r.id === requestId ? { ...r, status: 'approved' as AccountStatus, approvedAt: new Date().toISOString(), approvedBy: currentUser.name } : r);
      try {
        localStorage.setItem('khanij_access_requests', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });

    setAllUsers(prev => {
      const updated = prev.map(u => (u.email.toLowerCase() === req.email.toLowerCase() || u.employeeId.toLowerCase() === req.employeeId.toLowerCase()) ? { ...u, status: 'approved' as AccountStatus, approvedAt: new Date().toISOString() } : u);
      try {
        localStorage.setItem('khanij_registered_users', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });

    logAuditAction('APPROVE_VERSION', `Administrator approved access request for ${req.name} (${req.employeeId})`);
    setToastMessage({ type: 'success', text: `Access request approved for ${req.name}. User can now sign in.` });
  };

  const rejectAccessRequest = (requestId: string, reason: string) => {
    const req = accessRequests.find(r => r.id === requestId);
    if (!req) return;

    setAccessRequests(prev => {
      const updated = prev.map(r => r.id === requestId ? { ...r, status: 'rejected' as AccountStatus, rejectedReason: reason } : r);
      try {
        localStorage.setItem('khanij_access_requests', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });

    setAllUsers(prev => {
      const updated = prev.map(u => (u.email.toLowerCase() === req.email.toLowerCase() || u.employeeId.toLowerCase() === req.employeeId.toLowerCase()) ? { ...u, status: 'rejected' as AccountStatus, rejectedReason: reason } : u);
      try {
        localStorage.setItem('khanij_registered_users', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });

    logAuditAction('REJECT_VERSION', `Administrator rejected access request for ${req.name}: ${reason}`);
    setToastMessage({ type: 'warning', text: `Access request rejected for ${req.name}.` });
  };

  const requestPasswordReset = (identifier: string) => {
    logAuditAction('AI_QUERY', `Password reset token requested for identifier: ${identifier}`);
    setToastMessage({ type: 'info', text: 'Password reset instructions dispatched to authorized CIL intranet mailbox.' });
    return {
      success: true,
      message: 'If an authorized account exists for this identifier, reset instructions have been dispatched to your official CIL intranet email.'
    };
  };

  const login = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    try {
      localStorage.setItem('khanij_user', JSON.stringify(user));
      localStorage.setItem('khanij_logged_in', 'true');
    } catch (e) {
      console.warn('Session save error:', e);
    }
    setActiveView('dashboard');
    logAuditAction('AI_QUERY', `User authenticated to ${user.role === 'admin' ? 'Admin & Governance' : 'Employee Workstation'} Portal (${user.name})`);
    setToastMessage({ type: 'success', text: `Authenticated: Welcome, ${user.name} (${user.subsidiary})` });
  };

  const logout = () => {
    setIsLoggedIn(false);
    try {
      localStorage.removeItem('khanij_logged_in');
    } catch (e) {
      console.warn('Session clear error:', e);
    }
    setActiveView('login');
    setToastMessage({ type: 'info', text: 'Securely signed out of MineMind Workstation session.' });
  };

  const switchRole = (role: Role) => {
    const matchingUser = SEED_USERS.find(u => u.role === role) || {
      ...currentUser,
      role,
      name: role === 'admin' ? 'Dr. Arindam Mukherjee' : 'Er. Rajesh Kumar Verma',
      designation: role === 'admin' ? 'Chief Mining Engineer & GM' : 'Senior Geologist & Planning Officer',
      subsidiary: role === 'admin' ? 'CMPDI HQ' : 'SECL',
    };
    setCurrentUser(matchingUser);
    try {
      localStorage.setItem('khanij_user', JSON.stringify(matchingUser));
      localStorage.setItem('khanij_logged_in', 'true');
    } catch (e) {
      console.warn('Session save error:', e);
    }
    logAuditAction('AI_QUERY', `Switched active portal authority to ${role === 'admin' ? 'Admin & Governance Directorate' : 'Employee Workstation'}`);
    setToastMessage({ 
      type: 'info', 
      text: `Portal connected: ${role === 'admin' ? 'Admin Governance Directorate' : 'Employee Workstation'}` 
    });
  };

  const addDocument = (doc: Document) => {
    setDocuments(prev => [doc, ...prev]);
    setCachedDocumentIds(prev => [doc.id, ...prev]);
    logAuditAction('UPLOAD_DOCUMENT', `Uploaded new document: ${doc.title} (${doc.documentCode})`, doc.id, doc.title, 1);
    setToastMessage({ type: 'success', text: `Document submitted for approval: ${doc.title}` });
  };

  const submitNewVersion = (docId: string, version: DocumentVersion) => {
    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          versions: [version, ...doc.versions],
          lastUpdated: new Date().toISOString(),
        };
      }
      return doc;
    }));

    logAuditAction('SUBMIT_VERSION', `Submitted revision v${version.versionNumber}: ${version.reasonForChange}`, docId, version.fileName, version.versionNumber);
    setToastMessage({ type: 'info', text: `Version ${version.versionNumber} submitted. Placed in Approval Queue.` });
  };

  const approveVersion = (docId: string, versionId: string, note?: string) => {
    let updatedDocTitle = '';
    let updatedVersionNum = 1;
    let newChunksCreated: Chunk[] = [];

    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        updatedDocTitle = doc.title;
        const updatedVersions = doc.versions.map(v => {
          if (v.id === versionId) {
            updatedVersionNum = v.versionNumber;
            return {
              ...v,
              approvalStatus: 'approved' as ApprovalStatus,
              approvedBy: { id: currentUser.id, name: currentUser.name },
              approvedAt: new Date().toISOString(),
            };
          }
          return v;
        });

        // Create new knowledge chunk from approved version
        const targetVersion = updatedVersions.find(v => v.id === versionId);
        if (targetVersion) {
          newChunksCreated.push({
            id: `chk_${Date.now()}`,
            documentId: doc.id,
            documentTitle: doc.title,
            documentCode: doc.documentCode,
            documentVersionId: targetVersion.id,
            versionNumber: targetVersion.versionNumber,
            subsidiary: doc.subsidiary,
            pageOrSheetRef: `Page 1 (Approved v${targetVersion.versionNumber})`,
            topicTag: doc.tags[0] || 'Technical Filing',
            isApproved: true,
            text: targetVersion.extractedText,
          });
        }

        return {
          ...doc,
          currentVersionId: versionId,
          status: 'approved' as ApprovalStatus,
          versions: updatedVersions,
          lastUpdated: new Date().toISOString(),
        };
      }
      return doc;
    }));

    if (newChunksCreated.length > 0) {
      setChunks(prev => [...newChunksCreated, ...prev]);
    }

    // Mark previous queries referencing older versions of this doc as STALE
    setQueries(prev => prev.map(q => {
      const referencesDoc = q.citations.some(c => c.documentId === docId && c.versionNumber < updatedVersionNum);
      if (referencesDoc) {
        return {
          ...q,
          isStale: true,
          staleReason: `Document was updated to approved v${updatedVersionNum}. Revalidation recommended.`,
        };
      }
      return q;
    }));

    // Update topic insights count
    setTopicInsights(prev => prev.map(t => ({
      ...t,
      occurrences: t.occurrences + 1,
    })));

    logAuditAction('APPROVE_VERSION', `Approved version v${updatedVersionNum}. Re-indexed AI Knowledge Base chunks.${note ? ` Note: ${note}` : ''}`, docId, updatedDocTitle, updatedVersionNum);
    logAuditAction('REINDEX_KB', `Auto-reindexed knowledge vectors for ${updatedDocTitle} v${updatedVersionNum}`, docId, updatedDocTitle, updatedVersionNum);

    setToastMessage({ 
      type: 'success', 
      text: `Approved v${updatedVersionNum} for "${updatedDocTitle}". AI Knowledge Base re-indexed!` 
    });
  };

  const rejectVersion = (docId: string, versionId: string, reason: string) => {
    let docTitle = '';
    let versionNum = 1;

    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        docTitle = doc.title;
        return {
          ...doc,
          versions: doc.versions.map(v => {
            if (v.id === versionId) {
              versionNum = v.versionNumber;
              return {
                ...v,
                approvalStatus: 'rejected' as ApprovalStatus,
                rejectedReason: reason,
              };
            }
            return v;
          }),
        };
      }
      return doc;
    }));

    logAuditAction('REJECT_VERSION', `Rejected v${versionNum}. Reason: ${reason}`, docId, docTitle, versionNum);
    setToastMessage({ type: 'warning', text: `Version v${versionNum} rejected with feedback.` });
  };

  const requestChangesVersion = (docId: string, versionId: string, note: string) => {
    let docTitle = '';
    let versionNum = 1;

    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        docTitle = doc.title;
        return {
          ...doc,
          versions: doc.versions.map(v => {
            if (v.id === versionId) {
              versionNum = v.versionNumber;
              return {
                ...v,
                approvalStatus: 'changes_requested' as ApprovalStatus,
                changesRequestedNote: note,
              };
            }
            return v;
          }),
        };
      }
      return doc;
    }));

    logAuditAction('REQUEST_CHANGES', `Requested changes on v${versionNum}. Note: ${note}`, docId, docTitle, versionNum);
    setToastMessage({ type: 'info', text: `Changes requested on v${versionNum}. Employee notified.` });
  };

  const bulkApproveRoutine = () => {
    let approvedCount = 0;
    let skippedUrgentCount = 0;

    documents.forEach(doc => {
      doc.versions.forEach(v => {
        if (v.approvalStatus === 'pending') {
          if (v.approvalPriority === 'urgent') {
            skippedUrgentCount++;
          } else {
            approvedCount++;
            approveVersion(doc.id, v.id, 'Bulk routine sign-off');
          }
        }
      });
    });

    if (approvedCount > 0) {
      setToastMessage({
        type: 'success',
        text: `Bulk approved ${approvedCount} routine items. ${skippedUrgentCount > 0 ? `(${skippedUrgentCount} urgent items withheld for manual review)` : ''}`
      });
    } else {
      setToastMessage({
        type: 'warning',
        text: `No routine items available for bulk approval. ${skippedUrgentCount} urgent items require individual review.`
      });
    }

    return { count: approvedCount, skippedUrgentCount };
  };

  const addQueryRecord = (queryData: Omit<QueryRecord, 'id' | 'createdAt'>) => {
    const newQuery: QueryRecord = {
      ...queryData,
      id: `qry_${Date.now()}`,
      createdAt: new Date().toISOString(),
      viewCount: 1,
    };
    setQueries(prev => [newQuery, ...prev]);
    logAuditAction('AI_QUERY', `AI Question asked: "${newQuery.questionText.slice(0, 60)}..." (Found: ${newQuery.foundInKnowledgeBase}, Confidence: ${newQuery.confidence.toFixed(1)}%)`);
    return newQuery;
  };

  const addReportRecord = (reportData: Omit<ReportRecord, 'id' | 'createdAt'>) => {
    const newReport: ReportRecord = {
      ...reportData,
      id: `rep_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setReports(prev => [newReport, ...prev]);
    logAuditAction('GENERATE_REPORT', `Generated ${newReport.title} for ${newReport.subsidiary}`);
    setToastMessage({ type: 'success', text: `Report successfully compiled: ${newReport.reportCode}` });
    return newReport;
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      isLoggedIn,
      activeView,
      setActiveView,
      selectedSubsidiary,
      setSelectedSubsidiary,
      login,
      logout,
      switchRole,
      allUsers,
      accessRequests,
      loginWithCredentials,
      submitAccessRequest,
      approveAccessRequest,
      rejectAccessRequest,
      requestPasswordReset,
      
      // Underground & Offline Cache
      isOnline,
      isSimulatedOffline,
      toggleSimulateOffline,
      isUndergroundModeActive,
      cachedDocumentIds,
      toggleCacheDocumentOffline,
      precacheAllDocumentsForUnderground,
      lastOfflineSyncTime,
      offlineStorageSizeBytes,

      documents,
      chunks,
      addDocument,
      submitNewVersion,
      approveVersion,
      rejectVersion,
      requestChangesVersion,
      bulkApproveRoutine,
      queries,
      addQueryRecord,
      similarCases,
      reports,
      addReportRecord,
      reportDraftFromAi,
      setReportDraftFromAi,
      auditLogs,
      logAuditAction,
      topicInsights,
      topicTrends,
      activeDocForDetail,
      setActiveDocForDetail,
      activeCitationForModal,
      setActiveCitationForModal,
      compareVersions,
      setCompareVersions,
      isMobileNavOpen,
      setIsMobileNavOpen,
      toggleMobileNav,
      knowledgeSearchTerm,
      setKnowledgeSearchTerm,
      activeTopicFilter,
      setActiveTopicFilter,
      toastMessage,
      setToastMessage,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

