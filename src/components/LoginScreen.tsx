import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Subsidiary } from '../types';
import { MineMindHeroBanner } from './MineMindHeroBanner';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  User, 
  IdCard, 
  Building2, 
  Check, 
  X, 
  Briefcase
} from 'lucide-react';

type AuthViewMode = 'login' | 'request-access' | 'request-submitted';

export const LoginScreen: React.FC = () => {
  const { loginWithCredentials, submitAccessRequest, requestPasswordReset } = useApp();

  // Navigation mode within Auth
  const [viewMode, setViewMode] = useState<AuthViewMode>('login');

  // Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [loginError, setLoginError] = useState<{ message: string; status?: 'pending' | 'rejected' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Forgot Password Modal State
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false);
  const [forgotResetSent, setForgotResetSent] = useState<boolean>(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Request Access Form State
  const [fullName, setFullName] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [officialEmail, setOfficialEmail] = useState<string>('');
  const [subsidiary, setSubsidiary] = useState<Subsidiary>('CMPDI HQ');
  const [department, setDepartment] = useState<string>('Geology & Exploration');
  const [designation, setDesignation] = useState<string>('');
  const [requestPassword, setRequestPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showReqPassword, setShowReqPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [requestFormError, setRequestFormError] = useState<string | null>(null);

  // Submitted Request Details
  const [submittedDetails, setSubmittedDetails] = useState<{
    requestId: string;
    name: string;
    employeeId: string;
    email: string;
    subsidiary: Subsidiary;
  } | null>(null);

  // Password strength calculation
  const getPasswordStrength = (pass: string): { score: number; label: string; color: string } => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    switch (score) {
      case 1:
        return { score: 25, label: 'Weak', color: 'bg-rose-500' };
      case 2:
        return { score: 50, label: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score: 75, label: 'Good', color: 'bg-blue-500' };
      case 4:
        return { score: 100, label: 'Strong', color: 'bg-emerald-600' };
      default:
        return { score: 15, label: 'Very Weak', color: 'bg-rose-400' };
    }
  };

  const passwordStrength = getPasswordStrength(requestPassword);

  // Handle Login Submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const res = loginWithCredentials(loginIdentifier, loginPassword, rememberMe);
      setIsSubmitting(false);

      if (!res.success) {
        if (res.status === 'pending') {
          setLoginError({
            status: 'pending',
            message: 'Your access request is still awaiting administrator approval.',
          });
        } else if (res.status === 'rejected') {
          setLoginError({
            status: 'rejected',
            message: 'Your access request was not approved. Please contact your administrator.',
          });
        } else {
          setLoginError({
            message: 'Unable to sign in. Please check your credentials.',
          });
        }
      }
    }, 350);
  };

  // Handle Request Access Submit
  const handleRequestAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestFormError(null);

    if (requestPassword.length < 8) {
      setRequestFormError('Password must be at least 8 characters long.');
      return;
    }

    if (requestPassword !== confirmPassword) {
      setRequestFormError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitAccessRequest({
        name: fullName,
        employeeId,
        email: officialEmail,
        subsidiary,
        department,
        designation,
        password: requestPassword,
      });

      setIsSubmitting(false);
      setSubmittedDetails({
        requestId: res.requestId,
        name: fullName,
        employeeId,
        email: officialEmail,
        subsidiary,
      });
      setViewMode('request-submitted');
    } catch (err) {
      setIsSubmitting(false);
      setRequestFormError('Failed to submit access request. Please try again.');
    }
  };

  // Open Forgot Password Modal
  const handleOpenForgotPasswordModal = () => {
    // Pre-populate with email if identifier has '@' or looks like an email/employee id
    if (loginIdentifier.trim()) {
      setForgotEmail(loginIdentifier.trim());
    }
    setForgotError(null);
    setForgotResetSent(false);
    setIsForgotPasswordModalOpen(true);
  };

  // Close Forgot Password Modal
  const handleCloseForgotPasswordModal = () => {
    setIsForgotPasswordModalOpen(false);
    setForgotResetSent(false);
    setForgotError(null);
  };

  // Handle Forgot Password Modal Submit
  const handleForgotModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim();
    if (!cleanEmail) {
      setForgotError('Please enter your official email address.');
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail) && !cleanEmail.includes('.')) {
      setForgotError('Please enter a valid official email address.');
      return;
    }

    setForgotError(null);
    setIsSendingReset(true);

    setTimeout(() => {
      requestPasswordReset(cleanEmail);
      setIsSendingReset(false);
      setForgotResetSent(true);
    }, 500);
  };

  return (
    <div 
      id="minemind-auth-container" 
      className="min-h-screen w-full flex flex-col md:flex-row bg-[#F7F5F0] overflow-x-hidden"
    >
      {/* ============================================================ */}
      {/* LEFT PANEL: BRAND / IDENTITY & CONNECTED KNOWLEDGE VISUAL */}
      {/* ============================================================ */}
      <div 
        className="w-full md:w-[48%] lg:w-[45%] flex flex-col"
      >
        <MineMindHeroBanner />
      </div>

      {/* ============================================================ */}
      {/* RIGHT PANEL: CLEAN AUTHENTICATION CARD & FORMS */}
      {/* ============================================================ */}
      <div className="w-full md:w-[52%] lg:w-[55%] p-6 sm:p-10 lg:p-16 flex flex-col justify-between bg-[#FAF8F3] overflow-y-auto">
        <div className="max-w-md w-full mx-auto my-auto py-4">

          {/* ============================================================ */}
          {/* 1. SECURE ACCESS (LOGIN) VIEW */}
          {/* ============================================================ */}
          {viewMode === 'login' && (
            <div className="space-y-6">
              {/* Header */}
              <div>
                <span className="text-[11px] font-mono font-semibold text-[#C8892E] uppercase tracking-wider block mb-1">
                  MineMind AI
                </span>
                <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#141C2B] tracking-tight">
                  Secure Access
                </h2>
                <p className="text-xs text-[#64748B] mt-1.5">
                  Sign in to your authorized MineMind AI workspace. From scattered reports to smarter mining decision.
                </p>
              </div>

              {/* Status / Error Alerts */}
              {loginError && (
                <div 
                  id="auth-error-alert"
                  className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-3 ${
                    loginError.status === 'pending'
                      ? 'bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]'
                      : loginError.status === 'rejected'
                        ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                        : 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]'
                  }`}
                >
                  {loginError.status === 'pending' ? (
                    <Clock className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold">{loginError.message}</p>
                  </div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Official Email / Employee ID */}
                <div>
                  <label 
                    htmlFor="input-login-identifier" 
                    className="block text-xs font-semibold text-[#141C2B] mb-1.5"
                  >
                    Official Email / Employee ID
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9BAE]" />
                    <input
                      id="input-login-identifier"
                      name="identifier"
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="Enter your official email or employee ID"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-[#E4E0D6] rounded-lg focus:outline-none focus:border-[#C8892E] focus:ring-1 focus:ring-[#C8892E] text-[#141C2B] placeholder:text-[#94A3B8] shadow-2xs transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label 
                      htmlFor="input-login-password" 
                      className="block text-xs font-semibold text-[#141C2B]"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      id="btn-forgot-password-link"
                      onClick={handleOpenForgotPasswordModal}
                      className="text-xs font-medium text-[#C8892E] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9BAE]" />
                    <input
                      id="input-login-password"
                      name="password"
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-2.5 text-xs bg-white border border-[#E4E0D6] rounded-lg focus:outline-none focus:border-[#C8892E] focus:ring-1 focus:ring-[#C8892E] text-[#141C2B] placeholder:text-[#94A3B8] shadow-2xs transition-all"
                    />
                    <button
                      type="button"
                      id="btn-toggle-login-password"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8F9BAE] hover:text-[#141C2B] cursor-pointer"
                      title={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#64748B] select-none">
                    <input
                      type="checkbox"
                      id="checkbox-remember-me"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-[#CBD5E1] text-[#141C2B] focus:ring-[#C8892E] cursor-pointer"
                    />
                    <span>Remember me</span>
                  </label>
                </div>

                {/* Submit Sign In Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    id="btn-login-submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-[#141C2B] hover:bg-[#1E293B] text-white font-semibold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 border border-[#141C2B] cursor-pointer disabled:opacity-75"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing In...
                      </span>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-4 h-4 text-[#C8892E]" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Quick Demo Credentials Assistant */}
              <div className="pt-3 pb-1">
                <div className="p-3 bg-[#F1EDE4]/80 border border-[#E4E0D6] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#141C2B] uppercase tracking-wider font-mono">
                      Quick Demo Accounts
                    </span>
                    <span className="text-[10px] text-[#8F9BAE]">Click to autofill</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Admin Demo Button */}
                    <button
                      type="button"
                      id="btn-demo-admin"
                      onClick={() => {
                        setLoginIdentifier('CMPDI-HQ-10294');
                        setLoginPassword('Password@123');
                        setLoginError(null);
                      }}
                      className="p-2 text-left bg-white hover:bg-[#FAF8F3] border border-[#E4E0D6] hover:border-[#C8892E] rounded-lg transition-all text-xs cursor-pointer shadow-2xs group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#141C2B] group-hover:text-[#C8892E] transition-colors">Admin</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#141C2B] text-[#C8892E] font-mono font-bold">CMPDI</span>
                      </div>
                      <p className="text-[10px] text-[#64748B] truncate mt-0.5">Dr. Arindam M.</p>
                      <p className="text-[9px] text-[#94A3B8] font-mono mt-0.5">Password@123</p>
                    </button>

                    {/* Employee Demo Button */}
                    <button
                      type="button"
                      id="btn-demo-employee"
                      onClick={() => {
                        setLoginIdentifier('CIL-SECL-84920');
                        setLoginPassword('Password@123');
                        setLoginError(null);
                      }}
                      className="p-2 text-left bg-white hover:bg-[#FAF8F3] border border-[#E4E0D6] hover:border-[#C8892E] rounded-lg transition-all text-xs cursor-pointer shadow-2xs group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#141C2B] group-hover:text-[#C8892E] transition-colors">Employee</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#E2E8F0] text-[#475569] font-mono font-bold">SECL</span>
                      </div>
                      <p className="text-[10px] text-[#64748B] truncate mt-0.5">Er. Rajesh Verma</p>
                      <p className="text-[9px] text-[#94A3B8] font-mono mt-0.5">Password@123</p>
                    </button>
                  </div>
                </div>
              </div>

              {/* Request Access Link */}
              <div className="pt-3 text-center border-t border-[#E4E0D6]">
                <p className="text-xs text-[#64748B]">
                  New user?{' '}
                  <button
                    type="button"
                    id="btn-switch-to-request-access"
                    onClick={() => {
                      setRequestFormError(null);
                      setViewMode('request-access');
                    }}
                    className="font-semibold text-[#C8892E] hover:underline cursor-pointer"
                  >
                    Request Access
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 2. REQUEST ACCESS VIEW */}
          {/* ============================================================ */}
          {viewMode === 'request-access' && (
            <div className="space-y-5">
              {/* Header */}
              <div>
                <span className="text-[11px] font-mono font-semibold text-[#C8892E] uppercase tracking-wider block mb-1">
                  MineMind AI
                </span>
                <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#141C2B] tracking-tight">
                  Request Access
                </h2>
                <p className="text-xs text-[#64748B] mt-1">
                  Create an authorized MineMind AI organizational account
                </p>
              </div>

              {/* Error Alert */}
              {requestFormError && (
                <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{requestFormError}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleRequestAccessSubmit} className="space-y-3.5">
                {/* Full Name */}
                <div>
                  <label 
                    htmlFor="input-request-fullname" 
                    className="block text-xs font-semibold text-[#141C2B] mb-1"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9BAE]" />
                    <input
                      id="input-request-fullname"
                      name="fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full pl-10 pr-3.5 py-2 text-xs bg-white border border-[#E4E0D6] rounded-lg focus:outline-none focus:border-[#C8892E] text-[#141C2B] placeholder:text-[#94A3B8]"
                    />
                  </div>
                </div>

                {/* Employee ID */}
                <div>
                  <label 
                    htmlFor="input-request-empid" 
                    className="block text-xs font-semibold text-[#141C2B] mb-1"
                  >
                    Employee ID
                  </label>
                  <div className="relative">
                    <IdCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9BAE]" />
                    <input
                      id="input-request-empid"
                      name="employeeId"
                      type="text"
                      required
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="Enter your employee ID"
                      className="w-full pl-10 pr-3.5 py-2 text-xs bg-white border border-[#E4E0D6] rounded-lg focus:outline-none focus:border-[#C8892E] text-[#141C2B] placeholder:text-[#94A3B8]"
                    />
                  </div>
                </div>

                {/* Official Email */}
                <div>
                  <label 
                    htmlFor="input-request-email" 
                    className="block text-xs font-semibold text-[#141C2B] mb-1"
                  >
                    Official Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9BAE]" />
                    <input
                      id="input-request-email"
                      name="officialEmail"
                      type="email"
                      required
                      value={officialEmail}
                      onChange={(e) => setOfficialEmail(e.target.value)}
                      placeholder="Enter your official email"
                      className="w-full pl-10 pr-3.5 py-2 text-xs bg-white border border-[#E4E0D6] rounded-lg focus:outline-none focus:border-[#C8892E] text-[#141C2B] placeholder:text-[#94A3B8]"
                    />
                  </div>
                </div>

                {/* Department / Subsidiary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label 
                      htmlFor="select-request-subsidiary" 
                      className="block text-xs font-semibold text-[#141C2B] mb-1"
                    >
                      Department / Subsidiary
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9BAE]" />
                      <select
                        id="select-request-subsidiary"
                        name="subsidiary"
                        value={subsidiary}
                        onChange={(e) => setSubsidiary(e.target.value as Subsidiary)}
                        className="w-full pl-10 pr-2 py-2 text-xs bg-white border border-[#E4E0D6] rounded-lg focus:outline-none focus:border-[#C8892E] text-[#141C2B]"
                      >
                        <option value="CMPDI HQ">CMPDI</option>
                        <option value="SECL">SECL</option>
                        <option value="BCCL">BCCL</option>
                        <option value="NCL">NCL</option>
                        <option value="CCL">CCL</option>
                        <option value="ECL">ECL</option>
                        <option value="WCL">WCL</option>
                        <option value="MCL">MCL</option>
                      </select>
                    </div>
                  </div>

                  {/* Designation */}
                  <div>
                    <label 
                      htmlFor="input-request-designation" 
                      className="block text-xs font-semibold text-[#141C2B] mb-1"
                    >
                      Designation
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9BAE]" />
                      <input
                        id="input-request-designation"
                        name="designation"
                        type="text"
                        required
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="Enter your designation"
                        className="w-full pl-10 pr-3.5 py-2 text-xs bg-white border border-[#E4E0D6] rounded-lg focus:outline-none focus:border-[#C8892E] text-[#141C2B] placeholder:text-[#94A3B8]"
                      />
                    </div>
                  </div>
                </div>

                {/* Password & Strength Indicator */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label 
                      htmlFor="input-request-password" 
                      className="block text-xs font-semibold text-[#141C2B]"
                    >
                      Password
                    </label>
                    {requestPassword && (
                      <span className="text-[10px] font-mono font-medium text-[#64748B]">
                        Strength: {passwordStrength.label}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9BAE]" />
                    <input
                      id="input-request-password"
                      name="password"
                      type={showReqPassword ? 'text' : 'password'}
                      required
                      value={requestPassword}
                      onChange={(e) => setRequestPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-2 text-xs bg-white border border-[#E4E0D6] rounded-lg focus:outline-none focus:border-[#C8892E] text-[#141C2B] placeholder:text-[#94A3B8]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowReqPassword(!showReqPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8F9BAE] hover:text-[#141C2B]"
                    >
                      {showReqPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Progress Bar */}
                  {requestPassword && (
                    <div className="mt-1.5 h-1 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label 
                      htmlFor="input-request-confirmpassword" 
                      className="block text-xs font-semibold text-[#141C2B]"
                    >
                      Confirm Password
                    </label>
                    {confirmPassword && (
                      <span className="text-[10px] font-medium flex items-center gap-1">
                        {requestPassword === confirmPassword ? (
                          <span className="text-emerald-700 flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Passwords match
                          </span>
                        ) : (
                          <span className="text-rose-600 flex items-center gap-0.5">
                            <X className="w-3 h-3" /> Passwords do not match
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9BAE]" />
                    <input
                      id="input-request-confirmpassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      className="w-full pl-10 pr-10 py-2 text-xs bg-white border border-[#E4E0D6] rounded-lg focus:outline-none focus:border-[#C8892E] text-[#141C2B] placeholder:text-[#94A3B8]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8F9BAE] hover:text-[#141C2B]"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Fixed Non-Editable Role Label */}
                <div className="p-3 bg-[#EFEBE2]/60 border border-[#E4E0D6] rounded-lg flex items-center justify-between">
                  <span className="text-xs font-medium text-[#64748B]">
                    Requested Role: <strong className="text-[#141C2B]">Employee</strong>
                  </span>
                  <span className="text-[10px] font-mono text-[#8F9BAE]">
                    Standard Account Clearance
                  </span>
                </div>

                {/* Submit Request Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    id="btn-submit-request-access"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-[#141C2B] hover:bg-[#1E293B] text-white font-semibold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 border border-[#141C2B] cursor-pointer disabled:opacity-75"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting Request...
                      </span>
                    ) : (
                      <>
                        <span>Submit Access Request</span>
                        <ArrowRight className="w-4 h-4 text-[#C8892E]" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Already Registered Link */}
              <div className="pt-3 text-center border-t border-[#E4E0D6]">
                <p className="text-xs text-[#64748B]">
                  Already registered?{' '}
                  <button
                    type="button"
                    id="btn-switch-to-signin"
                    onClick={() => {
                      setLoginError(null);
                      setViewMode('login');
                    }}
                    className="font-semibold text-[#C8892E] hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 3. ACCESS REQUEST SUBMITTED (CONFIRMATION) VIEW */}
          {/* ============================================================ */}
          {viewMode === 'request-submitted' && (
            <div className="space-y-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706] flex items-center justify-center mx-auto shadow-xs">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>

              <div>
                <h3 className="font-serif font-bold text-2xl text-[#141C2B]">
                  Access Request Submitted
                </h3>
                <p className="text-xs text-[#64748B] mt-2 max-w-sm mx-auto leading-relaxed">
                  Your account request has been submitted for administrator review.
                </p>
              </div>

              {/* Status Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-[#D97706] animate-ping" />
                <span>Status: Pending Approval</span>
              </div>

              {/* Back to Login Button */}
              <div className="pt-4 max-w-xs mx-auto">
                <button
                  type="button"
                  id="btn-return-to-signin"
                  onClick={() => {
                    setLoginError(null);
                    setViewMode('login');
                  }}
                  className="w-full py-2.5 bg-[#141C2B] hover:bg-[#1E293B] text-white font-semibold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Back to Login</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Small Footer Marker */}
        <div className="pt-4 border-t border-[#E4E0D6] text-center max-w-md mx-auto w-full">
          <p className="text-[11px] font-medium text-[#64748B]">
            Authorized Organizational Knowledge Platform • SIH PS 26023
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. FORGOT PASSWORD MODAL */}
      {/* ============================================================ */}
      {isForgotPasswordModalOpen && (
        <div 
          id="forgot-password-modal" 
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-password-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseForgotPasswordModal();
            }
          }}
        >
          <div className="relative w-full max-w-md bg-[#FAF8F3] border border-[#E4E0D6] rounded-2xl shadow-2xl p-6 sm:p-7 overflow-hidden text-[#141C2B] animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              type="button"
              id="btn-close-forgot-modal"
              onClick={handleCloseForgotPasswordModal}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-[#64748B] hover:text-[#141C2B] hover:bg-[#EFEBE2] transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header Icon */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#141C2B] text-[#C8892E] flex items-center justify-center shadow-md flex-shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 id="forgot-password-title" className="font-serif font-bold text-xl sm:text-2xl text-[#141C2B] tracking-tight">
                  Forgot Password
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Reset your MineMind AI credentials
                </p>
              </div>
            </div>

            {/* Modal Body: Success State or Form */}
            {forgotResetSent ? (
              <div className="space-y-4 pt-2">
                <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-xs text-[#166534] flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A] flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-[#14532D]">Recovery Instructions Sent</p>
                    <p className="leading-relaxed text-[#166534]">
                      If an authorized organizational account is linked to <span className="font-semibold underline text-[#14532D]">{forgotEmail}</span>, password reset instructions have been dispatched.
                    </p>
                    <p className="text-[11px] text-[#15803D] pt-1">
                      Please check your official CIL inbox or spam folder to complete the reset.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    id="btn-forgot-modal-done"
                    onClick={handleCloseForgotPasswordModal}
                    className="w-full py-2.5 bg-[#141C2B] hover:bg-[#1E293B] text-white font-semibold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotModalSubmit} className="space-y-4 pt-2">
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Enter your registered official email address. We will send you verification instructions and a secure link to reset your account password.
                </p>

                {forgotError && (
                  <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div>
                  <label 
                    htmlFor="input-forgot-modal-email" 
                    className="block text-xs font-semibold text-[#141C2B] mb-1.5"
                  >
                    Official Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9BAE]" />
                    <input
                      id="input-forgot-modal-email"
                      name="email"
                      type="text"
                      required
                      autoFocus
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g., name@cmpdi.co.in or official email"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-[#E4E0D6] rounded-lg focus:outline-none focus:border-[#C8892E] focus:ring-1 focus:ring-[#C8892E] text-[#141C2B] placeholder:text-[#94A3B8] shadow-2xs transition-all"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="submit"
                    id="btn-submit-forgot-modal"
                    disabled={isSendingReset}
                    className="w-full py-2.5 bg-[#141C2B] hover:bg-[#1E293B] text-white font-semibold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                  >
                    {isSendingReset ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending Instructions...
                      </span>
                    ) : (
                      <>
                        <span>Send Recovery Instructions</span>
                        <ArrowRight className="w-4 h-4 text-[#C8892E]" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    id="btn-cancel-forgot-modal"
                    onClick={handleCloseForgotPasswordModal}
                    className="w-full py-2 text-xs font-medium text-[#64748B] hover:text-[#141C2B] cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
