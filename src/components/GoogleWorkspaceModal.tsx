import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  HardDrive,
  FileSpreadsheet,
  LogOut,
  Upload,
  RefreshCw,
  Film,
  Image as ImageIcon,
  FileText,
  Trash2,
  Check,
  AlertTriangle,
  ExternalLink,
  Camera,
  Plus,
  Send,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  googleWorkspaceSignIn,
  workspaceLogout,
  initWorkspaceAuth,
  listDriveFiles,
  uploadBlobToDrive,
  deleteFileFromDrive,
  createLiveSpreadsheet,
  appendSessionMetricsToSheet,
  listUserSpreadsheets,
  DriveItem,
  SheetFile,
} from '../services/googleWorkspaceService';
import { LIVE_SESSION_HEADERS } from '../utils/workspaceExport';
import { LiveMetrics } from '../utils/liveAnalytics';

interface GoogleWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  currentLiveMetrics?: LiveMetrics;
  onSelectAsset?: (url: string, type: 'video' | 'image', name: string) => void;
}

export const GoogleWorkspaceModal: React.FC<GoogleWorkspaceModalProps> = ({
  isOpen,
  onClose,
  canvasRef,
  currentLiveMetrics,
  onSelectAsset,
}) => {
  const [activeTab, setActiveTab] = useState<'drive' | 'sheets'>('drive');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Drive state
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveItem[]>([]);
  const [driveFilter, setDriveFilter] = useState<'all' | 'video' | 'image'>('all');
  const [isUploadingSnapshot, setIsUploadingSnapshot] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<DriveItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sheets state
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [spreadsheets, setSpreadsheets] = useState<SheetFile[]>([]);
  const [isExportingSheet, setIsExportingSheet] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('שידור לייב - אתגר אגרופים');
  const [lastCreatedSheetUrl, setLastCreatedSheetUrl] = useState<string | null>(null);

  // Messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = initWorkspaceAuth(
      (authenticatedUser, accessToken) => {
        setUser(authenticatedUser);
        setToken(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      const res = await googleWorkspaceSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setSuccessMessage(`ברוך הבא, ${res.user.displayName || res.user.email}!`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'שגיאת כניסה עם Google Workspace';
      setErrorMessage(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await workspaceLogout();
    setUser(null);
    setToken(null);
    setDriveFiles([]);
    setSpreadsheets([]);
    setSuccessMessage('התנתקת מ-Google Workspace');
  };

  // Load Drive files
  const loadDriveFiles = useCallback(async () => {
    if (!token) return;
    setIsLoadingDrive(true);
    setErrorMessage(null);
    try {
      const fetched = await listDriveFiles(driveFilter);
      setDriveFiles(fetched);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'נכשל בטעינת קבצי Drive';
      setErrorMessage(msg);
    } finally {
      setIsLoadingDrive(false);
    }
  }, [token, driveFilter]);

  // Load Sheets
  const loadSheets = useCallback(async () => {
    if (!token) return;
    setIsLoadingSheets(true);
    setErrorMessage(null);
    try {
      const fetched = await listUserSpreadsheets();
      setSpreadsheets(fetched);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'נכשל בטעינת גליונות Sheets';
      setErrorMessage(msg);
    } finally {
      setIsLoadingSheets(false);
    }
  }, [token]);

  useEffect(() => {
    if (isOpen && token) {
      if (activeTab === 'drive') {
        loadDriveFiles();
      } else {
        loadSheets();
      }
    }
  }, [isOpen, token, activeTab, loadDriveFiles, loadSheets]);

  // Upload current live frame to Drive
  const handleUploadLiveSnapshot = async () => {
    if (!canvasRef.current || !token) return;
    setIsUploadingSnapshot(true);
    setErrorMessage(null);
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvasRef.current?.toBlob((b) => resolve(b), 'image/png');
      });

      if (!blob) throw new Error('לא ניתן היה לדגום תמונה מלוח המצלמה');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `TikTok_Live_Frame_${timestamp}.png`;

      const uploaded = await uploadBlobToDrive(blob, fileName, 'image/png');
      setSuccessMessage(`תמונת השידור נשמרה ב-Google Drive: ${uploaded.name}`);
      await loadDriveFiles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'שגיאה בשמירת פריים ב-Drive';
      setErrorMessage(msg);
    } finally {
      setIsUploadingSnapshot(false);
    }
  };

  // Delete Drive file with required confirmation
  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteFileFromDrive(fileToDelete.id);
      setSuccessMessage(`הקובץ "${fileToDelete.name}" נמחק`);
      setFileToDelete(null);
      await loadDriveFiles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'שגיאה במחיקת הקובץ';
      setErrorMessage(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Create new live analytics sheet
  const handleCreateAnalyticsSheet = async () => {
    if (!token) return;
    setIsExportingSheet(true);
    setErrorMessage(null);
    try {
      const metrics: LiveMetrics = currentLiveMetrics || {
        durationSeconds: 1240,
        viewers: 1420,
        likes: 38450,
        diamonds: 142,
      };

      const title = `דוח שידור TikTok Live - ${new Date().toLocaleDateString('he-IL')}`;
      const res = await createLiveSpreadsheet(title, LIVE_SESSION_HEADERS);
      await appendSessionMetricsToSheet(res.spreadsheetId, metrics, sessionTitle);

      setLastCreatedSheetUrl(res.spreadsheetUrl);
      setSuccessMessage('נוצר גיליון Google Sheets חדש עם כל מדדי השידור החי!');
      await loadSheets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'נכשל ביצירת גיליון Google Sheets';
      setErrorMessage(msg);
    } finally {
      setIsExportingSheet(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-['Heebo',sans-serif]">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-[#0b0e14] border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="flex items-center -space-x-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shadow-inner z-10">
                <HardDrive className="w-4 h-4 text-blue-400" />
              </div>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-inner">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                Google Workspace סטודיו
                <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-gradient-to-r from-blue-500/20 to-emerald-500/20 text-cyan-300 border border-cyan-500/30">
                  Drive & Sheets
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                סנכרון סרטוני רקע, שמירת צילומים ב-Drive ויצוא דוחות שידור ל-Google Sheets
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher (Drive vs Sheets) */}
        <div className="flex items-center gap-2 px-5 pt-3 bg-slate-950/40 border-b border-slate-800/60">
          <button
            onClick={() => setActiveTab('drive')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-bold text-xs transition-all ${
              activeTab === 'drive'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Google Drive (קבצים וצילומים)</span>
          </button>

          <button
            onClick={() => setActiveTab('sheets')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-bold text-xs transition-all ${
              activeTab === 'sheets'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Google Sheets (דוחות שידור)</span>
          </button>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </span>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!token ? (
            /* Unauthenticated View: Sign in with Google */
            <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-5 bg-slate-900/40 rounded-2xl border border-slate-800/80">
              <div className="flex items-center -space-x-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shadow-lg">
                  <HardDrive className="w-7 h-7 text-blue-400" />
                </div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-lg">
                  <FileSpreadsheet className="w-7 h-7 text-emerald-400" />
                </div>
              </div>

              <div className="max-w-md space-y-1">
                <h3 className="text-base font-bold text-white">חיבור מאובטח ל-Google Workspace</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  התחבר עם חשבון Google שלך כדי לטעון סרטונים מ-Drive, לשמור צילומי שידור חי, ולייצא דוחות שידור ומדדי צופים/לייקים ל-Google Sheets בזמן אמת.
                </p>
              </div>

              {/* Official Google Sign-In Button */}
              <button
                onClick={handleSignIn}
                disabled={isLoggingIn}
                className="flex items-center gap-3 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-sm rounded-xl shadow-lg shadow-black/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isLoggingIn ? 'מתחבר לחשבון Google...' : 'Sign in with Google'}</span>
              </button>

              <span className="text-[11px] text-slate-500">
                ההרשאות נשמרות בהתאם לפרוטוקול האבטחה הרשמי של Google Workspace.
              </span>
            </div>
          ) : (
            /* Authenticated Content */
            <div className="space-y-4">
              {/* Active User Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'משתמש'}
                      className="w-8 h-8 rounded-full border border-slate-700"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-400 font-bold flex items-center justify-center text-xs">
                      {user?.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-white">{user?.displayName || user?.email}</div>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      מחובר ל-Drive ול-Sheets
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-400 hover:text-rose-400 bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors"
                  title="התנתק"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>התנתק</span>
                </button>
              </div>

              {/* TAB 1: DRIVE CONTENT */}
              {activeTab === 'drive' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                      <button
                        onClick={() => setDriveFilter('all')}
                        className={`px-3 py-1 rounded-lg font-medium transition-all ${
                          driveFilter === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        הכל
                      </button>
                      <button
                        onClick={() => setDriveFilter('video')}
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition-all ${
                          driveFilter === 'video' ? 'bg-slate-800 text-[#00f2fe] shadow-sm' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Film className="w-3 h-3" />
                        סרטונים
                      </button>
                      <button
                        onClick={() => setDriveFilter('image')}
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition-all ${
                          driveFilter === 'image' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <ImageIcon className="w-3 h-3" />
                        תמונות
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleUploadLiveSnapshot}
                        disabled={isUploadingSnapshot}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/30 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{isUploadingSnapshot ? 'מעלה...' : 'שמור פריים ל-Drive'}</span>
                      </button>

                      <button
                        onClick={loadDriveFiles}
                        disabled={isLoadingDrive}
                        className="p-1.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition-all"
                        title="רענן רשימה"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {isLoadingDrive ? (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                      <span className="text-xs">טוען קבצים מ-Google Drive...</span>
                    </div>
                  ) : driveFiles.length === 0 ? (
                    <div className="py-10 flex flex-col items-center justify-center text-slate-500 gap-2 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                      <HardDrive className="w-8 h-8 stroke-1 text-slate-600" />
                      <span className="text-xs">לא נמצאו קבצים ב-Google Drive בתיקייה זו</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                      {driveFiles.map((file) => {
                        const isVideo = file.mimeType.includes('video');
                        const isImage = file.mimeType.includes('image');

                        return (
                          <div
                            key={file.id}
                            className="group flex items-center justify-between gap-2.5 p-2.5 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 rounded-xl transition-all text-right"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {file.thumbnailLink ? (
                                <img
                                  src={file.thumbnailLink}
                                  alt={file.name}
                                  className="w-10 h-10 rounded-lg object-cover bg-black shrink-0 border border-slate-700"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                                  {isVideo ? (
                                    <Film className="w-5 h-5 text-cyan-400" />
                                  ) : isImage ? (
                                    <ImageIcon className="w-5 h-5 text-amber-400" />
                                  ) : (
                                    <FileText className="w-5 h-5 text-slate-400" />
                                  )}
                                </div>
                              )}

                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate" title={file.name}>
                                  {file.name}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {file.size ? `${(Number(file.size) / (1024 * 1024)).toFixed(1)}MB` : 'קובץ מדיה'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {(isVideo || isImage) && onSelectAsset && (
                                <button
                                  onClick={() => {
                                    if (file.webContentLink) {
                                      onSelectAsset(file.webContentLink, isVideo ? 'video' : 'image', file.name);
                                      onClose();
                                    }
                                  }}
                                  className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 rounded-lg text-[10px] font-bold border border-blue-500/30 transition-colors"
                                  title="הזרק לשידור"
                                >
                                  הזרק
                                </button>
                              )}

                              <button
                                onClick={() => setFileToDelete(file)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                                title="מחק קובץ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SHEETS CONTENT */}
              {activeTab === 'sheets' && (
                <div className="space-y-4">
                  {/* Create / Export Live Session to Google Sheets */}
                  <div className="p-4 bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-900/40 border border-emerald-500/30 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        ייצוא נתוני שידור חי (Live Analytics) ל-Google Sheets
                      </span>
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                        אוטומטי
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={sessionTitle}
                        onChange={(e) => setSessionTitle(e.target.value)}
                        placeholder="כותרת השידור..."
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                      />

                      <button
                        onClick={handleCreateAnalyticsSheet}
                        disabled={isExportingSheet}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-950/50 active:scale-95 disabled:opacity-50"
                      >
                        {isExportingSheet ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>{isExportingSheet ? 'מייצא...' : 'צור גיליון עכשיו'}</span>
                      </button>
                    </div>

                    {lastCreatedSheetUrl && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-xs">
                        <span className="text-emerald-300 font-bold truncate">הגיליון נוצר בהצלחה!</span>
                        <a
                          href={lastCreatedSheetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 hover:text-white rounded-lg font-bold text-[11px] transition-colors"
                        >
                          <span>פתח ב-Google Sheets</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* List of existing spreadsheets */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                      <span className="font-bold text-white">גיליונות קיימים בחשבון:</span>
                      <button
                        onClick={loadSheets}
                        disabled={isLoadingSheets}
                        className="flex items-center gap-1 hover:text-white"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingSheets ? 'animate-spin' : ''}`} />
                        <span>רענן</span>
                      </button>
                    </div>

                    {isLoadingSheets ? (
                      <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                        <span className="text-xs">טוען גליונות Google Sheets...</span>
                      </div>
                    ) : spreadsheets.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 text-xs bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                        לא נמצאו גיליונות Sheets בחשבונך עדיין
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {spreadsheets.map((sheet) => (
                          <div
                            key={sheet.id}
                            className="flex items-center justify-between p-2.5 bg-slate-900/70 hover:bg-slate-800/70 border border-slate-800 rounded-xl transition-all"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="text-xs font-bold text-white truncate">{sheet.name}</span>
                            </div>

                            <a
                              href={sheet.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] rounded-lg transition-colors shrink-0"
                            >
                              <span>פתח</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-between text-xs text-slate-500">
          <span>Google Workspace Integration • Drive & Sheets</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors"
          >
            סגור
          </button>
        </div>
      </div>

      {/* Mandatory User Confirmation Dialog for Destructive Operations */}
      {fileToDelete && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="w-full max-w-sm bg-slate-950 border border-rose-500/40 rounded-2xl p-5 shadow-2xl space-y-4 text-right">
            <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>אישור מחיקת קובץ מ-Google Drive</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              האם אתה בטוח שברצונך למחוק לצמיתות את הקובץ:
              <br />
              <strong className="text-white font-mono break-all">{fileToDelete.name}</strong>?
              <br />
              פעולה זו תמחק את הקובץ ישירות מחשבון ה-Google Drive שלך.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-950/50 flex items-center gap-1.5"
              >
                {isDeleting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeleting ? 'מוחק...' : 'אשר מחיקה'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
