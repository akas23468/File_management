# MineMind AI ⛏️

> **Tagline:** *From scattered reports to smarter mining decision*  
> **Affiliation:** CMPDI (Central Mine Planning & Design Institute) & Coal India Limited (Ministry of Coal, Govt. of India)  
> **Problem Statement ID:** PS-26023

---

## 📖 Overview

**MineMind AI** is an enterprise-grade, source-grounded geological and mining intelligence platform designed for **CMPDI**, **Coal India Limited (CIL)**, and its subsidiaries (*SECL, BCCL, CCL, MCL, ECL, NCL, WCL*).

In modern mining operations, technical reports, borehole lithology logs, DGMS safety directives, and environmental impact assessments are scattered across multiple repositories and regional formats. **MineMind AI** unifies these disparate assets into an indexed, version-controlled, and strictly grounded knowledge core—enabling zero-hallucination AI inquiries, automated statutory reporting, and robust engineering governance.

---

## 🔐 Login & Sign Up (Access Management)

MineMind AI enforces an official government access control model with role-based segregation (**Employee/Technical Officer** vs. **Admin/Chief Mining Engineer**).

### 1. Sign In (`/login`)
- **Official Email & Password**: Login using your official Coal India / CMPDI email (e.g., `@cmpdi.co.in`, `@secl.coalindia.in`) and password.
- **Pre-Configured Quick Login Profiles**: For instant demo and evaluation, click any sample credential card:
  - **Chief Mining Engineer (Admin)**: `Dr. Arindam Mukherjee` (`arindam.mukherjee@cmpdi.co.in` / `Password@123`) — Full governance, approval queue, user verification, and audit trail.
  - **Senior Geologist (Employee)**: `Er. Rajesh Kumar Verma` (`rajesh.verma@secl.coalindia.in` / `Password@123`) — Exploration queries, knowledge center, report generator, and draft submissions.
  - **Safety & Audit Officer (Employee)**: `Pooja Sharma` (`pooja.sharma@bccl.coalindia.in` / `Password@123`) — DGMS compliance, safety reports, and mine telemetry.
- **Remember Session**: Persists authenticated state across browser sessions.

### 2. Request Access / Sign Up
- Click **"Request Access"** on the authentication screen.
- Fill in official registration details:
  - **Full Name** & **Official Email** (validates `@coalindia.in` / `@cmpdi.co.in` or government domain)
  - **Employee ID** (e.g., `CIL-SECL-84920`)
  - **Subsidiary Selection** (CMPDI HQ, SECL, BCCL, CCL, ECL, MCL, NCL, WCL)
  - **Department & Designation**
  - **Official Justification**: Brief explanation of project requirements for audit verification.
- **Governance Gate**: Newly submitted accounts enter a **Pending Approval** state. Administrators review and approve/reject registration requests in the Admin Approval Queue before access is activated.

### 3. Role Switcher & Demonstration Mode
- Authenticated users can freely toggle between **Employee Workstation** and **Admin Governance Portal** from the sidebar or header to review both operational and administrative capabilities.

---

## 🗂️ Application Sections & Feature Guide

```
MineMind AI
├── 📊 Dashboard (Employee Workstation / Admin Governance)
├── 📚 Knowledge Center (Geological & Technical Library)
├── 🤖 AI Assistant (Grounded RAG Intelligence)
├── 📝 My Updates (Authoring & Version Submissions)
├── 📄 Statutory Report Generator (5-Step Directorate Wizard)
├── ✅ Approval Queue [Admin Only] (Document & User Verification)
├── 💡 AI Strategic Insights (Exploration & Trend Radar)
├── 🛡️ Audit Trail [Admin Only] (Tamper-Evident Governance Log)
├── ⚙️ Settings (User Profile & System Preferences)
└── 📴 Underground Offline Mode (Service Worker Deep-Pit Cache)
```

---

### 1. 📊 Dashboard
*Adaptive homepage tailored to the user's active authority role.*
- **Employee View**:
  - **Active Subsidiary Scope**: Current mining zone and telemetry summary.
  - **Knowledge Indexing Stats**: Count of approved documents, active chunks, and recent inquiries.
  - **Personal Action Items**: Status of pending draft submissions and recently accessed statutory formats.
  - **Quick AI Inquiry Bar**: Instant launching point for natural language questions.
- **Admin View**:
  - **Priority-Sorted Approval Summary**: Real-time counter of pending updates categorized by urgency (🔴 *Urgent DGMS/Safety* vs 🟡 *Routine*).
  - **Subsidiary Coverage Heatmap**: Visual breakdown of documents indexed across all 8 CIL subsidiaries.
  - **System Health & Grounding Integrity**: Verifies zero-hallucination compliance rate and active chunk validation count.

---

### 2. 📚 Knowledge Center
*Centralized multi-format repository for geological reports, borehole data, mining plans, and safety circulars.*
- **Multi-Format Document Support**: PDF reports, Borehole CSV datasets, Overburden Excel sheets, and DGMS compliance manuals.
- **Subsidiary & Topic Filters**: Filter by subsidiary (`SECL`, `BCCL`, `CMPDI HQ`, etc.) or technical topic (*Geological Exploration*, *DGMS Safety Standards*, *Coal Grade & GCV*, *Overburden & Production*).
- **Chunk Inspector**: View granular text and tabular chunks with exact page references, bounding coordinates, and confidence scores.
- **Version History & Diff Viewer**: Inspect document revisions (e.g., `v1.0` vs `v1.1`), view author change-logs, and launch side-by-side color-coded differential comparisons (`CompareVersionsModal`).
- **Citation Viewer**: Click on any document reference to open the verified source modal with highlighted text.

---

### 3. 🤖 AI Grounded Assistant
*Strictly source-grounded, zero-hallucination question-answering system.*
- **Speech-to-Text & Voice Search**: Integrated microphone interface for hands-free voice inquiries in field offices.
- **Strict Grounding Directives**: Every synthesized response is backed strictly by approved CMPDI/CIL source records. If no verified chunks exist, the model explicitly responds: *"No supporting information was found in the available organizational documents."*
- **Clickable Source Citation Badges**: Every factual claim displays an interactive badge showing:
  - Document Title & Official Reference Code (e.g., `CMPDI-GEO-2025-09`)
  - Page Number / Sheet Cell Coordinates
  - Extraction Confidence Percentage (e.g., `96.4%`)
  - Verifying Authority & Date
- **Push to Report Draft**: One-click transfer of AI synthesis and associated citations directly into the Statutory Report Generator.

---

### 4. 📝 My Updates (Officer Submissions)
*Authoring and change-management hub for field engineers and geologists.*
- **Submit Document Revision**: Upload new exploration drafts, borehole log revisions, or production updates.
- **Priority Classification**: Flag updates as **Routine** or **Urgent (DGMS/Safety Mandatory)**.
- **Change Justification Log**: Provide detailed technical rationale and source files for review.
- **Submission Timeline Tracker**: Real-time status tracking (*Under Review*, *Approved*, *Changes Requested*).

---

### 5. 📄 Statutory Report Generator
*Structured 5-step wizard to compile directorate and parliamentary-grade mining reports.*
- **Step 1 — Template Selection**: Choose from standard DGMS, Ministry of Coal, CMPDI Exploration, or Monthly Production templates.
- **Step 2 — Reporting Period**: Define fiscal year, quarter, or specific monthly dates.
- **Step 3 — Subsidiary Target**: Scope the report to individual subsidiaries or aggregate CIL-wide.
- **Step 4 — Source Selection**: Select specific approved chunks and borehole datasets to ground the report.
- **Step 5 — Synthesis & Review**: Live editable document editor with auto-generated citations, executive summary, and export options (**Markdown**, **Print/PDF**, **Copy to Clipboard**).
- **Compiled Archive**: Search and review previously generated statutory reports with historical metadata.

---

### 6. ✅ Approval Queue *(Admin Only)*
*Two-tier governance interface for Chief Mining Engineers and Directorate Admins.*
- **Tab 1: Document Version Approvals**:
  - Review pending document changes with highlighted diff comparisons.
  - Approve or reject individual chunks with mandatory justification notes.
  - Urgent safety updates are prioritized with alert badges at the top of the queue.
- **Tab 2: User Access Verification**:
  - Review pending employee registration requests.
  - Verify official email, subsidiary assignment, and designation.
  - One-click **Authorize** or **Reject** with automated audit logging.

---

### 7. 💡 AI Strategic Insights
*Predictive intelligence and knowledge gap discovery across mining operations.*
- **Topic Clustering & Search Radar**: Identifies most-queried mining parameters (e.g., *G11 Coal GCV Values*, *Korba Basin Seams*, *DGMS Slope Stability*).
- **Knowledge Gap Detection**: Flags technical areas where field engineers are searching but source records are outdated or sparse.
- **Proactive Exploration Recommendations**: AI-driven suggestions for supplementary borehole drilling and environmental audits.

---

### 8. 🛡️ Audit Trail *(Admin Only)*
*Tamper-evident, immutable activity log ensuring transparency and compliance.*
- **Comprehensive Event Logging**: Records every user sign-in, document upload, chunk approval, AI inquiry, and report generation.
- **Audit Metadata**: Captures Timestamp, Officer Name, Employee ID, IP/Subsidiary, Action Category, and Status.
- **Filter & Export**: Search logs by action type or officer ID for internal vigilance compliance.

---

### 9. 📴 Underground Offline Mode
*Built for low-connectivity deep pit and underground coal mine operations.*
- **Service Worker Local Caching**: One-click sync caches critical geological data and DGMS manuals into local browser storage.
- **Simulate Offline Toggle**: Test low-connectivity behavior directly from the top navigation bar.
- **Offline Query Resolver**: Allows uninterrupted search and inspection of precached documents without active cloud connection.

---

## 🛠️ Technology Stack

- **Frontend Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS (Sophisticated high-contrast palette with coal `#141C2B` and gold `#C8892E` accents)
- **Icons**: Lucide React
- **AI Architecture**: Google Gemini API via Secure Server-Side RAG Pipeline (`@google/genai`)
- **Offline Storage**: Service Worker Cache API & Web LocalStorage / IndexedDB
- **Build Tool**: Vite & Node.js

---

## 🚀 Quick Start / Local Setup

### Prerequisites
- Node.js (version 18 or above)
- npm or yarn

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/your-username/minemind-ai.git

# 2. Navigate to project directory
cd minemind-ai

# 3. Install dependencies
npm install

# 4. Set environment variables (Optional - for live Gemini API)
# Create a .env file:
# GEMINI_API_KEY=your_gemini_api_key_here

# 5. Start development server
npm run dev
```

The application will be live at `http://localhost:3000`.

---

## 🔒 Security & Governance Principles

1. **Zero Hallucination Mandate**: AI responses are bounded strictly to approved CIL/CMPDI source documents.
2. **Role-Based Access Control (RBAC)**: Clear operational boundaries between Field Geologists, Safety Auditors, and Chief Mining Engineers.
3. **Traceability**: Every generated paragraph and data point links back to its verified document chunk and page reference.
4. **Data Isolation**: Multi-tenant subsidiary partitioning ensures clean organizational scoping across regional coalfields.

---

*MineMind AI — Empowering Indian Mining with Governed, Traceable Intelligence.*
