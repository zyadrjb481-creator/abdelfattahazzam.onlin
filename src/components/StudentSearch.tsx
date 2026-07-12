/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Student, ARABIC_LABELS, Teacher } from '../types';
import { saveInquiryToDB } from '../firebase';
import { 
  Search, 
  User, 
  Award, 
  CheckSquare, 
  GraduationCap, 
  School, 
  MessageSquare, 
  Send, 
  X, 
  Sparkles, 
  Users, 
  Clock, 
  Calendar, 
  MapPin, 
  Phone, 
  Info,
  BookOpen,
  UserCheck,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface StudentSearchProps {
  students: Student[];
  onViewProfile: (student: Student) => void;
  teachers: Teacher[];
}

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: Date;
  options?: string[];
  studentResults?: Student[];
}

// دالة لتنظيف وتوحيد النصوص العربية والأرقام لتسهيل البحث الدقيق
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    // تحويل الأرقام الهندية/العربية لأرقام إنجليزية إن وجدت
    .replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    // توحيد الألفات بمختلف أشكالها
    .replace(/[أإآا]/g, 'ا')
    // توحيد التاء المربوطة والهاء
    .replace(/[ةه]/g, 'ه')
    // توحيد الياء والألف المقصورة
    .replace(/[ىي]/g, 'ي')
    // إزالة التشكيل والحركات الممكنة
    .replace(/[\u064B-\u065F]/g, '')
    // إزالة الفراغات الزائدة
    .replace(/\s+/g, ' ');
}

// دالة البحث الذكي والدقيق في كشوف الطلاب
export function performSmartSearch(query: string, students: Student[]): Student[] {
  if (!query) return [];
  
  const cleanQuery = normalizeArabicText(query);
  const isNumeric = /^\d+$/.test(cleanQuery);

  if (isNumeric) {
    // إذا كان البحث رقمياً بالكامل
    return students.filter(student => {
      const cleanNationalId = (student.nationalId || '').trim();
      const cleanPhone = (student.guardianPhone || '').trim();
      
      // مطابقة الرقم القومي أو هاتف ولي الأمر (بالكامل أو جزئياً)
      return cleanNationalId.includes(cleanQuery) || cleanPhone.includes(cleanQuery);
    });
  }

  // إذا كان البحث نصياً (بالاسم)
  const queryWords = cleanQuery.split(' ').filter(Boolean);
  if (queryWords.length === 0) return [];

  return students.filter(student => {
    const normStudentName = normalizeArabicText(student.name);
    const normGuardianName = normalizeArabicText(student.guardianName);

    // 1. فحص ما إذا كانت كل كلمة في الاستعلام موجودة في اسم الطالب أو اسم ولي أمره
    const matchesAllWords = queryWords.every(word => 
      normStudentName.includes(word) || normGuardianName.includes(word)
    );

    // 2. فحص المطابقة المباشرة كعبارة متصلة
    const matchesDirectly = normStudentName.includes(cleanQuery) || normGuardianName.includes(cleanQuery);

    return matchesAllWords || matchesDirectly;
  });
}

export default function StudentSearch({ students, onViewProfile, teachers }: StudentSearchProps) {
  // حالة فتح وغلق الشات بوت
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // حالات التحكم في تدفق الشات بوت وتأمين خانة الكتابة
  const [chatFlowState, setChatFlowState] = useState<'locked' | 'searching_student' | 'waiting_for_question' | 'waiting_for_phone'>('locked');
  const [pendingQuestion, setPendingQuestion] = useState('');

  // دالة لتوليد تلميح خانة الإدخال بناءً على حالة التدفق الحالية
  const getInputPlaceholder = () => {
    if (chatFlowState === 'locked') return 'يرجى اختيار أحد الخيارين أعلاه للمتابعة...';
    if (chatFlowState === 'searching_student') return 'اكتب اسم الطالب ثلاثياً أو الرقم القومي...';
    if (chatFlowState === 'waiting_for_question') return 'اكتب سؤالك أو استفسارك هنا بالتفصيل...';
    if (chatFlowState === 'waiting_for_phone') return 'اكتب رقم الموبايل للتواصل (مثال: 01xxxxxxxxx)...';
    return 'اكتب هنا...';
  };

  // حالة المدرس المحدد لعرض التفاصيل في المودال
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  // حالات وحلول الاستعلام المباشر بالرقم القومي
  const [nationalIdSearchInput, setNationalIdSearchInput] = useState('');
  const [searchError, setSearchError] = useState('');
  const [foundStudentsList, setFoundStudentsList] = useState<Student[]>([]);

  const handleDirectSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setFoundStudentsList([]);

    const query = nationalIdSearchInput.trim();
    if (!query) {
      setSearchError('يرجى كتابة الاسم، الرقم القومي، أو هاتف ولي الأمر للاستعلام.');
      return;
    }

    const matches = performSmartSearch(query, students);

    if (matches.length === 1) {
      // إذا وجدنا طالباً واحداً فقط، نفتح ملفه فوراً
      onViewProfile(matches[0]);
    } else if (matches.length > 1) {
      // إذا وجدنا أكثر من طالب، نعرضهم للاختيار
      setFoundStudentsList(matches);
    } else {
      // لم نجد أي طالب يطابق
      setSearchError('عذراً، لم نجد أي طالب مسجل يطابق هذا الاستعلام. يرجى التأكد من صحة الاسم، الرقم القومي، أو هاتف ولي الأمر.');
    }
  };

  // حالات السلايدر للمعلمين (بالطول ويتحرك تلقائياً للشمال)
  const [currentSlide, setCurrentSlide] = useState(0);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getVisibleCardsCount = () => {
    if (windowWidth >= 1280) return 4;
    if (windowWidth >= 1024) return 3;
    if (windowWidth >= 768) return 2;
    return 1;
  };

  const visibleCards = getVisibleCardsCount();
  const maxSlide = Math.max(0, teachers.length - visibleCards);

  // التأثير التلقائي للتحرك لليسار (شمال)
  useEffect(() => {
    if (teachers.length <= visibleCards) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        if (prev >= maxSlide) {
          return 0; // العودة للبداية
        }
        return prev + 1;
      });
    }, 2000); // الانتقال كل ثانيتين لسرعة الحركة تلقائياً
    return () => clearInterval(interval);
  }, [teachers.length, visibleCards, maxSlide]);

  // إعداد الرسالة الافتتاحية للشات بوت
  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([
        {
          id: 'welcome',
          sender: 'bot',
          text: 'مرحباً بك في البوابة الذكية لمعهد عبد الفتاح عزام بنين! 🕌 أنا المساعد الافتراضي الخاص بالمعهد ومستعد لمساعدتك الآن.\n\nكيف يمكنني مساعدتك اليوم؟ يرجى كتابة اسم الطالب رباعياً للبحث السريع أو اختيار أحد الخيارين أدناه:',
          timestamp: new Date(),
          options: [
            '🔍 تبحث عن أحوال طالب',
            '💬 هسأل على حاجة في المعهد'
          ]
        }
      ]);
    }
  }, [chatMessages]);

  // تمرير الشات لأسفل عند وصول رسالة جديدة
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  // إرسال رسالة الشات بوت ومعالجتها
  const handleSendChatMessage = (textToSend: string) => {
    if (!textToSend.trim()) return;

    // إضافة رسالة المستخدم
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    // الرد المبرمج بعد 750 مللي ثانية
    setTimeout(async () => {
      setIsTyping(false);
      let replyText = '';
      let replyOptions: string[] = [];
      let foundStudents: Student[] = [];
      let nextState: 'locked' | 'searching_student' | 'waiting_for_question' | 'waiting_for_phone' = 'locked';

      const queryNormalized = textToSend.toLowerCase().trim();

      // معالجة الرسالة بناءً على حالة التدفق الحالية
      if (chatFlowState === 'locked') {
        // سيناريو خاص: الضغط على "تبحث عن أحوال طالب"
        if (
          queryNormalized.includes('تبحث عن احوال') || 
          queryNormalized.includes('احوال طالب') || 
          queryNormalized === '🔍 تبحث عن أحوال طالب'
        ) {
          replyText = `رائع! للاستعلام عن أحوال الطالب (الغياب والدرجات)، يرجى كتابة اسم الطالب رباعياً أو ثلاثياً، أو إدخال الرقم القومي المكون من 14 رقماً وسأقوم بجلبه لك فوراً من السجلات.`;
          nextState = 'searching_student';
        }
        // سيناريو خاص: الضغط على "هسأل على حاجة في المعهد"
        else if (
          queryNormalized.includes('هسال') || 
          queryNormalized.includes('حاجه في المعهد') || 
          queryNormalized.includes('حاجة في المعهد') || 
          queryNormalized === '💬 هسأل على حاجة في المعهد'
        ) {
          replyText = `أهلاً بك! يرجى كتابة سؤالك أو استفسارك هنا، وخلال 24 ساعة سيتم التواصل معك مباشرة من قِبل إدارة شؤون الطلاب بالمعهد للرد على كافة أسئلتك.`;
          nextState = 'waiting_for_question';
        }
        else {
          replyText = `أهلاً بك! لمساعدتك بدقة أكبر، يرجى اختيار أحد الخيارين السريعين المتاحين أدناه:`;
          replyOptions = [
            '🔍 تبحث عن أحوال طالب',
            '💬 هسأل على حاجة في المعهد'
          ];
          nextState = 'locked';
        }
      } 
      else if (chatFlowState === 'searching_student') {
        foundStudents = performSmartSearch(textToSend, students);

        if (foundStudents.length > 0) {
          replyText = `لقد عثرت في سجلات المعهد على ${foundStudents.length} طلاب يطابقون استفسارك. يرجى الضغط على زر الطالب أدناه لعرض كشف الدرجات المفصل وسجل الحضور والغياب الخاص به:`;
        } else {
          replyText = `عذراً، لم أجد أي طالب يطابق الاسم، الرقم القومي، أو رقم هاتف ولي الأمر المدخل.\n\nيرجى التأكد من كتابة الاسم صحيحاً أو إدخال الرقم القومي المكون من 14 رقماً للوصول الدقيق.`;
        }

        // إتاحة الخيارات من جديد وإعادة قفل الكتابة
        replyOptions = [
          '🔍 تبحث عن أحوال طالب',
          '💬 هسأل على حاجة في المعهد'
        ];
        nextState = 'locked';
      }
      else if (chatFlowState === 'waiting_for_question') {
        // استلام السؤال والطلب وكتابة رقم الهاتف
        setPendingQuestion(textToSend);
        replyText = `تم تسجيل استفسارك بنجاح.\n\nيرجى كتابة رقم الموبايل الخاص بك هنا لتتمكن إدارة المعهد من التواصل معك والرد على استفسارك ومتابعة طلبك.`;
        nextState = 'waiting_for_phone';
      }
      else if (chatFlowState === 'waiting_for_phone') {
        // استلام الهاتف وحفظ الطلب نهائياً بالأدمن
        const phoneNumber = textToSend.trim();

        try {
          await saveInquiryToDB({
            question: pendingQuestion,
            phone: phoneNumber,
            status: 'pending',
            createdAt: Date.now()
          });
        } catch (error) {
          console.error("Error saving inquiry:", error);
        }

        replyText = `شكراً لك! لقد تم استلام استفسارك وهاتفك بنجاح 💬\nتم إرسال الطلب فوراً إلى إدارة المعهد، وسيقوم مسؤول شؤون الطلاب بالتواصل معك على الرقم (${phoneNumber}) خلال 24 ساعة كحد أقصى.\n\nهل تود إجراء استعلام آخر؟`;
        
        replyOptions = [
          '🔍 تبحث عن أحوال طالب',
          '💬 هسأل على حاجة في المعهد'
        ];
        setPendingQuestion('');
        nextState = 'locked';
      }

      setChatFlowState(nextState);

      const botReply: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: replyText,
        timestamp: new Date(),
        options: replyOptions.length > 0 ? replyOptions : undefined,
        studentResults: foundStudents.length > 0 ? foundStudents : undefined
      };

      setChatMessages(prev => [...prev, botReply]);
    }, 750);
  };

  return (
    <div className="space-y-12 max-w-6xl mx-auto py-2 font-sans" dir="rtl">
      
      {/* 1. قسم البداية: الاستفسار الفوري والشات بوت */}
      <section className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        {/* خلفيات هندسية إسلامية جمالية */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
        <div className="absolute top-1/2 left-4 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/15 text-xs text-emerald-200 font-bold">
            <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span>نظام المساعد الذكي التفاعلي 2026</span>
          </div>
          
          <h2 className="text-2xl md:text-3.5xl font-black leading-tight tracking-tight text-white">
            للإستفسار عن كشوف الطلاب ودرجاتهم
          </h2>
          
          <p className="text-emerald-100/90 text-sm md:text-base leading-relaxed font-medium max-w-2xl">
            نقدم لكم بوابة الاستعلام الرقمي التفاعلية لمعهد عبد الفتاح عزام بنين. يمكنك الآن الاستعلام الفوري عن السجل الأكاديمي، درجات الامتحانات، أو تقرير الغياب والحضور عبر محادثة ذكية فورية وبسيطة.
          </p>

          <div className="pt-3 max-w-xl">
            <form onSubmit={handleDirectSearch} className="space-y-4">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={nationalIdSearchInput}
                  onChange={(e) => {
                    setNationalIdSearchInput(e.target.value);
                    setSearchError('');
                    setFoundStudentsList([]);
                  }}
                  placeholder="أدخل الرقم القومي للطالب المكون من 14 رقماً (أو الاسم)..."
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white text-slate-900 placeholder-slate-400 font-extrabold text-sm border-2 border-transparent focus:border-amber-400 outline-none shadow-lg transition-all text-right font-sans"
                  id="portal-national-id-search"
                />
                <div className="absolute left-4 text-emerald-800">
                  <Search className="h-6 w-6" />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="group px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl text-xs md:text-sm font-black shadow-lg hover:shadow-amber-500/10 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2"
                >
                  <Search className="h-4.5 w-4.5 text-slate-900 group-hover:scale-110 transition-transform" />
                  <span>استعلام فوري عن السجل والغياب</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                  className="px-5 py-3.5 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="h-4.5 w-4.5 text-amber-400" />
                  <span>طرح سؤال آخر على المساعد</span>
                </button>
              </div>

              {/* رسائل الخطأ والتنبيهات */}
              {searchError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-200 text-xs font-bold flex items-center gap-2 animate-fade-in">
                  <span className="text-sm">⚠️</span>
                  <span>{searchError}</span>
                </div>
              )}

              {/* في حال العثور على أكثر من طالب يطابق البحث */}
              {foundStudentsList.length > 0 && (
                <div className="p-4 bg-emerald-950/60 border border-white/10 rounded-2xl space-y-3 animate-fade-in">
                  <p className="text-xs font-bold text-amber-300">تم العثور على عدة طلاب يطابقون استفسارك، يرجى اختيار ابنك لعرض نتائجه:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {foundStudentsList.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => onViewProfile(student)}
                        className="w-full p-3 bg-white hover:bg-emerald-50 text-right border border-slate-200 rounded-xl transition-all shadow-sm flex items-center justify-between gap-3 text-xs font-bold text-slate-800 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">👤</span>
                          <div>
                            <span className="block text-slate-900">{student.name}</span>
                            <span className="text-[10px] text-slate-500 font-semibold">{ARABIC_LABELS.grades[student.grade]}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">عرض السجل الدراسي ←</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* 2. الهيئة التدريسية وإدارة المعهد (سلايدر متحرك تلقائياً وتظهر الصور بالطول) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-right space-y-1">
            <h3 className="text-lg md:text-xl font-black text-slate-850 flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              <span>نخبة المعلمين وأعضاء هيئة التدريس</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold">
              تتحرك تلقائياً لليسار. انقر على صورة المعلم لعرض كامل السيرة الذاتية والتخصص
            </p>
          </div>

          {/* أزرار التحكم اليدوية للسلايدر */}
          {teachers.length > visibleCards && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => {
                  setCurrentSlide((prev) => (prev <= 0 ? maxSlide : prev - 1));
                }}
                className="p-2.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-xl border border-slate-200/80 shadow-xs transition-all cursor-pointer"
                title="السابق"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={() => {
                  setCurrentSlide((prev) => (prev >= maxSlide ? 0 : prev + 1));
                }}
                className="p-2.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-xl border border-slate-200/80 shadow-xs transition-all cursor-pointer"
                title="التالي"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
            </div>
          )}
        </div>

        {/* حاوية السلايدر الخارجي */}
        <div className="relative overflow-hidden w-full py-6 px-1 rounded-3xl">
          <div 
            className="flex gap-6 transition-transform duration-700 ease-out"
            style={{ 
              transform: `translateX(${currentSlide * (260 + 24)}px)`,
            }}
          >
            {teachers.map((teacher, index) => (
              <div 
                key={teacher.id || index}
                className="perspective-[1000px] shrink-0"
              >
                <button
                  onClick={() => setSelectedTeacher(teacher)}
                  className="w-[260px] h-[380px] rounded-2xl overflow-hidden border border-slate-200/80 shadow-md hover:shadow-[0_20px_45px_rgba(16,185,129,0.25)] hover:border-emerald-400 hover:scale-[1.03] transition-all duration-500 text-right cursor-pointer relative group focus:outline-none focus:ring-2 focus:ring-emerald-500/40 [transform-style:preserve-3d] hover:[transform:rotateY(-10deg)_rotateX(8deg)]"
                >
                  {/* تأثير اللمعان الفخم المنزلق عند تحويم الماوس */}
                  <div className="absolute inset-0 -skew-x-12 -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent z-20 pointer-events-none"></div>

                  {/* صورة المعلم الشخصية بالطول */}
                  {teacher.photoUrl ? (
                    <div className="absolute inset-0 [transform:translateZ(-10px)]">
                      <img 
                        src={teacher.photoUrl} 
                        alt={teacher.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      {/* تدرج معتم في الأسفل لسهولة القراءة بدقة فخمة */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-900/10"></div>
                    </div>
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${teacher.avatarColor || 'from-emerald-600 to-teal-700'} [transform:translateZ(-10px)] transition-transform duration-700 group-hover:scale-110`}>
                      {/* الحروف العائمة */}
                      <div className="absolute -top-4 -left-4 text-white/10 font-black text-7xl pointer-events-none select-none">
                        {teacher.initials || 'معلم'}
                      </div>
                      {/* تدرج سفلي معتم */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-900/10"></div>
                    </div>
                  )}

                  {/* البيانات المعروضة فوق الكارت مع تأثير العمق ثلاثي الأبعاد 3D */}
                  <div className="absolute inset-x-0 bottom-0 p-5 flex flex-col justify-end text-right z-10 h-full [transform:translateZ(40px)] [transform-style:preserve-3d]">
                    <span className="inline-block self-start text-[9px] bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black px-3 py-1 rounded-full mb-3 shadow-md border border-emerald-400/30 [transform:translateZ(10px)]">
                      {teacher.role}
                    </span>
                    
                    <h4 className="text-base font-black text-white leading-tight drop-shadow-md group-hover:text-yellow-300 transition-colors duration-300 [transform:translateZ(15px)]">
                      {teacher.name}
                    </h4>
                    
                    <p className="text-xs text-emerald-300 font-bold mt-1.5 drop-shadow-xs [transform:translateZ(10px)]">
                      {teacher.specialty}
                    </p>
                    
                    <p className="text-[10px] text-slate-300 font-semibold line-clamp-2 mt-2 leading-relaxed opacity-90 group-hover:opacity-100 group-hover:text-white transition-all duration-300 [transform:translateZ(5px)]">
                      {teacher.bio}
                    </p>
                    
                    <div className="pt-4 mt-1 border-t border-white/10 flex items-center gap-1.5 text-[9px] text-yellow-400 font-black tracking-wide [transform:translateZ(5px)]">
                      <span>اضغط لعرض السيرة الكاملة والمهام</span>
                      <span className="animate-pulse">←</span>
                    </div>
                  </div>
                </button>
              </div>
            ))}

            {teachers.length === 0 && (
              <div className="w-full bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full text-slate-500 text-xl">
                  👨‍🏫
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800">لا يوجد معلمين حالياً</h3>
                  <p className="text-xs text-slate-500 font-semibold">تأكد من إضافة بيانات المعلمين من لوحة الإدارة.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. قسم الهوية التأسيسية والمعلومات العامة (في النهاية) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* كارت بطاقة الهوية والتأسيس */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-md space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-50 rounded-xl text-emerald-700 border border-emerald-100 text-xl">
              🕌
            </div>
            <h3 className="text-xl font-extrabold text-slate-850">معهد عبد الفتاح عزام بنين (المرحلة الابتدائية والإعدادية)</h3>
            <p className="text-slate-500 text-xs md:text-sm leading-relaxed font-semibold">
              تأسس معهد عبد الفتاح عزام الأزهري للبنين عام <span className="text-emerald-700 font-extrabold">1994 م</span> بجهود مخلصة لنشر نور العلم الشرعي والتعليم الأزهري المعتدل. ويعد المعهد من المعاهد الرائدة في المنطقة التي تساهم في تخريج أجيال متمسكة بكتاب الله وسنة رسوله، ومزودة بأعلى العلوم التجريبية والعلمية لمواكبة العصر.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <GraduationCap className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800">رسالة المعهد</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">بناء شخصية الطالب الأزهري معرفياً ودينياً وسلوكياً وفق منهج الأزهر الشريف الوسطي.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <Users className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800">التربية والتعليم للبنين</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">بيئة تعليمية مخصصة للبنين تهدف لزرع قيم القيادة والاعتماد على الذات والالتزام بالعبادات.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="block text-lg font-black text-emerald-600">1994</span>
              <span className="text-[10px] text-slate-400 font-bold">عام التأسيس</span>
            </div>
            <div className="border-x border-slate-100">
              <span className="block text-lg font-black text-amber-600">30+</span>
              <span className="text-[10px] text-slate-400 font-bold">عاماً من العطاء</span>
            </div>
            <div>
              <span className="block text-lg font-black text-emerald-600">100%</span>
              <span className="text-[10px] text-slate-400 font-bold">نسبة نجاح ممتازة</span>
            </div>
          </div>
        </div>

        {/* بطاقة معلومات سريعة والاتصال الإداري */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-md flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-emerald-600" />
              <span>مواعيد وبيانات هامة</span>
            </h3>

            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="text-right">
                  <span className="block text-[10px] text-slate-400 font-bold">مواعيد الدوام</span>
                  <span className="text-xs text-slate-700 font-extrabold">من 7:45 صباحاً إلى 1:30 ظهراً</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="text-right">
                  <span className="block text-[10px] text-slate-400 font-bold">الأيام الرسمية</span>
                  <span className="text-xs text-slate-700 font-extrabold">من الأحد إلى الخميس</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="text-right">
                  <span className="block text-[10px] text-slate-400 font-bold">الموقع الميداني</span>
                  <span className="text-xs text-slate-700 font-extrabold">قطاع المعاهد - شؤون الطلاب</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="text-right">
                  <span className="block text-[10px] text-slate-400 font-bold">رقم مكتب الاستعلامات</span>
                  <span className="text-xs text-emerald-700 font-extrabold font-mono">01126269124</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 text-emerald-800 text-[10px] font-bold p-3 rounded-xl border border-emerald-100 leading-relaxed text-right">
            ⚠️ يرجى من السادة أولياء الأمور متابعة حضور وغياب أبنائهم بانتظام لتجنب اتخاذ إجراءات الفصل الإداري بعد تجاوز المدة القانونية المسموحة.
          </div>
        </div>

      </section>

      {/* 4. مودال تفاصيل المدرس (يفتح عند النقر) */}
      {selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[110] p-4 font-sans" dir="rtl">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden p-6 relative animate-scale-up text-right">
            
            {/* زر الإغلاق */}
            <button 
              onClick={() => setSelectedTeacher(null)}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="space-y-6">
              
              {/* ترويسة المودال (الاسم والصورة) */}
              <div className="text-center space-y-3 pt-3">
                {selectedTeacher.photoUrl ? (
                  <img 
                    src={selectedTeacher.photoUrl} 
                    alt={selectedTeacher.name}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-3xl object-cover border-2 border-emerald-500 shadow-md mx-auto"
                  />
                ) : (
                  <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${selectedTeacher.avatarColor || 'from-emerald-600 to-teal-700'} text-white font-black text-2xl flex items-center justify-center mx-auto shadow-md relative`}>
                    <span>{selectedTeacher.initials || 'معلم'}</span>
                  </div>
                )}
                
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-850">{selectedTeacher.name}</h3>
                  <span className="inline-block text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-3 py-1 rounded-full">
                    {selectedTeacher.role}
                  </span>
                </div>
              </div>

              {/* التفاصيل والبيانات */}
              <div className="space-y-4 border-t border-slate-100 pt-5 text-right">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">التخصص الأكاديمي والشرعي</span>
                  <p className="text-xs text-slate-800 font-black flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    {selectedTeacher.specialty}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">نبذة تعريفية ومسيرة العطاء</span>
                  <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                    {selectedTeacher.bio}
                  </p>
                </div>

                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-150 text-[11px] text-slate-500 font-semibold flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>معتمد رسمياً من قبل مشيخة الأزهر الشريف والمنطقة الأزهرية.</span>
                </div>
              </div>

              {/* أزرار الإجراءات */}
              <div className="pt-2">
                <button
                  onClick={() => setSelectedTeacher(null)}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  حسناً، إغلاق المعاينة
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 5. الشات بوت التفاعلي لخدمة أولياء الأمور (النافذة العائمة الكبيرة) */}
      {isChatOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in font-sans" dir="rtl">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col h-[550px] max-h-full animate-scale-up">
            
            {/* هيدر الشات بوت */}
            <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 p-4 text-white flex items-center justify-between border-b border-emerald-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center text-xl shadow-inner border border-white/10">
                  🕌
                </div>
                <div className="text-right">
                  <h3 className="text-xs md:text-sm font-black flex items-center gap-1.5">
                    <span>مساعد معهد عبد الفتاح عزام</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  </h3>
                  <p className="text-[10px] text-emerald-200/90 font-semibold">بوابة الاستعلام الذكية الفورية</p>
                </div>
              </div>

              <button 
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* رسائل المحادثة المتدفقة */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  {/* حاوية الرسالة */}
                  <div className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    
                    {/* أيقونة البوت */}
                    {msg.sender === 'bot' && (
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-xs shrink-0">
                        🕌
                      </div>
                    )}

                    {/* فقاعة الرسالة */}
                    <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs font-semibold leading-relaxed whitespace-pre-line shadow-xs ${
                      msg.sender === 'user' 
                        ? 'bg-emerald-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>

                  {/* إذا كان هناك نتائج بحث للطلاب */}
                  {msg.studentResults && msg.studentResults.length > 0 && (
                    <div className="mr-10 pl-2 space-y-2.5">
                      <div className="text-[10px] text-slate-400 font-bold">الطلاب الذين تم العثور عليهم:</div>
                      <div className="grid grid-cols-1 gap-2">
                        {msg.studentResults.map((student) => (
                          <button
                            key={student.id}
                            onClick={() => {
                              onViewProfile(student);
                              setIsChatOpen(false);
                            }}
                            className="w-full p-3 bg-white hover:bg-emerald-50 text-right border border-slate-200 rounded-xl transition-all shadow-xs hover:shadow-sm flex items-center justify-between gap-3 text-xs font-bold text-slate-700 cursor-pointer group"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">👤</span>
                              <div>
                                <span className="block text-slate-850 group-hover:text-emerald-700 transition-colors">{student.name}</span>
                                <span className="text-[9px] text-slate-400 font-medium">{ARABIC_LABELS.grades[student.grade]}</span>
                              </div>
                            </div>
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded group-hover:bg-emerald-600 group-hover:text-white transition-colors">عرض السجل الدراسـي ←</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* خيارات الأزرار السريعة */}
                  {msg.options && msg.options.length > 0 && (
                    <div className="flex flex-wrap gap-2 mr-10 pl-2 pt-1">
                      {msg.options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendChatMessage(option)}
                          className="px-3 py-2 bg-white hover:bg-emerald-50 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* مؤشر جاري الكتابة */}
              {isTyping && (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-xs shrink-0">
                    🕌
                  </div>
                  <div className="bg-white border border-slate-200/80 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-1 shadow-xs">
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* إدخال نص الرسالة */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatMessage(chatInput);
              }}
              className="p-3 bg-white border-t border-slate-100 flex flex-col gap-2"
            >
              {/* شريط ذكي للتحكم السريع والتراجع عن الاختيار لمنع انحباس ولي الأمر */}
              {chatFlowState !== 'locked' && (
                <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-slate-100 text-[10px] md:text-xs font-bold text-slate-500 animate-fade-in">
                  <span className="text-emerald-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    {chatFlowState === 'searching_student' && '🔍 جاري البحث عن أحوال طالب...'}
                    {chatFlowState === 'waiting_for_question' && '💬 اكتب سؤالك أو استفسارك...'}
                    {chatFlowState === 'waiting_for_phone' && '📞 اكتب رقم موبايلك للتواصل...'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setChatFlowState('locked');
                      setChatInput('');
                      setPendingQuestion('');
                      const resetMsg: Message = {
                        id: `bot-reset-${Date.now()}`,
                        sender: 'bot',
                        text: 'تم إلغاء العملية والعودة للخيارات الرئيسية بنجاح ✨\n\nكيف يمكنني مساعدتك الآن؟ يرجى اختيار أحد الخيارين أدناه:',
                        timestamp: new Date(),
                        options: [
                          '🔍 تبحث عن أحوال طالب',
                          '💬 هسأل على حاجة في المعهد'
                        ]
                      };
                      setChatMessages(prev => [...prev, resetMsg]);
                    }}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200/50 transition-all cursor-pointer flex items-center gap-1 text-[10px]"
                  >
                    <span>الرجوع للخيارات الرئيسية ↩️</span>
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 w-full">
                <input
                  type="text"
                  value={chatInput}
                  disabled={chatFlowState === 'locked'}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={getInputPlaceholder()}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none text-xs font-bold transition-all bg-slate-50/50 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100 text-right"
                />
                <button
                  type="submit"
                  disabled={chatFlowState === 'locked' || !chatInput.trim()}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
