export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileId, apiKey } = req.body;
    if (!fileId) {
      return res.status(400).json({ error: "معرّف الملف مطلوب" });
    }

    const urlsToTry: string[] = [];
    const isRealApiKey = apiKey && apiKey !== "um_rouh_secret_key" && apiKey.length > 20;
    if (isRealApiKey) {
      urlsToTry.push(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`);
    }
    urlsToTry.push(
      `https://lh3.googleusercontent.com/d/${fileId}`,
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`,
      `https://drive.google.com/uc?export=download&id=${fileId}`
    );

    let responseToUse: any = null;

    for (const url of urlsToTry) {
      try {
        console.log(`Proxy direct download trying URL: ${url}`);
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        if (response.ok) {
          const contentType = response.headers.get("content-type") || "";
          // Ensure we didn't get a virus scanner HTML page or error page
          if (!contentType.includes("text/html")) {
            responseToUse = response;
            break;
          } else {
            console.warn(`URL returned HTML instead of raw file: ${url}`);
          }
        } else {
          console.warn(`URL failed with status ${response.status}: ${url}`);
        }
      } catch (err: any) {
        console.error(`Error fetching from ${url}:`, err);
      }
    }

    if (!responseToUse) {
      return res.status(400).json({ 
        error: "فشل تحميل الملف من Google Drive عبر جميع البوابات المتاحة. تأكد من أن الملف عام للجميع (Anyone with link)." 
      });
    }

    const contentType = responseToUse.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    
    const arrayBuffer = await responseToUse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.status(200).send(buffer);
  } catch (err: any) {
    console.error("Proxy direct download error:", err);
    res.status(400).json({ error: err.message || "حدث خطأ أثناء تحميل الملف عبر الخادم." });
  }
}
