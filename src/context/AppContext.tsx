import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
import { getSupabase, isSupabaseConfigured } from '../supabaseClient';
import { 
  fetchUserProfile, 
  syncUserProfile, 
  fetchAllDocuments, 
  fetchDocumentChunks, 
  fetchAuditLogsFromSupabase,
  persistNewDocument,
  persistNewVersion,
  deleteDocumentFromSupabase,
  persistApprovalReview,
  persistAuditLog
} from '../services/supabaseDataService';

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
  loginWithCredentials: (identifier: string, password?: string, rememberMe?: boolean) => Promise<{
    success: boolean;
    status?: AccountStatus;
    message?: string;
    user?: User;
  }>;
  submitAccessRequest: (payload: AccessRequestPayload) => Promise<{
    success: boolean;
    requestId: string;
    message: string;
    requiresEmailConfirmation?: boolean;
  }>;
  approveAccessRequest: (requestId: string) => void;
  rejectAccessRequest: (requestId: string, reason: string) => void;
  requestPasswordReset: (identifier: string) => Promise<{ success: boolean; message: string }>;
  
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
  addDocument: (doc: Document) => Promise<void>;
  submitNewVersion: (docId: string, version: DocumentVersion) => Promise<void>;
  deleteDocument: (docId: string) => Promise<void>;
  approveVersion: (docId: string, versionId: string, note?: string) => Promise<void>;
  rejectVersion: (docId: string, versionId: string, reason: string) => Promise<void>;
  requestChangesVersion: (docId: string, versionId: string, note: string) => Promise<void>;
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
      const isPersistent = typeof window !== 'undefined' && localStorage.getItem('khanij_remember_me') === 'true';
      const saved = isPersistent 
        ? localStorage.getItem('khanij_user') 
        : (typeof window !== 'undefined' ? sessionStorage.getItem('khanij_user') : null);
      return saved ? JSON.parse(saved) : SEED_USERS[0];
    } catch {
      return SEED_USERS[0];
    }
  });

  // Strict requirement: Default to unauthenticated unless explicitly remembered
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return false;
      const isPersistent = localStorage.getItem('khanij_remember_me') === 'true';
      if (isPersistent) {
        return localStorage.getItem('khanij_logged_in') === 'true';
      }
      return sessionStorage.getItem('khanij_logged_in') === 'true';
    } catch {
      return false;
    }
  });

  const [activeView, setActiveView] = useState<AppView>(() => {
    try {
      if (typeof window === 'undefined') return 'login';
      const isPersistent = localStorage.getItem('khanij_remember_me') === 'true';
      const isLogged = isPersistent 
        ? localStorage.getItem('khanij_logged_in') === 'true' 
        : sessionStorage.getItem('khanij_logged_in') === 'true';
      return isLogged ? 'dashboard' : 'login';
    } catch {
      return 'login';
    }
  });
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

  // Load live data from Supabase if available
  const reloadFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const client = getSupabase();
    if (!client) return;

    try {
      const [remoteDocs, remoteChunks, remoteAudit] = await Promise.all([
        fetchAllDocuments(),
        fetchDocumentChunks(),
        fetchAuditLogsFromSupabase(),
      ]);

      if (remoteDocs !== null && remoteDocs.length > 0) {
        setDocuments(remoteDocs);
        localStorage.setItem('khanij_documents', JSON.stringify(remoteDocs));
        console.log(`[Supabase Live Database] Loaded ${remoteDocs.length} real documents into application state.`);
      }
      if (remoteChunks !== null && remoteChunks.length > 0) {
        setChunks(remoteChunks);
        localStorage.setItem('khanij_chunks', JSON.stringify(remoteChunks));
      }
      if (remoteAudit !== null && remoteAudit.length > 0) {
        setAuditLogs(remoteAudit);
        localStorage.setItem('khanij_audit_logs', JSON.stringify(remoteAudit));
      }
    } catch (err) {
      console.warn('[Supabase] Data sync notice:', err);
    }
  }, []);

  // Sync with Supabase on initial application boot
  useEffect(() => {
    reloadFromSupabase();
  }, [reloadFromSupabase]);

  // Supabase Auth Session Listener & Real-time Boot Check
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const client = getSupabase();
    if (!client) return;

    const handleSessionUser = async (sessionUser: any) => {
      try {
        const userEmail = (sessionUser.email || '').toLowerCase().trim();
        const profile = await fetchUserProfile(sessionUser.id, userEmail);
        const knownUserMatch = allUsers.find(u => u.email.toLowerCase() === userEmail);
        
        let userToSet: User;
        if (profile) {
          userToSet = {
            ...profile,
            // If the user is registered as admin or is the designated admin account
            role: (profile.role === 'admin' || knownUserMatch?.role === 'admin' || userEmail === 'priyadike23@gmail.com') ? 'admin' : profile.role,
          };
        } else {
          // Check if user is known admin or has specific role in metadata
          const meta = sessionUser.user_metadata || {};
          const isKnownAdmin = 
            meta.role === 'admin' || 
            userEmail === 'priyadike23@gmail.com' ||
            knownUserMatch?.role === 'admin' ||
            userEmail.includes('admin');
          
          userToSet = {
            id: sessionUser.id,
            name: meta.full_name || meta.name || knownUserMatch?.name || userEmail.split('@')[0] || 'Authorized Officer',
            email: userEmail,
            role: isKnownAdmin ? 'admin' : ((meta.role as Role) || knownUserMatch?.role || 'employee'),
            subsidiary: (meta.subsidiary as Subsidiary) || knownUserMatch?.subsidiary || 'CMPDI HQ',
            department: meta.department || knownUserMatch?.department || 'Central Directorate',
            designation: isKnownAdmin ? 'Chief Directorate Officer' : (meta.designation || knownUserMatch?.designation || 'Mining Technical Officer'),
            employeeId: meta.employeeId || knownUserMatch?.employeeId || `EMP-${sessionUser.id.substring(0, 5).toUpperCase()}`,
            status: 'approved',
          };
          syncUserProfile(userToSet);
        }

        setCurrentUser(userToSet);
        setIsLoggedIn(true);
        setActiveView('dashboard');

        try {
          localStorage.setItem('khanij_auth_type', 'supabase');
          localStorage.setItem('khanij_logged_in', 'true');
          localStorage.setItem('khanij_user', JSON.stringify(userToSet));
        } catch (storageErr) {
          console.warn('Storage write notice:', storageErr);
        }

        // Clean up OAuth hash parameters in URL if present
        if (typeof window !== 'undefined' && (window.location.hash || window.location.search.includes('code='))) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        reloadFromSupabase();
      } catch (err) {
        console.error('[Supabase] Auth user handling error:', err);
      }
    };

    // Check active session on mount
    client.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.warn('[Supabase] Session check notice:', error.message);
        return;
      }
      if (session?.user) {
        await handleSessionUser(session.user);
      }
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        await handleSessionUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
        setActiveView('login');
        try {
          localStorage.removeItem('khanij_logged_in');
          localStorage.removeItem('khanij_user');
          localStorage.removeItem('khanij_auth_type');
          localStorage.removeItem('khanij_remember_me');
          sessionStorage.removeItem('khanij_logged_in');
          sessionStorage.removeItem('khanij_user');
        } catch (e) {
          console.warn('Session clear notice:', e);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [reloadFromSupabase]);

  // Network online/offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setToastMessage({
        type: 'success',
        text: 'Network connection restored. Syncing with Central Supabase Cloud.',
      });
      reloadFromSupabase();
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
  }, [reloadFromSupabase]);

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

    // Persist to Supabase if connected
    if (isSupabaseConfigured && !isUndergroundModeActive) {
      persistAuditLog(newEntry);
    }
  };

  // Real Supabase Authentication & Built-in Demo Account handler
  const loginWithCredentials = async (
    identifier: string, 
    password?: string, 
    rememberMe: boolean = true
  ): Promise<{
    success: boolean;
    status?: AccountStatus;
    message?: string;
    user?: User;
  }> => {
    const cleanId = identifier.trim();
    const cleanEmail = cleanId.includes('@') ? cleanId.toLowerCase() : `${cleanId.toLowerCase()}@cil.in`;

    // 1. Direct Demo / Pre-approved User Match (Dr. Arindam Mukherjee, Er. Rajesh Verma, etc.)
    const foundDemoOrLocal = allUsers.find(u => 
      u.email.toLowerCase() === cleanId.toLowerCase() || 
      u.employeeId.toLowerCase() === cleanId.toLowerCase() ||
      u.email.toLowerCase() === cleanEmail.toLowerCase()
    );

    if (foundDemoOrLocal && (foundDemoOrLocal.role === 'admin' || !cleanId.includes('@gmail') && !cleanId.includes('@yahoo'))) {
      if (foundDemoOrLocal.status === 'pending') {
        return {
          success: false,
          status: 'pending',
          message: 'Your access request is awaiting administrator approval.'
        };
      }
      if (foundDemoOrLocal.status === 'rejected') {
        return {
          success: false,
          status: 'rejected',
          message: foundDemoOrLocal.rejectedReason || 'Your access request was not approved.'
        };
      }

      setCurrentUser(foundDemoOrLocal);
      setIsLoggedIn(true);
      try {
        localStorage.setItem('khanij_auth_type', 'local');
        if (rememberMe) {
          localStorage.setItem('khanij_remember_me', 'true');
          localStorage.setItem('khanij_user', JSON.stringify(foundDemoOrLocal));
          localStorage.setItem('khanij_logged_in', 'true');
        } else {
          localStorage.removeItem('khanij_remember_me');
          localStorage.removeItem('khanij_logged_in');
          sessionStorage.setItem('khanij_user', JSON.stringify(foundDemoOrLocal));
          sessionStorage.setItem('khanij_logged_in', 'true');
        }
      } catch (e) {
        console.warn('Storage write notice:', e);
      }

      setActiveView('dashboard');
      logAuditAction('AI_QUERY', `User authenticated to ${foundDemoOrLocal.role === 'admin' ? 'Admin & Governance' : 'Employee Workstation'} Portal (${foundDemoOrLocal.name})`);
      setToastMessage({ type: 'success', text: `Welcome, ${foundDemoOrLocal.name} (${foundDemoOrLocal.subsidiary})` });
      
      return {
        success: true,
        status: 'approved',
        user: foundDemoOrLocal,
      };
    }

    // 2. Real Supabase Auth (for registered personal / live accounts)
    if (isSupabaseConfigured) {
      const client = getSupabase();
      if (client) {
        try {
          const { data, error } = await client.auth.signInWithPassword({
            email: cleanEmail,
            password: password || 'Password@123',
          });

          if (error) {
            console.warn('[Supabase Auth] signInWithPassword error:', error.message);
            // Check if user is in local storage registered requests
            if (foundDemoOrLocal) {
              setCurrentUser(foundDemoOrLocal);
              setIsLoggedIn(true);
              localStorage.setItem('khanij_auth_type', 'local');
              localStorage.setItem('khanij_user', JSON.stringify(foundDemoOrLocal));
              localStorage.setItem('khanij_logged_in', 'true');
              setActiveView('dashboard');
              logAuditAction('AI_QUERY', `Local fallback authentication for ${foundDemoOrLocal.name}`);
              return { success: true, status: 'approved', user: foundDemoOrLocal };
            }

            return {
              success: false,
              message: error.message || 'Unable to sign in with Supabase credentials. Please verify your email and password.',
            };
          }

          // Rule: Only redirect to dashboard when a real session actually exists
          if (!data?.session) {
            return {
              success: false,
              message: 'Check your email and confirm your account before logging in. No active session established.',
            };
          }

          if (data?.user && data?.session) {
            let profile = await fetchUserProfile(data.user.id, data.user.email || cleanEmail);
            const isTargetAdmin = cleanEmail === 'priyadike23@gmail.com' || (foundDemoOrLocal && foundDemoOrLocal.role === 'admin');
            if (!profile) {
              const meta = data.user.user_metadata || {};
              profile = {
                id: data.user.id,
                name: meta.name || data.user.email?.split('@')[0] || foundDemoOrLocal?.name || 'Authorized User',
                email: data.user.email || cleanEmail,
                role: isTargetAdmin ? 'admin' : ((meta.role as Role) || foundDemoOrLocal?.role || 'employee'),
                subsidiary: (meta.subsidiary as Subsidiary) || foundDemoOrLocal?.subsidiary || 'CMPDI HQ',
                department: meta.department || foundDemoOrLocal?.department || 'Central Directorate',
                designation: isTargetAdmin ? 'Chief Mining Engineer' : (meta.designation || foundDemoOrLocal?.designation || 'Mining Technical Officer'),
                employeeId: meta.employeeId || foundDemoOrLocal?.employeeId || cleanId,
                status: 'approved',
              };
              await syncUserProfile(profile);
            } else if (isTargetAdmin && profile.role !== 'admin') {
              profile.role = 'admin';
              await syncUserProfile(profile);
            }

            setCurrentUser(profile);
            setIsLoggedIn(true);
            localStorage.setItem('khanij_auth_type', 'supabase');

            if (rememberMe) {
              localStorage.setItem('khanij_remember_me', 'true');
              localStorage.setItem('khanij_user', JSON.stringify(profile));
              localStorage.setItem('khanij_logged_in', 'true');
            } else {
              localStorage.removeItem('khanij_remember_me');
              localStorage.removeItem('khanij_logged_in');
              sessionStorage.setItem('khanij_user', JSON.stringify(profile));
              sessionStorage.setItem('khanij_logged_in', 'true');
            }

            setActiveView('dashboard');
            logAuditAction('AI_QUERY', `Supabase Authenticated: ${profile.name} (${profile.role})`);
            setToastMessage({ type: 'success', text: `Welcome, ${profile.name} (${profile.subsidiary})` });
            reloadFromSupabase();

            return {
              success: true,
              status: 'approved',
              user: profile,
            };
          }
        } catch (err: any) {
          console.error('[Supabase Auth] Login catch error:', err);
          return {
            success: false,
            message: err?.message || 'Authentication error. Please check your network connection.',
          };
        }
      }
    }

    // 3. Fallback check for any pending or rejected access requests
    const foundReq = accessRequests.find(r => 
      r.email.toLowerCase() === cleanId.toLowerCase() || 
      r.employeeId.toLowerCase() === cleanId.toLowerCase()
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
          message: foundReq.rejectedReason || 'Your access request was not approved.'
        };
      }
    }

    if (foundDemoOrLocal) {
      setCurrentUser(foundDemoOrLocal);
      setIsLoggedIn(true);
      try {
        localStorage.setItem('khanij_auth_type', 'local');
        if (rememberMe) {
          localStorage.setItem('khanij_remember_me', 'true');
          localStorage.setItem('khanij_user', JSON.stringify(foundDemoOrLocal));
          localStorage.setItem('khanij_logged_in', 'true');
        } else {
          localStorage.removeItem('khanij_remember_me');
          localStorage.removeItem('khanij_logged_in');
          sessionStorage.setItem('khanij_user', JSON.stringify(foundDemoOrLocal));
          sessionStorage.setItem('khanij_logged_in', 'true');
        }
      } catch (e) {
        console.warn('Storage notice:', e);
      }
      setActiveView('dashboard');
      return { success: true, status: 'approved', user: foundDemoOrLocal };
    }

    return {
      success: false,
      message: 'Invalid credentials. No authorized CIL/CMPDI record found for this identifier.'
    };
  };

  // Real Supabase Auth SignUp / Access Registration
  const submitAccessRequest = async (payload: AccessRequestPayload): Promise<{
    success: boolean;
    requestId: string;
    message: string;
    requiresEmailConfirmation?: boolean;
  }> => {
    const requestId = `req_${Date.now()}`;
    const cleanEmail = payload.email.trim().toLowerCase();

    // 1. Real Supabase signUp
    if (isSupabaseConfigured) {
      const client = getSupabase();
      if (client) {
        try {
          const { data, error } = await client.auth.signUp({
            email: cleanEmail,
            password: payload.password || 'Password@123',
            options: {
              data: {
                name: payload.name.trim(),
                employeeId: payload.employeeId.trim().toUpperCase(),
                subsidiary: payload.subsidiary,
                department: payload.department.trim(),
                designation: payload.designation.trim(),
                role: 'employee',
              }
            }
          });

          if (error) {
            console.warn('[Supabase Auth] signUp error:', error.message);
            return {
              success: false,
              requestId,
              message: error.message || 'Failed to register account with Supabase Auth.',
              requiresEmailConfirmation: false,
            };
          }

          if (data?.user) {
            // Check if email confirmation is required (session is null)
            const isEmailConfirmationRequired = data.session === null;

            const newProfile: User = {
              id: data.user.id,
              name: payload.name.trim(),
              designation: payload.designation.trim(),
              role: 'employee',
              status: isEmailConfirmationRequired ? 'pending' : 'approved',
              subsidiary: payload.subsidiary,
              email: cleanEmail,
              employeeId: payload.employeeId.trim().toUpperCase(),
              department: payload.department.trim(),
            };
            await syncUserProfile(newProfile);

            if (isEmailConfirmationRequired) {
              // Strict rule: Do not auto-login the user or redirect to dashboard.
              setIsLoggedIn(false);
              logAuditAction('AI_QUERY', `Account registered (Email Verification Required): ${newProfile.name} (${newProfile.email})`);
              return {
                success: true,
                requestId,
                requiresEmailConfirmation: true,
                message: 'Account created — check your email to confirm, then sign in.',
              };
            } else {
              // Even if email confirmation is disabled, follow UX rule: do NOT auto-login, allow user to sign in
              setIsLoggedIn(false);
              logAuditAction('AI_QUERY', `Account registered: ${newProfile.name} (${newProfile.email})`);
              return {
                success: true,
                requestId,
                requiresEmailConfirmation: false,
                message: 'Account created successfully. Please sign in with your credentials.',
              };
            }
          }
        } catch (e: any) {
          console.error('[Supabase Auth] SignUp exception:', e);
          return {
            success: false,
            requestId,
            message: e?.message || 'Error occurred during registration.',
            requiresEmailConfirmation: false,
          };
        }
      }
    }

    // Also register locally for offline fallback mode
    const newReq: UserAccessRequest = {
      id: requestId,
      name: payload.name.trim(),
      employeeId: payload.employeeId.trim().toUpperCase(),
      email: cleanEmail,
      subsidiary: payload.subsidiary,
      department: payload.department.trim(),
      designation: payload.designation.trim(),
      role: 'employee',
      status: 'approved',
      requestedAt: new Date().toISOString(),
    };

    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: payload.name.trim(),
      designation: payload.designation.trim(),
      role: 'employee',
      status: 'approved',
      subsidiary: payload.subsidiary,
      email: cleanEmail,
      employeeId: payload.employeeId.trim().toUpperCase(),
      department: payload.department.trim(),
      password: payload.password,
      requestedAt: new Date().toISOString(),
    };

    setAccessRequests(prev => [newReq, ...prev.filter(r => r.email !== newReq.email)]);
    setAllUsers(prev => [newUser, ...prev.filter(u => u.email !== newUser.email)]);

    logAuditAction('AI_QUERY', `Account registered & provisioned for ${newUser.name} (${newUser.subsidiary} - ${newUser.employeeId})`);
    setToastMessage({ type: 'success', text: `Account created for ${newUser.name}. You can now sign in with your credentials.` });

    return {
      success: true,
      requestId,
      requiresEmailConfirmation: false,
      message: 'Account registered and synchronized with Supabase Auth.'
    };
  };

  const approveAccessRequest = (requestId: string) => {
    const req = accessRequests.find(r => r.id === requestId);
    if (!req) return;

    setAccessRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'approved' as AccountStatus, approvedAt: new Date().toISOString(), approvedBy: currentUser.name } : r));
    setAllUsers(prev => prev.map(u => (u.email.toLowerCase() === req.email.toLowerCase() || u.employeeId.toLowerCase() === req.employeeId.toLowerCase()) ? { ...u, status: 'approved' as AccountStatus, approvedAt: new Date().toISOString() } : u));

    logAuditAction('APPROVE_VERSION', `Administrator approved access request for ${req.name} (${req.employeeId})`);
    setToastMessage({ type: 'success', text: `Access request approved for ${req.name}. User can now sign in.` });
  };

  const rejectAccessRequest = (requestId: string, reason: string) => {
    const req = accessRequests.find(r => r.id === requestId);
    if (!req) return;

    setAccessRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' as AccountStatus, rejectedReason: reason } : r));
    setAllUsers(prev => prev.map(u => (u.email.toLowerCase() === req.email.toLowerCase() || u.employeeId.toLowerCase() === req.employeeId.toLowerCase()) ? { ...u, status: 'rejected' as AccountStatus, rejectedReason: reason } : u));

    logAuditAction('REJECT_VERSION', `Administrator rejected access request for ${req.name}: ${reason}`);
    setToastMessage({ type: 'warning', text: `Access request rejected for ${req.name}.` });
  };

  const requestPasswordReset = async (identifier: string): Promise<{ success: boolean; message: string }> => {
    const cleanId = identifier.trim();
    const cleanEmail = cleanId.includes('@') ? cleanId : `${cleanId}@cil.in`;

    if (isSupabaseConfigured) {
      const client = getSupabase();
      if (client) {
        try {
          await client.auth.resetPasswordForEmail(cleanEmail);
        } catch (e) {
          console.warn('[Supabase] Reset password notice:', e);
        }
      }
    }

    logAuditAction('AI_QUERY', `Password reset token requested for identifier: ${cleanId}`);
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
    reloadFromSupabase();
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      const client = getSupabase();
      if (client) {
        try {
          await client.auth.signOut();
        } catch (err) {
          console.warn('[Supabase] signOut notice:', err);
        }
      }
    }

    setIsLoggedIn(false);
    try {
      localStorage.removeItem('khanij_logged_in');
      localStorage.removeItem('khanij_user');
      localStorage.removeItem('khanij_remember_me');
      localStorage.removeItem('khanij_auth_type');
      sessionStorage.removeItem('khanij_logged_in');
      sessionStorage.removeItem('khanij_user');
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

  const addDocument = async (doc: Document) => {
    setDocuments(prev => [doc, ...prev]);
    setCachedDocumentIds(prev => [doc.id, ...prev]);

    // Create chunks
    const newChunks: Chunk[] = doc.versions[0] ? [{
      id: `chk_${Date.now()}`,
      documentId: doc.id,
      documentTitle: doc.title,
      documentCode: doc.documentCode,
      documentVersionId: doc.versions[0].id,
      versionNumber: doc.versions[0].versionNumber,
      subsidiary: doc.subsidiary,
      pageOrSheetRef: 'Page 1',
      topicTag: doc.tags[0] || 'Technical Filing',
      isApproved: doc.versions[0].approvalStatus === 'approved',
      text: doc.versions[0].extractedText,
    }] : [];

    if (newChunks.length > 0) {
      setChunks(prev => [...newChunks, ...prev]);
    }

    logAuditAction('UPLOAD_DOCUMENT', `Uploaded new document: ${doc.title} (${doc.documentCode})`, doc.id, doc.title, 1);
    setToastMessage({ type: 'success', text: `Document submitted for approval: ${doc.title}` });

    if (isSupabaseConfigured && !isUndergroundModeActive) {
      await persistNewDocument(doc, newChunks);
    }
  };

  const submitNewVersion = async (docId: string, version: DocumentVersion) => {
    const targetDoc = documents.find(d => d.id === docId);
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

    const newChunks: Chunk[] = targetDoc ? [{
      id: `chk_${Date.now()}`,
      documentId: docId,
      documentTitle: targetDoc.title,
      documentCode: targetDoc.documentCode,
      documentVersionId: version.id,
      versionNumber: version.versionNumber,
      subsidiary: targetDoc.subsidiary,
      pageOrSheetRef: `Page 1 (v${version.versionNumber})`,
      topicTag: targetDoc.tags[0] || 'Technical Filing',
      isApproved: false,
      text: version.extractedText,
    }] : [];

    if (newChunks.length > 0) {
      setChunks(prev => [...newChunks, ...prev]);
    }

    logAuditAction('SUBMIT_VERSION', `Submitted revision v${version.versionNumber}: ${version.reasonForChange}`, docId, targetDoc?.title, version.versionNumber);
    setToastMessage({ type: 'info', text: `Version ${version.versionNumber} submitted. Placed in Approval Queue.` });

    if (isSupabaseConfigured && !isUndergroundModeActive) {
      await persistNewVersion(docId, version, newChunks);
    }
  };

  const deleteDocument = async (docId: string) => {
    const targetDoc = documents.find(d => d.id === docId);
    if (!targetDoc) return;

    setDocuments(prev => prev.filter(d => d.id !== docId));
    setChunks(prev => prev.filter(c => c.documentId !== docId));
    if (activeDocForDetail?.id === docId) {
      setActiveDocForDetail(null);
    }

    logAuditAction('DELETE_DOCUMENT' as any, `Deleted document record and attached storage files: ${targetDoc.title} (${targetDoc.documentCode})`, docId, targetDoc.title);
    setToastMessage({ type: 'info', text: `Document "${targetDoc.title}" deleted from database and storage.` });

    if (isSupabaseConfigured && !isUndergroundModeActive) {
      await deleteDocumentFromSupabase(targetDoc);
    }
  };

  const approveVersion = async (docId: string, versionId: string, note?: string) => {
    let updatedDocTitle = '';
    let updatedVersionNum = 1;
    let submitterName = '';
    let newChunksCreated: Chunk[] = [];

    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        updatedDocTitle = doc.title;
        const updatedVersions = doc.versions.map(v => {
          if (v.id === versionId) {
            updatedVersionNum = v.versionNumber;
            submitterName = v.uploadedBy.name;
            return {
              ...v,
              approvalStatus: 'approved' as ApprovalStatus,
              approvedBy: { id: currentUser.id, name: currentUser.name },
              approvedAt: new Date().toISOString(),
              reviewedBy: { id: currentUser.id, name: currentUser.name },
              reviewedAt: new Date().toISOString(),
              reviewerNote: note || 'Statutory verification criteria satisfied. Approved for production knowledge base.',
            };
          }
          return v;
        });

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

    setTopicInsights(prev => prev.map(t => ({
      ...t,
      occurrences: t.occurrences + 1,
    })));

    logAuditAction('APPROVE_VERSION', `Approved version v${updatedVersionNum} (Submitted by ${submitterName || 'Officer'}). Reviewed by ${currentUser.name}. ${note ? `Reviewer Note: ${note}` : 'Verification Approved.'}`, docId, updatedDocTitle, updatedVersionNum);
    logAuditAction('REINDEX_KB', `Auto-reindexed knowledge vectors for ${updatedDocTitle} v${updatedVersionNum}`, docId, updatedDocTitle, updatedVersionNum);

    setToastMessage({ 
      type: 'success', 
      text: `Approved v${updatedVersionNum} for "${updatedDocTitle}". AI Knowledge Base re-indexed!` 
    });

    if (isSupabaseConfigured && !isUndergroundModeActive) {
      await persistApprovalReview(versionId, 'approved', currentUser, note);
    }
  };

  const rejectVersion = async (docId: string, versionId: string, reason: string) => {
    let docTitle = '';
    let versionNum = 1;
    let submitterName = '';

    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        docTitle = doc.title;
        return {
          ...doc,
          versions: doc.versions.map(v => {
            if (v.id === versionId) {
              versionNum = v.versionNumber;
              submitterName = v.uploadedBy.name;
              return {
                ...v,
                approvalStatus: 'rejected' as ApprovalStatus,
                rejectedReason: reason,
                reviewerNote: reason,
                reviewedBy: { id: currentUser.id, name: currentUser.name },
                reviewedAt: new Date().toISOString(),
              };
            }
            return v;
          }),
        };
      }
      return doc;
    }));

    logAuditAction('REJECT_VERSION', `Rejected v${versionNum} (Submitted by ${submitterName || 'Officer'}). Reviewed by ${currentUser.name}. Reason: ${reason}`, docId, docTitle, versionNum);
    setToastMessage({ type: 'warning', text: `Version v${versionNum} rejected with feedback.` });

    if (isSupabaseConfigured && !isUndergroundModeActive) {
      await persistApprovalReview(versionId, 'rejected', currentUser, reason);
    }
  };

  const requestChangesVersion = async (docId: string, versionId: string, note: string) => {
    let docTitle = '';
    let versionNum = 1;
    let submitterName = '';

    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        docTitle = doc.title;
        return {
          ...doc,
          versions: doc.versions.map(v => {
            if (v.id === versionId) {
              versionNum = v.versionNumber;
              submitterName = v.uploadedBy.name;
              return {
                ...v,
                approvalStatus: 'changes_requested' as ApprovalStatus,
                changesRequestedNote: note,
                reviewerNote: note,
                reviewedBy: { id: currentUser.id, name: currentUser.name },
                reviewedAt: new Date().toISOString(),
              };
            }
            return v;
          }),
        };
      }
      return doc;
    }));

    logAuditAction('REQUEST_CHANGES', `Requested changes on v${versionNum} (Submitted by ${submitterName || 'Officer'}). Reviewed by ${currentUser.name}. Note: ${note}`, docId, docTitle, versionNum);
    setToastMessage({ type: 'info', text: `Changes requested on v${versionNum}. Employee notified.` });

    if (isSupabaseConfigured && !isUndergroundModeActive) {
      await persistApprovalReview(versionId, 'changes_requested', currentUser, note);
    }
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
      deleteDocument,
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
