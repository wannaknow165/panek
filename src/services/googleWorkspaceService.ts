import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  LIVE_SESSION_HEADERS,
  buildLiveSessionRow,
  buildSupportersRows,
} from '../utils/workspaceExport';
import { LiveMetrics } from '../utils/liveAnalytics';

// Reuse existing app if already initialized
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Google Drive scopes
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/drive');
// Google Sheets scopes
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
}

export interface SheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export const initWorkspaceAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleWorkspaceSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('לא התקבל Access Token מ-Google Workspace');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: unknown) {
    console.error('Google Workspace sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getWorkspaceAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const workspaceLogout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

/* -------------------------------------------------------------
 * 1. Google Drive Methods
 * ----------------------------------------------------------- */

export const listDriveFiles = async (filter: 'all' | 'video' | 'image' | 'sheet' = 'all'): Promise<DriveItem[]> => {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('משתמש אינו מחובר ל-Google Workspace');

  let q = "trashed = false";
  if (filter === 'video') {
    q += " and mimeType contains 'video/'";
  } else if (filter === 'image') {
    q += " and mimeType contains 'image/'";
  } else if (filter === 'sheet') {
    q += " and mimeType = 'application/vnd.google-apps.spreadsheet'";
  }

  const queryParams = new URLSearchParams({
    q,
    pageSize: '30',
    fields: 'files(id, name, mimeType, thumbnailLink, webContentLink, webViewLink, size, createdTime, modifiedTime)',
    orderBy: 'modifiedTime desc',
  });

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${queryParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `שגיאת תקשורת עם Google Drive (${response.status})`);
  }

  const data = await response.json();
  return (data.files || []) as DriveItem[];
};

export const uploadBlobToDrive = async (
  blob: Blob,
  fileName: string,
  mimeType: string = 'image/png'
): Promise<DriveItem> => {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('משתמש אינו מחובר ל-Google Workspace');

  const metadata = {
    name: fileName,
    mimeType,
    description: 'הוקלט ונשמר דרך TikTok LIVE Studio & Cloudphone Injector',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const reader = new FileReader();
  const fileDataPromise = new Promise<ArrayBuffer>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });

  const fileData = await fileDataPromise;

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
  const dataHeaderPart = `${delimiter}Content-Type: ${mimeType}\r\n\r\n`;

  const encoder = new TextEncoder();
  const metadataBuffer = encoder.encode(metadataPart);
  const dataHeaderBuffer = encoder.encode(dataHeaderPart);
  const closeDelimiterBuffer = encoder.encode(closeDelimiter);

  const totalLength = metadataBuffer.byteLength + dataHeaderBuffer.byteLength + fileData.byteLength + closeDelimiterBuffer.byteLength;
  const multipartBody = new Uint8Array(totalLength);

  let offset = 0;
  multipartBody.set(metadataBuffer, offset);
  offset += metadataBuffer.byteLength;
  multipartBody.set(dataHeaderBuffer, offset);
  offset += dataHeaderBuffer.byteLength;
  multipartBody.set(new Uint8Array(fileData), offset);
  offset += fileData.byteLength;
  multipartBody.set(closeDelimiterBuffer, offset);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `שגיאה בהעלאת קובץ ל-Google Drive (${response.status})`);
  }

  return await response.json();
};

export const deleteFileFromDrive = async (fileId: string): Promise<boolean> => {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('משתמש אינו מחובר ל-Google Workspace');

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok && response.status !== 204) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `שגיאה במחיקת קובץ (${response.status})`);
  }

  return true;
};

/* -------------------------------------------------------------
 * 2. Google Sheets Methods
 * ----------------------------------------------------------- */

/**
 * Creates a new Google Sheet spreadsheet for Live Analytics or Supporters
 */
export const createLiveSpreadsheet = async (
  title: string,
  headers: string[],
  initialRows: (string | number)[][] = []
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('משתמש אינו מחובר ל-Google Workspace');

  const sheetData = [headers, ...initialRows];

  const payload = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'נתוני שידור לייב',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: sheetData.map((row) => ({
              values: row.map((cell) => ({
                userEnteredValue:
                  typeof cell === 'number'
                    ? { numberValue: cell }
                    : { stringValue: String(cell) },
              })),
            })),
          },
        ],
      },
    ],
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `שגיאה ביצירת גיליון Google Sheets (${response.status})`);
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
  };
};

/**
 * Appends live metrics to an existing Google Sheet
 */
export const appendSessionMetricsToSheet = async (
  spreadsheetId: string,
  metrics: LiveMetrics,
  sessionTitle: string = 'שידור TikTok Live'
): Promise<boolean> => {
  const token = await getWorkspaceAccessToken();
  if (!token) throw new Error('משתמש אינו מחובר ל-Google Workspace');

  // First fetch spreadsheet metadata to get the actual tab name (Best Practice)
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const metaData = await metaRes.json();
  const firstSheetName = metaData?.sheets?.[0]?.properties?.title || 'Sheet1';

  const newRow = buildLiveSessionRow(metrics, sessionTitle);

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(firstSheetName)}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [newRow],
      }),
    }
  );

  if (!appendRes.ok) {
    const errorData = await appendRes.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `שגיאה בהוספת שורה לגיליון (${appendRes.status})`);
  }

  return true;
};

/**
 * List all Google Sheets available in the user's account
 */
export const listUserSpreadsheets = async (): Promise<SheetFile[]> => {
  const files = await listDriveFiles('sheet');
  return files.map((f) => ({
    id: f.id,
    name: f.name,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit`,
  }));
};
