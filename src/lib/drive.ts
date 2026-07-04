import { DriveFile } from '../types';

/**
 * Extracts the folder ID from a Google Drive URL or returns the input if it's already an ID.
 */
export function extractFolderId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // Match folder url patterns like:
  // https://drive.google.com/drive/folders/1A2B3C4D5E...
  // https://drive.google.com/drive/u/0/folders/1A2B3C4D5E...
  const urlMatch = trimmed.match(/folders\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  
  // Match alternative query parameters like open?id=...
  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (queryMatch && queryMatch[1]) {
    return queryMatch[1];
  }
  
  return trimmed;
}

/**
 * Generates the standard direct download/viewing link for a Google Drive file,
 * which is highly useful for e-commerce dashboards (e.g. Salla, Zid).
 */
export function getDirectLink(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Generates a high-quality thumbnail/preview URL for a Google Drive file.
 */
export function getThumbnailUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w600`;
}

/**
 * Converts a File object to base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

/**
 * Helper to handle JSON response and check for iframe cookie redirection pages.
 */
async function handleResponseJson(response: Response, defaultError: string): Promise<any> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    throw new Error("تنبيه أمان الإطار: يرجى فتح التطبيق في نافذة جديدة (New Tab) لتجاوز قيود حظر كوكيز المعاينة.");
  }
  
  try {
    return await response.json();
  } catch (err) {
    throw new Error(defaultError || "فشل قراءة الاستجابة من الخادم (ليست بصيغة JSON صالحة).");
  }
}

/**
 * Lists image files inside a specific Google Drive folder using Google Apps Script Web App.
 */
export async function listFolderImages(folderId: string, appsScriptUrl: string, apiKey: string): Promise<DriveFile[]> {
  if (!appsScriptUrl) {
    throw new Error('الرجاء إعداد رابط Google Apps Script Web App في تبويب الإعدادات أولاً.');
  }

  // 1. Try DIRECT fetch to Google Apps Script Web App from the browser first!
  // This completely bypasses our backend and avoids any __cookie_check.html / iframe cookie issues.
  try {
    const directUrl = new URL(appsScriptUrl);
    directUrl.searchParams.set('action', 'list');
    directUrl.searchParams.set('folderId', folderId);
    directUrl.searchParams.set('apiKey', apiKey);

    const response = await fetch(directUrl.toString(), {
      method: 'GET',
      mode: 'cors'
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.success !== false && data.files) {
        return data.files;
      }
    }
  } catch (err) {
    console.warn('Direct browser fetch for listFolderImages failed, falling back to proxy:', err);
  }

  // 2. Fallback: Use the backend proxy to bypass browser CORS if direct fetch failed
  const response = await fetch('/api/proxy-apps-script', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      appsScriptUrl,
      method: 'GET',
      params: {
        action: 'list',
        folderId,
        apiKey
      }
    })
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      throw new Error("تنبيه أمان الإطار: يرجى فتح التطبيق في نافذة جديدة (New Tab) لتجاوز قيود حظر كوكيز المعاينة.");
    }
    throw new Error(`فشل الاتصال بـ Apps Script (رمز الاستجابة: ${response.status})`);
  }

  const data = await handleResponseJson(response, 'فشل جلب الصور من Google Drive عبر Apps Script');
  if (data && data.success === false) {
    throw new Error(data.error || 'فشل جلب الصور من Google Drive عبر Apps Script');
  }

  return data.files || [];
}

/**
 * Renames a Google Drive file using Google Apps Script Web App.
 */
export async function renameDriveFile(fileId: string, newName: string, appsScriptUrl: string, apiKey: string): Promise<void> {
  if (!appsScriptUrl) {
    throw new Error('الرجاء إعداد رابط Google Apps Script Web App في تبويب الإعدادات أولاً.');
  }

  const response = await fetch('/api/proxy-apps-script', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      appsScriptUrl,
      method: 'POST',
      payload: {
        action: 'rename',
        fileId,
        newName,
        apiKey,
      }
    })
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      throw new Error("تنبيه أمان الإطار: يرجى فتح التطبيق في نافذة جديدة (New Tab) لتجاوز قيود حظر كوكيز المعاينة.");
    }
    throw new Error('فشل إرسال طلب تعديل الاسم إلى Google Apps Script');
  }

  const data = await handleResponseJson(response, 'فشل تعديل الاسم في Google Drive');
  if (data && data.success === false) {
    throw new Error(data.error || 'فشل تعديل الاسم في Google Drive');
  }
}

/**
 * Deletes a Google Drive file using Google Apps Script Web App.
 */
export async function deleteDriveFile(fileId: string, appsScriptUrl: string, apiKey: string): Promise<void> {
  if (!appsScriptUrl) {
    throw new Error('الرجاء إعداد رابط Google Apps Script Web App في تبويب الإعدادات أولاً.');
  }

  const response = await fetch('/api/proxy-apps-script', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      appsScriptUrl,
      method: 'POST',
      payload: {
        action: 'delete',
        fileId,
        apiKey,
      }
    })
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      throw new Error("تنبيه أمان الإطار: يرجى فتح التطبيق في نافذة جديدة (New Tab) لتجاوز قيود حظر كوكيز المعاينة.");
    }
    throw new Error('فشل إرسال طلب الحذف إلى Google Apps Script');
  }

  const data = await handleResponseJson(response, 'فشل حذف الملف من Google Drive');
  if (data && data.success === false) {
    throw new Error(data.error || 'فشل حذف الملف من Google Drive');
  }
}

/**
 * Uploads an image file to a Google Drive folder using Google Apps Script Web App.
 */
export async function uploadImageToDrive(
  folderId: string,
  file: File,
  customName: string,
  appsScriptUrl: string,
  apiKey: string
): Promise<DriveFile> {
  if (!appsScriptUrl) {
    throw new Error('الرجاء إعداد رابط Google Apps Script Web App في تبويب الإعدادات أولاً.');
  }

  const fileBase64 = await fileToBase64(file);
  const fileName = customName.trim() ? customName.trim() : file.name;

  const response = await fetch('/api/proxy-apps-script', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      appsScriptUrl,
      method: 'POST',
      payload: {
        action: 'upload',
        folderId,
        fileName,
        fileBase64,
        mimeType: file.type || 'image/jpeg',
        apiKey,
      }
    })
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      throw new Error("تنبيه أمان الإطار: يرجى فتح التطبيق في نافذة جديدة (New Tab) لتجاوز قيود حظر كوكيز المعاينة.");
    }
    throw new Error('فشل إرسال ملف الصورة لـ Google Apps Script');
  }

  const data = await handleResponseJson(response, 'فشل رفع وحفظ الصورة في Google Drive');
  if (data && data.success === false) {
    throw new Error(data.error || 'فشل رفع وحفظ الصورة في Google Drive');
  }

  return data.file;
}

/**
 * Fetches a Google Drive file as a Blob, bypassing CORS issues by utilizing either the Google Apps Script gateway or our robust backend direct proxy.
 */
export async function fetchDriveFileAsBlob(fileId: string, appsScriptUrl: string, apiKey: string): Promise<Blob> {
  // 0. Try DIRECT fetch to Google Apps Script Web App from the browser first!
  // This completely bypasses our backend and avoids any __cookie_check.html / iframe cookie issues.
  if (appsScriptUrl) {
    try {
      const directUrl = new URL(appsScriptUrl);
      directUrl.searchParams.set('action', 'get_base64');
      directUrl.searchParams.set('fileId', fileId);
      directUrl.searchParams.set('apiKey', apiKey);

      const response = await fetch(directUrl.toString(), {
        method: 'GET',
        mode: 'cors'
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/html")) {
          const data = await response.json();
          if (data && data.success !== false && data.base64) {
            const byteCharacters = atob(data.base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            return new Blob([byteArray], { type: data.mimeType || 'image/jpeg' });
          }
        }
      }
    } catch (err) {
      console.warn('Direct browser fetch from Apps Script for get_base64 failed:', err);
    }
  }

  // 1. Try Google Apps Script Proxy GET request (if url is provided)
  if (appsScriptUrl) {
    try {
      const response = await fetch('/api/proxy-apps-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appsScriptUrl,
          method: 'GET',
          params: {
            action: 'get_base64',
            fileId,
            apiKey
          }
        })
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/html")) {
          const data = await response.json();
          if (data && data.success !== false && data.base64) {
            const byteCharacters = atob(data.base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            return new Blob([byteArray], { type: data.mimeType || 'image/jpeg' });
          } else if (data && data.success === false) {
            console.warn('Proxy Apps Script returned success=false for GET get_base64:', data.error);
          }
        }
      }
    } catch (err) {
      console.warn('Proxy Apps Script get_base64 GET fetch failed:', err);
    }

    // 2. Try Google Apps Script Proxy POST request
    try {
      const response = await fetch('/api/proxy-apps-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appsScriptUrl,
          method: 'POST',
          payload: {
            action: 'get_base64',
            fileId,
            apiKey
          }
        })
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/html")) {
          const data = await response.json();
          if (data && data.success !== false && data.base64) {
            const byteCharacters = atob(data.base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            return new Blob([byteArray], { type: data.mimeType || 'image/jpeg' });
          }
        }
      }
    } catch (err) {
      console.warn('Proxy Apps Script get_base64 POST fetch failed:', err);
    }
  }

  // 3. Fallback: proxy direct download or CDN URLs through our own backend (does NOT require Apps Script!)
  try {
    const response = await fetch('/api/proxy-drive-direct-download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileId, apiKey })
    });
    if (response.ok) {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        throw new Error("تنبيه أمان المعاينة: يرجى فتح التطبيق في نافذة مستقلة جديدة (New Tab) لتجاوز قيود حماية الكوكيز.");
      }
      return await response.blob();
    } else {
      let errorMsg = '';
      try {
        const text = await response.text();
        try {
          const errJson = JSON.parse(text);
          if (errJson && errJson.error) {
            errorMsg = errJson.error;
          }
        } catch {
          if (text) {
            errorMsg = text.slice(0, 150);
          }
        }
      } catch {
        // ignore
      }
      throw new Error(errorMsg || `HTTP error ${response.status}`);
    }
  } catch (err: any) {
    console.warn('Proxy direct download URL fetch failed:', err);
    throw err;
  }
}

