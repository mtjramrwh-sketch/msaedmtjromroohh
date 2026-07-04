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
    const { appsScriptUrl, method, payload, params } = req.body;
    if (!appsScriptUrl) {
      return res.status(400).json({ error: "رابط Apps Script مطلوب للتمرير" });
    }

    let fetchUrl = appsScriptUrl;
    if (params && Object.keys(params).length > 0) {
      const urlObj = new URL(appsScriptUrl);
      Object.entries(params).forEach(([key, val]) => {
        urlObj.searchParams.set(key, String(val));
      });
      fetchUrl = urlObj.toString();
    }

    const fetchOptions: any = {
      method: method || "GET",
    };

    if (method === "POST" && payload) {
      fetchOptions.headers = {
        "Content-Type": "text/plain;charset=utf-8",
      };
      fetchOptions.body = typeof payload === "string" ? payload : JSON.stringify(payload);
    }

    const response = await fetch(fetchUrl, fetchOptions);

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return res.json(data);
    } else {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        return res.json(data);
      } catch {
        return res.status(response.status).send(text);
      }
    }
  } catch (err: any) {
    console.error("Proxy Apps Script error:", err);
    res.status(400).json({ error: err.message || "حدث خطأ أثناء تمرير الطلب عبر الخادم." });
  }
}
