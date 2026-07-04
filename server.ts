import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Gemini description enhancement
  app.post("/api/enhance-description", async (req, res) => {
    try {
      const { text, tone } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ error: "الرجاء إدخال وصف المنتج أولاً ليتم تحسينه بالذكاء الاصطناعي." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          error: "لم يتم العثور على مفتاح API الخاص بـ Gemini (GEMINI_API_KEY) في خادم التطبيق سحابياً. يرجى إدخاله أو التأكد من إضافته في إعدادات لوحة التحكم." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      let systemInstruction = "أنت كاتب محتوى تسويقي مبدع ومحترف للغاية لمتجر 'أم روح' (Um Rouh Store)، وهو متجر فاخر في المملكة العربية السعودية للملابس والعبايات والفساتين الراقية والمنتجات الحصرية ذات الذوق الرفيع وبهاء التفاصيل. مهمتك هي إعادة صياغة النص المدخل (وصف المنتج) بأسلوب مبهر، وجذاب، يضفي لمسة من الفخامة والأناقة، ويخاطب العميل بتقدير وود رفيعين. يجب عليك الالتزام بالمعايير التالية:\n" +
        "1. الحفاظ على كافة المعلومات الأساسية والبيانات الحقيقية بدقة تامة (الأسعار، مقاسات الفساتين والعبايات، خامات الأقمشة، الألوان، أية روابط أو تفاصيل أخرى).\n" +
        "2. تحسين البنية والترتيب باستخدام أسطر متباعدة ورموز تعبيرية (emojis) جذابة تليق بهوية المتجر الفاخرة.\n" +
        "3. الابتعاد التام عن المصطلحات المبتذلة والترجمة الحرفية.\n" +
        "4. جعل النص يبدو طبيعياً ومحفزاً لعملية الشراء والاشتراك بالقناة.";
      
      if (tone === "poetic") {
        systemInstruction += "\n\nركّز بقوة على أسلوب شاعري أدبي رفيع المستوى، يفيض بعبارات الترحيب التراثية الفاخرة، ومفردات الجمال والأناقة والزهور وسحر الحضور، بحيث يبدو المنشور لوحة فنية ساحرة تعبر عن الود الأبدي لعملاء متجر أم روح.";
      } else if (tone === "concise") {
        systemInstruction += "\n\nاجعل الأسلوب مقتضباً وذكياً ومباشراً ومجدولاً في نقاط سريعة واضحة دون حشو أو إطالة, لتسهيل النشر والمشاركة الفورية وسرعة القراءة السحابية.";
      } else if (tone === "excited") {
        systemInstruction += "\n\nاجعل الأسلوب حماسياً للغاية ومثيراً للفضول والتشويق، يدعو العميل لاتخاذ قرار فوري واقتناء المنتج الفاخر قبل نفاد الكمية المحدودة والحصرية.";
      } else {
        systemInstruction += "\n\nاجعل الأسلوب تسويقياً جذاباً ومقنعاً ومتوازناً، يبرز جمال ومميزات الصنف والخصومات الخاصة بطريقة احترافية وراقية جداً.";
      }

      const prompt = `الرجاء تحسين وإعادة صياغة النص التالي بأسلوب احترافي:\n\n"${text}"`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      const enhancedText = response.text || "";
      res.json({ success: true, text: enhancedText });
    } catch (err: any) {
      console.error("Gemini enhancement error:", err);
      res.status(500).json({ error: err.message || "حدث خطأ غير متوقع أثناء معالجة النص بالذكاء الاصطناعي." });
    }
  });

  // Proxy route for Google Apps Script requests to bypass browser CORS completely
  app.post("/api/proxy-apps-script", async (req, res) => {
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
  });

  // Proxy route for direct Google Drive file downloading to bypass CORS completely
  app.post("/api/proxy-drive-direct-download", async (req, res) => {
    try {
      const { fileId, apiKey } = req.body;
      if (!fileId) {
        return res.status(400).json({ error: "معرّف الملف مطلوب" });
      }

      // We will try multiple Google Drive direct download/CDN endpoints in order of reliability.
      // 0. Official Drive API media download (extremely reliable, bypassed Cloud Run blocks, requires API Key)
      // 1. lh3.googleusercontent.com/d/FILE_ID (extremely reliable for images, bypasses warning pages, supports original size)
      // 2. drive.google.com/thumbnail?id=FILE_ID&sz=w2000 (high-quality preview, fully public CDN, very reliable fallback)
      // 3. drive.google.com/uc?export=download&id=FILE_ID (traditional link, may show HTML virus warning for larger files)
      
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

      let lastError = null;
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
          lastError = err;
        }
      }

      if (!responseToUse) {
        return res.status(400).json({ 
          error: "فشل تحميل الملف من Google Drive عبر جميع البوابات المتاحة. تأكد من أن الملف عام للجميع (Anyone with link)." 
        });
      }

      const contentType = responseToUse.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      
      const buffer = await responseToUse.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (err: any) {
      console.error("Proxy direct download error:", err);
      res.status(400).json({ error: err.message || "حدث خطأ أثناء تحميل الملف عبر الخادم." });
    }
  });

  // Vite middleware or static files depending on the environment
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
