/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, StudentTermGrades, AttendanceRecord, ARABIC_LABELS, AL_AZHAR_SUBJECTS } from '../types';
import { fetchStudentGradesFromDB, fetchAttendanceFromDB } from '../firebase';
import { ArrowRight, User, Phone, MapPin, Calendar, HeartPulse, CreditCard, Award, Printer, Clock, FileText, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

interface StudentProfileProps {
  student: Student;
  onClose: () => void;
}

export default function StudentProfile({ student, onClose }: StudentProfileProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'grades'>('info');
  const [gradesHistory, setGradesHistory] = useState<StudentTermGrades[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // جلب سجلات هذا الطالب المعين
  useEffect(() => {
    async function loadStudentRecords() {
      setIsLoading(true);
      try {
        const grades = await fetchStudentGradesFromDB(student.id!);
        setGradesHistory(grades);

        const allAttendance = await fetchAttendanceFromDB();
        const studentAttendance = allAttendance.filter(a => a.studentId === student.id);
        setAttendanceHistory(studentAttendance);
      } catch (err) {
        console.error("Error loading student records:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStudentRecords();
  }, [student.id]);

  // حساب نسب الحضور والغياب
  const attendanceStats = () => {
    const total = attendanceHistory.length;
    if (total === 0) return { presentPct: 100, absentPct: 0, excusedPct: 0, presentCount: 0, absentCount: 0 };
    
    const presentCount = attendanceHistory.filter(a => a.status === 'present').length;
    const absentCount = attendanceHistory.filter(a => a.status === 'absent').length;
    const excusedCount = attendanceHistory.filter(a => a.status === 'excused').length;

    return {
      presentCount,
      absentCount,
      presentPct: Math.round((presentCount / total) * 100),
      absentPct: Math.round((absentCount / total) * 100),
      excusedPct: Math.round((excusedCount / total) * 100)
    };
  };

  const { presentCount, absentCount, presentPct, absentPct, excusedPct } = attendanceStats();

  // تشغيل واجهة الطباعة لكشف الدرجات المختار
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* هيدر الصفحة والرجوع */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all border border-slate-100 text-slate-500"
            title="رجوع لسجل الطلاب"
            id="profile-back-btn"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-850 font-sans">ملف الطالب الأزهري التفصيلي</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              عرض الكيانات الشخصية، المذاهب الشرعية، كشوف الدرجات وسجلات الحضور
            </p>
          </div>
        </div>
      </div>

      {/* بطاقة معلومات الطالب العلوية والسريعة */}
      <div className="bg-gradient-to-l from-azhar-green to-azhar-green-hover text-white rounded-3xl p-6 shadow-xl border border-emerald-950/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:block print:bg-white print:text-slate-900 print:border-none print:shadow-none">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shrink-0 font-extrabold text-2xl text-emerald-200">
            {student.name.substring(0, 1)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black font-sans">{student.name}</h2>
              <span className="bg-amber-500/20 text-amber-200 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-md">
                {ARABIC_LABELS.madhhabs[student.madhhab]}
              </span>
            </div>
            
            <p className="text-emerald-50/95 text-sm mt-1.5 flex items-center gap-1.5 font-medium">
              <span>{ARABIC_LABELS.grades[student.grade]}</span>
              <span className="text-white/30">•</span>
              <span>{ARABIC_LABELS.stages[student.stage]}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 shrink-0 font-sans print:hidden">
          <div className="bg-white/10 px-4 py-3 rounded-xl border border-white/10 min-w-28 text-center">
            <p className="text-[10px] text-emerald-100/85 font-semibold">حالة القيد</p>
            <p className="text-sm font-bold mt-0.5">{ARABIC_LABELS.enrollmentStatus[student.enrollmentStatus]}</p>
          </div>
          <div className="bg-white/10 px-4 py-3 rounded-xl border border-white/10 min-w-28 text-center">
            <p className="text-[10px] text-emerald-100/85 font-semibold">نسبة الحضور</p>
            <p className="text-sm font-bold mt-0.5">{presentPct}%</p>
          </div>
        </div>
      </div>

      {/* التابات والتحكم الداخلي */}
      <div className="flex gap-2 border-b border-slate-100 pb-px print:hidden">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'info' 
              ? 'border-azhar-green text-azhar font-extrabold' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          id="profile-tab-info"
        >
          <User className="h-4.5 w-4.5" />
          البيانات الشخصية وسجل الغياب
        </button>
        <button
          onClick={() => setActiveTab('grades')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'grades' 
              ? 'border-azhar-green text-azhar font-extrabold' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          id="profile-tab-grades"
        >
          <Award className="h-4.5 w-4.5" />
          الشهادات والنتائج الدراسية المعتمدة
        </button>
      </div>

      {/* التاب الأول: بيانات السكن وولي الأمر والغياب */}
      {activeTab === 'info' && (
        <div className="space-y-4">
          {/* شريط تنزيل كشف الغياب والحضور كـ PDF */}
          <div className="bg-emerald-50/55 border-r-4 border-azhar-green text-azhar p-4 rounded-xl flex items-center justify-between gap-3 shadow-sm print:hidden">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-azhar shrink-0 mt-0.5 animate-pulse" />
              <div className="text-xs">
                <p className="font-bold">تقرير بيانات الطالب والغياب السنوي جاهز للتنزيل</p>
                <p className="text-slate-600 mt-0.5">يمكنك حفظ وطباعة كشف الحضور والغياب والبيانات الشخصية للطالب كـ PDF مباشرة بضغطة زر واحدة.</p>
              </div>
            </div>
            
            <button
              onClick={handlePrint}
              className="bg-azhar-green hover:bg-azhar-green-hover text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              id="print-info-top-btn"
            >
              <Printer className="h-4 w-4" />
              تنزيل PDF / طباعة التقرير 📄
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          
          {/* البطاقة اليسرى: البيانات التفصيلية */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 lg:col-span-2">
            <div>
              <h3 className="text-slate-800 font-bold text-md font-sans border-b border-slate-100 pb-3 flex items-center gap-2">
                <span className="w-1.5 h-3 bg-azhar-green rounded"></span>
                ملف البيانات الشخصية والديموغرافية
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                {/* الرقم القومي */}
                <div className="flex items-start gap-3">
                  <div className="bg-slate-50 p-2 rounded-xl text-slate-550 border border-slate-100 shrink-0">
                    <CreditCard className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-450 font-semibold">الرقم القومي المصري</p>
                    <p className="text-sm font-bold text-slate-700 font-mono mt-0.5">{student.nationalId}</p>
                  </div>
                </div>

                {/* تاريخ الميلاد */}
                <div className="flex items-start gap-3">
                  <div className="bg-slate-50 p-2 rounded-xl text-slate-550 border border-slate-100 shrink-0">
                    <Calendar className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-450 font-semibold">تاريخ الميلاد</p>
                    <p className="text-sm font-bold text-slate-700 font-mono mt-0.5">{student.birthDate}</p>
                  </div>
                </div>

                {/* المذهب الفقهي */}
                <div className="flex items-start gap-3 md:col-span-2">
                  <div className="bg-slate-50 p-2 rounded-xl text-slate-550 border border-slate-100 shrink-0">
                    <Award className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-450 font-semibold">المذهب الشرعي الأزهري</p>
                    <p className="text-sm font-bold text-slate-700 mt-0.5">
                      {ARABIC_LABELS.madhhabs[student.madhhab]}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-slate-800 font-bold text-md font-sans border-b border-slate-100 pb-3 flex items-center gap-2">
                <span className="w-1.5 h-3 bg-azhar-green rounded"></span>
                بيانات الاتصال بولي الأمر والاتصال الشرعي
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                {/* اسم ولي الأمر */}
                <div className="flex items-start gap-3">
                  <div className="bg-slate-50 p-2 rounded-xl text-slate-550 border border-slate-100 shrink-0">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-450 font-semibold">اسم ولي الأمر بالكامل</p>
                    <p className="text-sm font-bold text-slate-700 mt-0.5">{student.guardianName}</p>
                  </div>
                </div>

                {/* هاتف ولي الأمر */}
                <div className="flex items-start gap-3">
                  <div className="bg-slate-50 p-2 rounded-xl text-slate-550 border border-slate-100 shrink-0">
                    <Phone className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-450 font-semibold">رقم هاتف ولي الأمر للتواصل السريع</p>
                    <p className="text-sm font-bold text-slate-700 font-mono mt-0.5">{student.guardianPhone}</p>
                  </div>
                </div>
              </div>
            </div>

            {student.notes && (
              <div>
                <h3 className="text-slate-800 font-bold text-md font-sans border-b border-slate-100 pb-3 flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-azhar-green rounded"></span>
                  ملاحظات وتوصيات خاصة بالطالب
                </h3>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-3 flex gap-3 text-slate-700 text-xs">
                  <HeartPulse className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>{student.notes}</div>
                </div>
              </div>
            )}
          </div>

          {/* البطاقة اليمنى: إحصاءات الغياب والدفتر اليومي */}
          <div className="space-y-6">
            
            {/* إحصائية الحضور والغياب الدائرية */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-slate-800 font-bold text-sm font-sans flex items-center gap-2">
                <Clock className="h-4 w-4 text-azhar" />
                <span>إحصاءات الحضور السنوية</span>
              </h3>

              <div className="flex flex-col items-center justify-center p-4">
                {/* رسم بياني بيتي دائري مبسط */}
                <div className="relative h-28 w-28 flex items-center justify-center rounded-full border-8 border-slate-100" style={{ backgroundImage: `conic-gradient(#1e5631 ${presentPct}%, #f43f5e ${presentPct}% ${presentPct + absentPct}%, #f59e0b ${presentPct + absentPct}% 100%)` }}>
                  <div className="absolute inset-2 bg-white rounded-full flex flex-col items-center justify-center">
                    <span className="text-xl font-black font-mono text-azhar">{presentPct}%</span>
                    <span className="text-[8px] text-slate-400 font-semibold">حضور فعلي</span>
                  </div>
                </div>

                <div className="w-full grid grid-cols-3 gap-2 mt-6 text-center text-xs">
                  <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                    <p className="font-extrabold text-azhar font-mono text-sm">{presentCount}</p>
                    <p className="text-[8px] text-slate-550 font-medium mt-0.5">أيام الحضور</p>
                  </div>
                  <div className="bg-rose-50/50 p-2 rounded-lg border border-rose-100">
                    <p className="font-extrabold text-rose-800 font-mono text-sm">{absentCount}</p>
                    <p className="text-[8px] text-slate-550 font-medium mt-0.5">أيام الغياب</p>
                  </div>
                  <div className="bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                    <p className="font-extrabold text-amber-800 font-mono text-sm">{attendanceHistory.length - presentCount - absentCount}</p>
                    <p className="text-[8px] text-slate-550 font-medium mt-0.5">غياب بعذر</p>
                  </div>
                </div>
              </div>
            </div>

            {/* سجل الحركة والغيابات الأخير */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-slate-800 font-bold text-sm font-sans flex items-center gap-2">
                <FileText className="h-4 w-4 text-azhar" />
                <span>سجل تسجيل الحضور والغياب الأخير</span>
              </h3>

              {attendanceHistory.length > 0 ? (
                <div className="space-y-2.5 max-h-[30vh] overflow-y-auto pr-1">
                  {attendanceHistory.slice().reverse().map((record) => (
                    <div key={record.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-700 font-mono">{record.date}</p>
                        {record.notes && <p className="text-slate-500 text-[10px] mt-1">السبب: {record.notes}</p>}
                      </div>
                      
                      <span className={`px-2.5 py-1 rounded-lg font-bold ${
                        record.status === 'present' 
                          ? 'bg-emerald-50/60 text-azhar border border-emerald-100/50'
                          : record.status === 'absent'
                            ? 'bg-rose-50 text-rose-800 border border-rose-100'
                            : 'bg-amber-50 text-amber-800 border border-amber-100'
                      }`}>
                        {ARABIC_LABELS.attendance[record.status]}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-450 text-xs border border-dashed border-slate-200 rounded-xl">
                  لا توجد سجلات غياب مرصودة للطالب في الدفتر حتى الآن.
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
      )}

      {/* التاب الثاني: الشهادات الأكاديمية والنتائج (الطباعة والشفافية) */}
      {activeTab === 'grades' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="p-20 text-center text-slate-500 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-azhar-green border-t-transparent rounded-full mb-2"></div>
              <p className="text-sm font-semibold">جاري تحضير الشهادات الأكاديمية للطالب...</p>
            </div>
          ) : gradesHistory.length > 0 ? (
            <div className="space-y-6 print:space-y-0">
              
              {/* تلميح الطباعة */}
              <div className="bg-emerald-50/55 border-r-4 border-azhar-green text-azhar p-4 rounded-xl flex items-center justify-between gap-3 shadow-sm print:hidden">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-azhar shrink-0 mt-0.5 animate-pulse" />
                  <div className="text-xs">
                    <p className="font-bold">كشف الدرجات الأزهري المعتمد جاهز للطباعة</p>
                    <p className="text-slate-600 mt-0.5">يمكنك طباعة كشوف الدرجات والشهادات بالهوية والختم الأزهري مباشرة عبر النقر على زر الطباعة أدناه.</p>
                  </div>
                </div>
                
                <button
                  onClick={handlePrint}
                  className="bg-azhar-green hover:bg-azhar-green-hover text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  id="print-certificate-top-btn"
                >
                  <Printer className="h-4 w-4" />
                  تنزيل PDF / طباعة كشف الدرجات 📄
                </button>
              </div>

              {/* تكرار كشوف الدرجات المسجلة للطالب (لكل ترم شهادة منفصلة جاهزة للطباعة) */}
              {gradesHistory.map((record) => {
                // تصفية المواد التي تدرس للطالب في هذا الكشف
                const applicableSubjects = AL_AZHAR_SUBJECTS.filter(sub => {
                  const matchStage = sub.applicableStages.includes(student.stage);
                  const matchMadhhab = !sub.applicableMadhhab || sub.applicableMadhhab.includes(student.madhhab);
                  return matchStage && matchMadhhab;
                });

                return (
                  <div 
                    key={record.id} 
                    className="bg-white p-8 rounded-3xl border border-slate-100 shadow-md relative overflow-hidden print:border-none print:shadow-none print:p-4 print:my-0 page-break-after-always"
                    style={{ minHeight: '297mm' }} // تحاكي قياس ورقة A4
                  >
                    
                    {/* إطار إسلامي خارجي رقيق للشهادة يظهر في الطباعة */}
                    <div className="absolute inset-3 border-2 border-emerald-800/10 rounded-[22px] pointer-events-none print:border-emerald-800/20"></div>
                    <div className="absolute inset-4 border border-emerald-800/5 rounded-[18px] pointer-events-none print:border-emerald-800/10"></div>

                    {/* هيدر ترويسة الشهادة الأزهرية */}
                    <div className="relative z-10 flex justify-between items-start border-b-2 border-emerald-800/10 pb-5 mb-6">
                      
                      {/* الجهة اليمنى */}
                      <div className="space-y-1 text-xs text-slate-700 font-semibold">
                        <p>الأزهر الشريف</p>
                        <p>قطاع المعاهد الأزهرية</p>
                        <p>منطقة الغربية الأزهرية</p>
                        <p>معهد الأزهر الشريف الإعدادي الثانوي</p>
                      </div>

                      {/* جهة الشعار والاسم */}
                      <div className="text-center space-y-1">
                        <div className="font-extrabold text-lg text-azhar font-sans tracking-tight">الأزهر الشريف</div>
                        <div className="bg-amber-500 h-0.5 w-16 mx-auto"></div>
                        <p className="text-[10px] text-slate-500 font-semibold tracking-wider">معهد طلاب نموذجي</p>
                      </div>

                      {/* الجهة اليسرى */}
                      <div className="text-left text-xs text-slate-700 space-y-1 font-semibold">
                        <p>العام الدراسي: <span className="font-mono">{record.academicYear}</span></p>
                        <p>الفصل: <span className="font-mono">{record.term === 'term1' ? 'الأول' : 'الثاني'}</span></p>
                        <p>تاريخ الاعتماد: <span className="font-mono">{new Date(record.updatedAt).toLocaleDateString('ar-EG')}</span></p>
                      </div>

                    </div>

                    {/* عنوان الشهادة ببنط عريض */}
                    <div className="relative z-10 text-center mb-8">
                      <h2 className="text-xl font-black text-azhar font-sans tracking-wide">
                        كشف درجات ونتائج طالب أزهري معتمد
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">نسخة مخصصة لشؤون الطلاب والاعتمادات الرسمية</p>
                    </div>

                    {/* جدول بيانات الطالب في كشف الدرجات */}
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-emerald-50/15 border border-emerald-800/5 rounded-xl mb-6 text-xs text-slate-800">
                      <div>
                        <span className="text-slate-500 font-semibold">اسم الطالب:</span> <strong className="text-slate-900">{student.name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold">المرحلة الدراسية:</span> <strong className="text-slate-900">{ARABIC_LABELS.stages[student.stage]}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold">السنة الدراسية:</span> <strong className="text-slate-900">{ARABIC_LABELS.grades[student.grade]}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold">المذهب الشرعي:</span> <strong className="text-slate-900">{ARABIC_LABELS.madhhabs[student.madhhab]}</strong>
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-slate-500 font-semibold">الرقم القومي المصري:</span> <strong className="text-slate-900 font-mono">{student.nationalId}</strong>
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-slate-500 font-semibold">حالة القيد الأكاديمي:</span> <strong className="text-slate-900">{ARABIC_LABELS.enrollmentStatus[student.enrollmentStatus]}</strong>
                      </div>
                    </div>

                    {/* جدول تفصيلي بالدرجات والمواد */}
                    <div className="relative z-10 overflow-hidden border border-slate-300 rounded-xl mb-6">
                      <table className="w-full text-right border-collapse text-xs">
                        <thead>
                          <tr className="bg-azhar-green text-white font-bold">
                            <th className="p-3">المادة الدراسية الأزهرية</th>
                            <th className="p-3 text-center">التصنيف</th>
                            <th className="p-3 text-center">أعمال السنة والشفهي (30%)</th>
                            <th className="p-3 text-center">الامتحان التحريري (70%)</th>
                            <th className="p-3 text-center">الدرجة الكلية</th>
                            <th className="p-3 text-center">النهاية العظمى</th>
                            <th className="p-3 text-center">النهاية الصغرى</th>
                            <th className="p-3 text-center">النتيجة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 text-slate-800">
                          {applicableSubjects.map((sub) => {
                            const gradeRecord = record.grades[sub.id];
                            return (
                              <tr key={sub.id} className="hover:bg-slate-50/50 transition-all font-medium">
                                <td className="p-3 font-bold">{sub.name}</td>
                                <td className="p-3 text-center text-slate-600">{ARABIC_LABELS.categories[sub.category]}</td>
                                <td className="p-3 text-center font-mono">{gradeRecord?.classGrade ?? 'غ/ر'}</td>
                                <td className="p-3 text-center font-mono">{gradeRecord?.examGrade ?? 'غ/ر'}</td>
                                <td className="p-3 text-center font-extrabold font-mono text-slate-900">{gradeRecord?.total ?? 'غ/ر'}</td>
                                <td className="p-3 text-center font-mono text-slate-600">{sub.maxGrade}</td>
                                <td className="p-3 text-center font-mono text-slate-600">{sub.minGrade}</td>
                                <td className="p-3 text-center">
                                  {gradeRecord ? (
                                    <span className={gradeRecord.isPassed ? 'text-azhar font-bold' : 'text-rose-700 font-bold'}>
                                      {gradeRecord.isPassed ? 'ناجح' : 'راسب'}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">غير مرصود</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* نتائج التراكمي في ذيل الكشف */}
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 border border-emerald-800/10 p-4 rounded-xl bg-emerald-50/15 mb-8 text-xs text-slate-800">
                      <div>
                        <span className="font-bold text-slate-600">المجموع التراكمي الكلي:</span>{' '}
                        <strong className="text-lg font-black font-mono text-slate-900">
                          {record.totalGradesSum} / {record.maxGradesSum}
                        </strong>
                      </div>
                      <div>
                        <span className="font-bold text-slate-600">النسبة المئوية العامة:</span>{' '}
                        <strong className="text-lg font-black font-mono text-azhar">
                          {record.gpaPercentage}%
                        </strong>
                      </div>
                      <div>
                        <span className="font-bold text-slate-600">التقدير العام / النتيجة:</span>{' '}
                        <strong className={`text-sm font-black ${record.isOverallPassed ? 'text-azhar' : 'text-rose-800'}`}>
                          {record.isOverallPassed ? '✓ ناجح ومنقول للصف الأعلى' : '⚠ راسب وله دور ثاني'}
                        </strong>
                      </div>
                    </div>

                    {/* ذيل التوقيعات والاعتماد الرسمي */}
                    <div className="relative z-10 grid grid-cols-3 gap-6 text-center text-[10px] text-slate-700 pt-8 mt-12 border-t border-slate-200">
                      <div>
                        <p className="font-bold">رئيس شؤون الطلاب</p>
                        <p className="mt-8 text-slate-400">....................................</p>
                      </div>
                      <div>
                        <p className="font-bold">مُراجع المعهد</p>
                        <p className="mt-8 text-slate-400">....................................</p>
                      </div>
                      <div>
                        <p className="font-bold">شيخ المعهد (الختم الرسمي)</p>
                        <p className="mt-8 text-slate-400">....................................</p>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="h-14 w-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-4 border border-slate-100">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="text-slate-800 font-bold text-lg font-sans">لا توجد درجات مرصودة للطالب</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                الطالب لم يرصد له أي كشف درجات بعد للعام الحالي أو الفصول السابقة. توجه لإدارة الدرجات وابدأ في رصدها لإنشاء هذا الملف معتمداً.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
