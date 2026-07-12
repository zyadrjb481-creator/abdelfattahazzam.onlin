import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { 
  Bot, 
  User, 
  Send, 
  Paperclip, 
  X, 
  FileText, 
  Image as ImageIcon, 
  AlertCircle, 
  CheckCircle, 
  UserPlus, 
  Trash2, 
  Edit2, 
  Loader2, 
  CornerDownLeft, 
  Check, 
  ArrowRight,
  Database,
  GraduationCap
} from 'lucide-react';
import { Student, AcademicStage, GradeLevel, Madhhab, EnrollmentStatus } from '../types';
import { addStudentToDB } from '../firebase';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  file?: {
    name: string;
    type: string;
  };
  extractedStudents?: any[];
}

interface AIChatManagerProps {
  onStudentsImported: () => void;
}

export default function AIChatManager({ onStudentsImported }: AIChatManagerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: 'مرحباً بك في وحدة المساعد الذكي لمعهد عبد الفتاح عزام الأزهري بنين. 🕌\n\nأنا هنا لمساعدتك في قراءة وتحليل ملفات الطلاب (PDF، صور، أو ملفات إكسل إلكترونية). بمجرد إرفاق الملف، سأقوم باستخراج بيانات الطلاب بدقة وتجهيزها للاستيراد بضغطة زر واحدة إلى قاعدة البيانات مباشرة!',
      timestamp: Date.now()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedFileContent, setParsedFileContent] = useState<{ data: string; mimeType: string; name: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorText, setErrorText] = useState('');
  
  // الطلاب الذين تم استخراجهم وينتظرون التأكيد والاستيراد
  const [pendingStudents, setPendingStudents] = useState<any[]>([]);
  const [selectedPendingIds, setSelectedPendingIds] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // التمرير التلقائي لأسفل الشات
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // دالة تحويل الملف إلى Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64Str = (reader.result as string).split(',')[1];
        resolve(base64Str);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // معالجة اختيار الملف
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorText('');
    setImportSuccessCount(null);

    const allowedTypes = [
      'application/pdf', 
      'image/png', 
      'image/jpeg', 
      'text/csv', 
      'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      setErrorText('نوع الملف غير مدعوم. يرجى إرفاق ملف PDF، صورة، أو جدول إكسل (XLSX/CSV).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorText('حجم الملف كبير جداً. الحد الأقصى المسموح به هو 15 ميجابايت.');
      return;
    }

    setSelectedFile(file);

    try {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv') || file.type.includes('spreadsheet') || file.type.includes('excel') || file.type === 'text/csv') {
        // إذا كان ملف إكسل أو CSV، نقوم بقراءته محلياً باستخدام مكتبة xlsx وتحويله إلى نص CSV
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = new Uint8Array(evt.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            
            // نجهزه كنص عادي لإرساله للذكاء الاصطناعي
            const base64Data = btoa(unescape(encodeURIComponent(csv)));
            setParsedFileContent({
              data: base64Data,
              mimeType: 'text/plain',
              name: file.name
            });
          } catch (err) {
            console.error("Error parsing Excel:", err);
            setErrorText('حدث خطأ أثناء قراءة ملف الإكسل. يرجى التأكد من أن الملف سليم.');
            setSelectedFile(null);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        // ملفات الـ PDF والصور يتم تحويلها إلى Base64 وإرسالها مباشرة
        const base64Data = await fileToBase64(file);
        setParsedFileContent({
          data: base64Data,
          mimeType: file.type,
          name: file.name
        });
      }
    } catch (err) {
      console.error(err);
      setErrorText('فشل معالجة الملف، يرجى المحاولة مرة أخرى.');
      setSelectedFile(null);
    }
  };

  // إرسال الرسالة إلى الـ API
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() && !selectedFile) return;

    setErrorText('');
    setImportSuccessCount(null);
    const userMsgText = inputMessage;
    const fileToUpload = parsedFileContent;
    const originalFile = selectedFile;

    // إضافة رسالة المستخدم للشات
    const userMsg: Message = {
      id: 'msg_' + Math.random().toString(36).substring(2, 11),
      role: 'user',
      content: userMsgText || `لقد قمت بإرفاق الملف التالي لقراءته وتحليله: ${originalFile?.name}`,
      timestamp: Date.now(),
      file: originalFile ? { name: originalFile.name, type: originalFile.type } : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setSelectedFile(null);
    setParsedFileContent(null);
    setIsSending(true);

    try {
      // بناء التاريخ والدردشات السابقة
      const chatHistory = messages.filter(m => m.id !== 'welcome').map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsgText,
          file: fileToUpload,
          history: chatHistory
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'حدث خطأ أثناء التواصل مع خادم الذكاء الاصطناعي.');
      }

      const aiData = await response.json();

      const aiMsg: Message = {
        id: 'msg_' + Math.random().toString(36).substring(2, 11),
        role: 'model',
        content: aiData.reply,
        timestamp: Date.now(),
        extractedStudents: aiData.extractedStudents
      };

      setMessages(prev => [...prev, aiMsg]);

      // إذا كان هناك طلاب مستخرجون
      if (aiData.extractedStudents && aiData.extractedStudents.length > 0) {
        setPendingStudents(aiData.extractedStudents);
        // تفعيل اختيار كافة الطلاب تلقائياً
        const newSelected = new Set<number>();
        aiData.extractedStudents.forEach((_: any, idx: number) => newSelected.add(idx));
        setSelectedPendingIds(newSelected);
      }

    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || 'فشلت معالجة رسالتك بالذكاء الاصطناعي، يرجى المحاولة مجدداً.');
    } finally {
      setIsSending(false);
    }
  };

  // حذف طالب من قائمة الانتظار المستخرجة
  const handleRemovePending = (index: number) => {
    const updated = [...pendingStudents];
    updated.splice(index, 1);
    setPendingStudents(updated);
    
    // تحديث قائمة المحددين
    const newSelected = new Set<number>();
    selectedPendingIds.forEach(id => {
      if (id < index) newSelected.add(id);
      else if (id > index) newSelected.add(id - 1);
    });
    setSelectedPendingIds(newSelected);
  };

  // تحديد/إلغاء تحديد طالب للاستيراد
  const handleToggleSelectPending = (index: number) => {
    const newSelected = new Set(selectedPendingIds);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedPendingIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPendingIds.size === pendingStudents.length) {
      setSelectedPendingIds(new Set());
    } else {
      const newSelected = new Set<number>();
      pendingStudents.forEach((_, idx) => newSelected.add(idx));
      setSelectedPendingIds(newSelected);
    }
  };

  // تعديل طالب من القائمة يدوياً
  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingStudent({ ...pendingStudents[index] });
  };

  const handleSaveEdit = () => {
    if (editingIndex === null || !editingStudent) return;
    const updated = [...pendingStudents];
    updated[editingIndex] = editingStudent;
    setPendingStudents(updated);
    setEditingIndex(null);
    setEditingStudent(null);
  };

  // بدء عملية حفظ واستيراد الطلاب في Firebase
  const handleImportStudents = async () => {
    if (selectedPendingIds.size === 0) return;
    setIsImporting(true);
    setImportSuccessCount(null);
    setErrorText('');

    let successCount = 0;
    const studentsToImport = pendingStudents.filter((_, idx) => selectedPendingIds.has(idx));

    try {
      for (const std of studentsToImport) {
        // إعداد الهيكل المتطابق مع شروط النظام
        const payload: Omit<Student, 'id'> = {
          name: std.name || 'طالب جديد',
          stage: (std.stage as AcademicStage) || 'prep',
          grade: (std.grade as GradeLevel) || '1_prep',
          classRoom: std.classRoom || '1/1',
          madhhab: 'hanafi',
          nationalId: std.nationalId || '31201010123456',
          birthDate: std.birthDate || '2012-01-01',
          gender: std.gender || 'male',
          guardianName: std.guardianName || 'ولي أمر',
          guardianPhone: std.guardianPhone || '01000000000',
          address: std.address || 'الشرقية',
          enrollmentStatus: (std.enrollmentStatus as EnrollmentStatus) || 'new',
          notes: std.notes || 'مستورد بواسطة الذكاء الاصطناعي',
          createdAt: Date.now()
        };

        await addStudentToDB(payload);
        successCount++;
      }

      setImportSuccessCount(successCount);
      setPendingStudents([]);
      setSelectedPendingIds(new Set());
      
      // تحديث قائمة الطلاب في الواجهة الرئيسية
      onStudentsImported();
    } catch (err: any) {
      console.error(err);
      setErrorText('حدث خطأ أثناء حفظ بعض الطلاب بقاعدة البيانات. تم استيراد ' + successCount + ' طلاب بنجاح.');
    } finally {
      setIsImporting(false);
    }
  };

  // ترجمة الصف للمستخدم لعرضه في لوحة المعاينة
  const translateGrade = (g: string) => {
    const gradesMap: any = {
      '1_prep': 'الأول الإعدادي',
      '2_prep': 'الثاني الإعدادي',
      '3_prep': 'الثالث الإعدادي',
      '1_secondary': 'الأول الثانوي',
      '2_secondary': 'الثاني الثانوي'
    };
    return gradesMap[g] || g;
  };

  const translateMadhhab = (m: string) => {
    const map: any = {
      'hanafi': 'حنفي',
      'shafii': 'شافعي',
      'maliki': 'مالكي'
    };
    return map[m] || m;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-10rem)] min-h-[450px]">
      
      {/* الجزء الأيسر: واجهة الشات بوت الذكي */}
      <div className="flex-1 bg-white border border-slate-200/95 rounded-2xl shadow-xs flex flex-col overflow-hidden h-full">
        
        {/* هيدر الشات */}
        <div className="p-4 bg-gradient-to-r from-emerald-800 to-green-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Bot className="h-5 w-5 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-sm font-black flex items-center gap-1.5">
                <span>المساعد الأزهري الذكي</span>
                <span className="text-[9px] bg-yellow-400 text-emerald-900 font-extrabold px-1.5 py-0.5 rounded-sm">
                  Gemini Flash 3.5
                </span>
              </h2>
              <p className="text-[10px] text-emerald-100 font-medium">أرشفة وادخال بيانات الطلاب آلياً بالذكاء الاصطناعي</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-green-900/40 text-green-100 font-bold px-2 py-1 rounded-lg border border-green-600/30">
              مفتاح آمن
            </span>
          </div>
        </div>

        {/* مساحة عرض الرسائل */}
        <div className="flex-1 p-4 overflow-y-auto bg-slate-50/60 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'mr-auto flex-row-reverse' : 'ml-auto text-right'}`}
              >
                {/* أيقونة الراسل */}
                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center border font-bold text-xs ${
                  msg.role === 'user' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : 'bg-white text-emerald-800 border-slate-200 shadow-2xs'
                }`}>
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-emerald-600" />}
                </div>

                {/* نص الرسالة */}
                <div className="space-y-2">
                  <div className={`p-3.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-3xs ${
                    msg.role === 'user'
                      ? 'bg-emerald-700 text-white rounded-tl-none'
                      : 'bg-white text-slate-800 border border-slate-200/70 rounded-tr-none'
                  }`}>
                    {/* تحويل الأسطر الجديدة لبريكات */}
                    {msg.content.split('\n').map((line, idx) => (
                      <React.Fragment key={idx}>
                        {line}
                        <br />
                      </React.Fragment>
                    ))}

                    {/* عرض تفاصيل الملف المرفق في رسالة المستخدم */}
                    {msg.file && (
                      <div className={`mt-2 p-2 rounded-lg text-[10px] flex items-center gap-2 font-mono ${
                        msg.role === 'user' ? 'bg-emerald-800/60 text-emerald-50' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <FileText className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[150px] font-bold">{msg.file.name}</span>
                      </div>
                    )}
                  </div>

                  {/* إشعار بوجود طلاب تم استخراجهم جاهزين للمعالجة */}
                  {msg.extractedStudents && msg.extractedStudents.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 flex items-center justify-between gap-3 animate-pulse mt-1.5">
                      <div className="flex items-center gap-1.5 text-emerald-900 text-[10px] font-bold">
                        <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>تم استخراج {msg.extractedStudents.length} طلاب بنجاح! راجع البيانات في اللوحة الجانبية.</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {isSending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3 max-w-[80%] ml-auto text-right"
              >
                <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center bg-white text-emerald-800 border border-slate-200 shadow-2xs">
                  <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" />
                </div>
                <div className="p-3.5 bg-white border border-slate-200/70 text-slate-500 rounded-2xl rounded-tr-none text-xs font-semibold shadow-3xs flex items-center gap-2">
                  <span>جاري تحليل وقراءة الملف المستند واستخراج البيانات...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* تنبيه الأخطاء أو النجاحات الموضعية */}
        {errorText && (
          <div className="p-3 bg-rose-50 border-t border-rose-100 text-rose-800 text-[11px] font-bold flex items-center gap-2 shrink-0">
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
            <span>{errorText}</span>
          </div>
        )}

        {importSuccessCount !== null && (
          <div className="p-3 bg-emerald-50 border-t border-emerald-100 text-emerald-850 text-[11px] font-bold flex items-center gap-2 shrink-0">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>تهانينا! تم حفظ واستيراد {importSuccessCount} طلاب إلى قاعدة بيانات المعهد بنجاح تام. 🎉</span>
          </div>
        )}

        {/* الفوتر ومنطقة الإدخال */}
        <div className="p-3 border-t border-slate-200 bg-white shrink-0">
          
          {/* شريط الملف المرفق الحالي */}
          {selectedFile && (
            <div className="mb-2.5 p-2 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-950">
                {selectedFile.type.includes('image') ? (
                  <ImageIcon className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                )}
                <span className="truncate max-w-[240px]">{selectedFile.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
              </div>
              <button 
                onClick={() => { setSelectedFile(null); setParsedFileContent(null); }}
                className="w-5 h-5 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex gap-2">
            {/* زر إرفاق ملف */}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf, .png, .jpg, .jpeg, .xlsx, .xls, .csv"
              className="hidden" 
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
              className="px-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 rounded-xl transition-all flex items-center justify-center cursor-pointer border border-slate-200/50"
              title="إرفاق ملف (PDF، إكسل، صورة)"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            {/* حقل النص */}
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isSending}
              placeholder={selectedFile ? "اكتب توجيهاتك لقراءة الملف أو اضغط إرسال للتحليل التلقائي..." : "اسأل المساعد، أو ارفع ملف طلاب لقراءته..."}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none text-xs font-semibold bg-slate-50 focus:bg-white transition-all text-right"
            />

            {/* زر الإرسال */}
            <button
              type="submit"
              disabled={isSending || (!inputMessage.trim() && !selectedFile)}
              className="px-4.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>إرسال</span>
            </button>
          </form>
          
          <div className="mt-1.5 text-center text-[9px] text-slate-400 font-semibold leading-relaxed">
            * يدعم استيراد المجموعات وقراءة المذهب الشافعي/الحنفي/المالكي تلقائياً من قوائم الفصول.
          </div>
        </div>

      </div>

      {/* الجزء الأيمن: لوحة معاينة الطلاب المستخرجين وتدقيقها */}
      <div className="w-full lg:w-[420px] bg-white border border-slate-200/95 rounded-2xl shadow-xs flex flex-col overflow-hidden h-full">
        
        {/* هيدر المعاينة */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <UserPlus className="h-4 w-4 text-emerald-600" />
              <span>لوحة معاينة وتدقيق الطلاب</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">مراجعة البيانات المستخرجة قبل إضافتها رسمياً</p>
          </div>
          
          {pendingStudents.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="text-[10px] text-emerald-700 hover:text-emerald-900 font-extrabold"
            >
              {selectedPendingIds.size === pendingStudents.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
            </button>
          )}
        </div>

        {/* محتوى المعاينة */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {pendingStudents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100">
                <Database className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-700">لا توجد بيانات مستخرجة حالياً</h4>
                <p className="text-[10px] text-slate-400 max-w-[250px] mx-auto leading-relaxed">
                  ارفع ملفاً يحتوي على قائمة بأسماء الطلاب كصورة، PDF، أو شيت إكسل، وسيقوم الذكاء الاصطناعي باستخراجهم لك وتجهيزهم هنا فوراً.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingStudents.map((std, idx) => {
                const isSelected = selectedPendingIds.has(idx);
                const isCurrentlyEditing = editingIndex === idx;

                if (isCurrentlyEditing && editingStudent) {
                  return (
                    <div key={idx} className="p-4 bg-emerald-50/50 border-2 border-emerald-500 rounded-xl space-y-3 animate-fade-in">
                      <div className="text-[10px] font-black text-emerald-900 border-b border-emerald-100 pb-1.5">تعديل بيانات الطالب المستخرج</div>
                      
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold block mb-1">الاسم بالكامل:</label>
                          <input 
                            type="text" 
                            value={editingStudent.name}
                            onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 outline-none text-xs font-bold bg-white focus:border-emerald-500"
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 font-bold block mb-1">السنة الدراسية:</label>
                            <select
                              value={editingStudent.grade}
                              onChange={(e) => {
                                const val = e.target.value;
                                const stage = val.includes('prep') ? 'prep' : 'secondary';
                                setEditingStudent({ ...editingStudent, grade: val, stage });
                              }}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none text-xs font-bold bg-white"
                            >
                              <option value="1_prep">الأول الإعدادي</option>
                              <option value="2_prep">الثاني الإعدادي</option>
                              <option value="3_prep">الثالث الإعدادي</option>
                              <option value="1_secondary">الأول الثانوي</option>
                              <option value="2_secondary">الثاني الثانوي</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 font-bold block mb-1">المذهب الفقهي:</label>
                            <select
                              disabled
                              value="hanafi"
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none text-xs font-bold bg-slate-100 cursor-not-allowed opacity-80"
                            >
                              <option value="hanafi">حنفي (ثابت للمعهد)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 font-bold block mb-1">الرقم القومي:</label>
                            <input 
                              type="text" 
                              value={editingStudent.nationalId}
                              maxLength={14}
                              onChange={(e) => setEditingStudent({ ...editingStudent, nationalId: e.target.value })}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none text-xs font-bold bg-white font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 font-bold block mb-1">تاريخ الميلاد:</label>
                            <input 
                              type="date" 
                              value={editingStudent.birthDate}
                              onChange={(e) => setEditingStudent({ ...editingStudent, birthDate: e.target.value })}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none text-xs font-bold bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 font-bold block mb-1">رقم الهاتف:</label>
                            <input 
                              type="text" 
                              value={editingStudent.guardianPhone}
                              onChange={(e) => setEditingStudent({ ...editingStudent, guardianPhone: e.target.value })}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none text-xs font-bold bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          onClick={() => { setEditingIndex(null); setEditingStudent(null); }}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold"
                        >
                          إلغاء
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>تحديث</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div 
                    key={idx} 
                    className={`p-3.5 rounded-xl border transition-all relative ${
                      isSelected 
                        ? 'bg-emerald-50/40 border-emerald-300 shadow-3xs' 
                        : 'bg-white border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    {/* تشيك بوكس الاختيار */}
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectPending(idx)}
                      className="absolute top-3.5 left-3.5 w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                    />

                    <div className="space-y-1.5 pl-8 text-right">
                      <h4 className="text-xs font-black text-slate-800">{std.name}</h4>
                      
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-500 font-semibold">
                        <div>
                          <span className="text-slate-400">الصف:</span> {translateGrade(std.grade)}
                        </div>
                        <div>
                          <span className="text-slate-400">الفصل:</span> <b className="text-slate-700 font-bold">{std.classRoom}</b>
                        </div>
                        <div>
                          <span className="text-slate-400">المذهب:</span> {translateMadhhab(std.madhhab)}
                        </div>
                        <div>
                          <span className="text-slate-400">الميلاد:</span> <span className="font-mono text-[9px]">{std.birthDate}</span>
                        </div>
                      </div>

                      {std.nationalId && (
                        <div className="text-[9px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-50">
                          الرقم القومي: <span className="text-slate-600 font-bold">{std.nationalId}</span>
                        </div>
                      )}
                    </div>

                    {/* أزرار الإجراءات */}
                    <div className="mt-2.5 pt-2 border-t border-slate-50 flex justify-end gap-2 shrink-0">
                      <button
                        onClick={() => handleStartEdit(idx)}
                        className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-slate-50 rounded transition-all cursor-pointer"
                        title="تعديل يدوي"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleRemovePending(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded transition-all cursor-pointer"
                        title="حذف من القائمة"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* فوتر المعاينة */}
        {pendingStudents.length > 0 && (
          <div className="p-4 border-t border-slate-150 bg-slate-50/50 shrink-0">
            <button
              onClick={handleImportStudents}
              disabled={selectedPendingIds.size === 0 || isImporting}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري استيراد وحفظ الطلاب بمعهدنا...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 text-yellow-300" />
                  <span>حفظ واستيراد الطلاب المحددين ({selectedPendingIds.size})</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
