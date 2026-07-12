import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

console.log("GEMINI_API_KEY =", process.env.GEMINI_API_KEY);

// دالة مساعدة لتنفيذ طلبات الذكاء الاصطناعي مع معالجة الأخطاء وإعادة المحاولة في حال وجود ضغط على السيرفر، مع إمكانية استخدام نموذج احتياطي
async function generateContentWithRetry(
  aiClient: any,
  primaryModel: string,
  fallbackModel: string,
  contents: any[],
  config: any,
  maxRetries = 2
) {
  let lastError: any = null;
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // المحاولة مع النموذج الأساسي
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[AI] Attempting ${primaryModel} (Attempt ${attempt}/${maxRetries})...`);
      const response = await aiClient.models.generateContent({
        model: primaryModel,
        contents,
        config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const errorMessage = err?.message || String(err);
      console.warn(`[AI] Attempt ${attempt} on ${primaryModel} failed:`, errorMessage);

      const isTransient =
        errorMessage.includes("503") ||
        errorMessage.includes("demand") ||
        errorMessage.includes("temporary") ||
        errorMessage.includes("UNAVAILABLE") ||
        errorMessage.includes("429") ||
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        err?.status === 503 ||
        err?.status === 429;

      if (isTransient && attempt < maxRetries) {
        const waitTime = attempt * 1200;
        console.log(`[AI] Retrying primary model in ${waitTime}ms...`);
        await delay(waitTime);
      } else {
        break;
      }
    }
  }

  // المحاولة مع النموذج الاحتياطي
  console.warn(`[AI] Switching to fallback model: ${fallbackModel}`);
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[AI] Attempting ${fallbackModel} (Attempt ${attempt}/${maxRetries})...`);
      const response = await aiClient.models.generateContent({
        model: fallbackModel,
        contents,
        config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const errorMessage = err?.message || String(err);
      console.warn(`[AI] Attempt ${attempt} on fallback ${fallbackModel} failed:`, errorMessage);

      const isTransient =
        errorMessage.includes("503") ||
        errorMessage.includes("demand") ||
        errorMessage.includes("temporary") ||
        errorMessage.includes("UNAVAILABLE") ||
        errorMessage.includes("429") ||
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        err?.status === 503 ||
        err?.status === 429;

      if (isTransient && attempt < maxRetries) {
        const waitTime = attempt * 1000;
        console.log(`[AI] Retrying fallback model in ${waitTime}ms...`);
        await delay(waitTime);
      } else {
        break;
      }
    }
  }

  // إذا فشل كل شيء، قم برمي الخطأ الأخير مع رسالة عربية واضحة
  const readableMessage =
    "سيرفرات الذكاء الاصطناعي من Google تشهد ضغطاً كبيراً مؤقتاً حالياً. يرجى الانتظار بضع ثوانٍ ثم إعادة المحاولة.";
  const enhancedError = new Error(`${readableMessage} (تفاصيل الخطأ: ${lastError?.message || lastError})`);
  (enhancedError as any).status = lastError?.status || 503;
  throw enhancedError;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase body size limits for base64 file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Initialize Gemini client safely
  let ai: GoogleGenAI | null = null;
  try {
    if (process.env.GEMINI_API_KEY) {
      ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  } catch (err) {
    console.error("Failed to initialize Gemini:", err);
  }

  // API routes FIRST
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, file, history } = req.body;

      if (!process.env.GEMINI_API_KEY || !ai) {
        return res.status(500).json({ 
          error: "لم يتم تكوين مفتاح واجهة برمجة تطبيقات Gemini (GEMINI_API_KEY) في إعدادات المنصة. يرجى إضافته أولاً من لوحة الإعدادات." 
        });
      }

      // Convert history to contents structure if needed, or build contents array
      const contents: any[] = [];

      // Add history if present
      if (history && Array.isArray(history)) {
        for (const h of history) {
          contents.push({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content }]
          });
        }
      }

      // Add current message with optional file
      const currentParts: any[] = [];
      if (file && file.data && file.mimeType) {
        currentParts.push({
          inlineData: {
            mimeType: file.mimeType,
            data: file.data
          }
        });
      }
      currentParts.push({ text: message || "قم بتحليل هذا الملف واستخراج بيانات الطلاب منه إن وجدت." });

      contents.push({
        role: "user",
        parts: currentParts
      });

      const SYSTEM_INSTRUCTION = `أنت المساعد الذكي لإدارة شؤون الطلاب بمعهد عبد الفتاح عزام بنين الأزهري.
مهمتك هي مساعدة الإدارة والإجابة على الأسئلة وأيضاً قراءة وتحليل الملفات المرفوعة (مثل الصور، ملفات PDF، والنصوص والبيانات المستخرجة من جداول إكسل) لاستخراج بيانات الطلاب وإضافتها تلقائياً إلى النظام.

قيد صارم وهام جداً:
يجب أن تقتصر إجاباتك كلياً على شؤون الطلاب وإدارة معهد عبد الفتاح عزام بنين الأزهري والبيانات والدرجات والغياب والاستفسارات المباشرة للمعهد.
يُمنع منعاً باتاً الإجابة على أي أسئلة خارجية أو عامة غير متعلقة بالمعهد أو الطلاب أو النظام (مثل الأسئلة العامة، البرمجة، العلوم الأخرى، كتابة المقالات، إلخ).
إذا سألك المستخدم سؤالاً خارجياً أو عاماً لا علاقة له بالمعهد وشؤون طلابه، يجب أن ترد عليه بنص مؤدب كالتالي: "عذراً، أنا المساعد الذكي لمعهد عبد الفتاح عزام بنين الأزهري ومخصص فقط لمساعدتك في شؤون الطلاب والدرجات والغياب الخاصة بالمعهد. لا يمكنني الإجابة على استفسارات خارج هذا النطاق."

إذا كان الملف أو الرسالة تحتوي على بيانات طلاب (سواء طالب واحد أو مجموعة طلاب):
1. قم باستخراج بيانات كل طالب بدقة فائقة.
2. قم بملء الحقول المقابلة في قائمة 'extractedStudents' وفقاً للقواعد التالية:
   - الاسم بالكامل (name): الاسم العربي الثلاثي أو الرباعي للطالب.
   - المرحلة (stage): يجب أن تكون إما 'prep' (للمرحلة الإعدادية) أو 'secondary' (للمرحلة الثانوية).
   - الصف الدراسي (grade): يجب أن تكون قيمة من القيم المحددة حصراً: '1_prep' (الأول الإعدادي)، '2_prep' (الثاني الإعدادي)، '3_prep' (الثالث الإعدادي)، '1_secondary' (الأول الثانوي)، '2_secondary' (الثاني الثانوي).
   - الفصل (classRoom): الفصل المدرسي (مثل '1/1' أو 'أ' أو 'ب'). إذا لم يذكر، اجعل القيمة الافتراضية '1/1'.
   - المذهب الفقهي (madhhab): يجب أن يكون دائماً 'hanafi' (حنفي) لأن المعهد حنفي فقط.
   - الرقم القومي (nationalId): الرقم القومي المكون من 14 رقماً. إذا لم يذكر، حاول تخمينه أو تكوين رقم قومي افتراضي متوافق مع تاريخ ميلاده (مثال: يبدأ بـ 3 ثم تاريخ الميلاد YYMMDD ثم أرقام عشوائية).
   - تاريخ الميلاد (birthDate): بصيغة YYYY-MM-DD. إذا لم يذكر، قم باستخراجه من الرقم القومي (حيث أن الرقم القومي المصري يحتوي على تاريخ الميلاد في الأرقام من الثاني إلى السابع، والقم الأول 3 للمواليد من 2000 فصاعداً).
   - الجنس (gender): يجب أن يكون دائماً 'male' (ذكر) لأن المعهد للبنين فقط.
   - اسم ولي الأمر (guardianName): اسم الأب أو ولي الأمر بالكامل. إذا لم يذكر، استنتجه من اسم الطالب (الأب والجد).
   - هاتف ولي الأمر (guardianPhone): رقم الهاتف المكون من 11 رقماً ويبدأ بـ 01. إذا لم يذكر، اجعل القيمة الافتراضية '01000000000'.
   - العنوان (address): يجب أن يكون دائماً قيمة فارغة '' نظراً لإلغاء هذا الحقل من النظام.
   - حالة القيد (enrollmentStatus): يجب أن يكون 'new' (مستجد) أو 'repeating' (باق للإعادة). القيمة الافتراضية 'new'.
   - ملاحظات (notes): أي ملاحظات إضافية.

تذكر دائماً أن تكتب الرد النصي 'reply' بلغة عربية فصيحة ومهذبة، تشرح فيها ما قمت باستخراجه وعدد الطلاب الذين وجدت بياناتهم وتدعو المسؤول لمراجعة البيانات وحفظها بنقرة زر واحدة.`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description: "الرد النصي باللغة العربية لشرح نتائج التحليل أو الإجابة على استفسار المستخدم."
          },
          extractedStudents: {
            type: Type.ARRAY,
            description: "قائمة الطلاب المستخرجة بياناتهم.",
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                stage: { type: Type.STRING, enum: ["prep", "secondary"] },
                grade: { type: Type.STRING, enum: ["1_prep", "2_prep", "3_prep", "1_secondary", "2_secondary"] },
                classRoom: { type: Type.STRING },
                madhhab: { type: Type.STRING, enum: ["hanafi"] },
                nationalId: { type: Type.STRING },
                birthDate: { type: Type.STRING },
                gender: { type: Type.STRING, enum: ["male", "female"] },
                guardianName: { type: Type.STRING },
                guardianPhone: { type: Type.STRING },
                address: { type: Type.STRING },
                enrollmentStatus: { type: Type.STRING, enum: ["new", "repeating"] },
                notes: { type: Type.STRING }
              },
              required: ["name", "stage", "grade", "classRoom", "madhhab", "nationalId", "birthDate", "gender", "guardianName", "guardianPhone", "address", "enrollmentStatus"]
            }
          }
        },
        required: ["reply"]
      };

      const aiResponse = await generateContentWithRetry(
        ai,
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
        contents,
        {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      );

      const responseText = aiResponse.text;
      if (!responseText) {
        throw new Error("لم يتم تلقي أي استجابة من الذكاء الاصطناعي.");
      }

      const result = JSON.parse(responseText.trim());
      res.json(result);

    } catch (error: any) {
      console.error("AI Chat API Error:", error);
      res.status(500).json({ error: error.message || "حدث خطأ غير متوقع أثناء معالجة طلبك." });
    }
  });

  // توجيه مباشر لملف خريطة الموقع (sitemap.xml) لضمان سهولة أرشفته من محركات البحث
  app.get('/sitemap.xml', (req, res) => {
    res.setHeader('Content-Type', 'application/xml');
    res.sendFile(path.join(process.cwd(), 'public', 'sitemap.xml'));
  });

  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
