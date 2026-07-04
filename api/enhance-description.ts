import { GoogleGenAI } from "@google/genai";

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
}
