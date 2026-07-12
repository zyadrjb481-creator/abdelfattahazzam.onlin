/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, StudentTermGrades, AttendanceRecord, ARABIC_LABELS, Inquiry, AdminUser } from '../types';
import { fetchAllGradesFromDB, fetchAttendanceFromDB, fetchInquiriesFromDB } from '../firebase';
import { Users, GraduationCap, Award, BookOpen, CheckCircle, Flame, Calendar, Map, CheckSquare, Search, AlertCircle, User, MessageSquare } from 'lucide-react';

interface DashboardProps {
  students: Student[];
  onNavigateToStudents: () => void;
  onNavigateToAttendance: () => void;
  onAddStudent: () => void;
  onViewProfile: (student: Student) => void;
  onNavigateToInquiries: () => void;
  loggedInAdmin?: AdminUser | null;
}

export default function Dashboard({
  students,
  onNavigateToStudents,
  onNavigateToAttendance,
  onAddStudent,
  onViewProfile,
  onNavigateToInquiries,
  loggedInAdmin
 }: DashboardProps) {
  const [grades, setGrades] = useState<StudentTermGrades[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadStats() {
      setIsLoading(true);
      try {
        const allGrades = await fetchAllGradesFromDB();
        setGrades(allGrades);

        const allAttendance = await fetchAttendanceFromDB();
        setAttendance(allAttendance);

        const allInquiries = await fetchInquiriesFromDB();
        setInquiries(allInquiries);
      } catch (err) {
        console.error("Error loading dashboard stats:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, [students]);

  // حساب الأعداد العامة
  const totalStudents = students.length;
  const prepCount = students.filter(s => s.stage === 'prep').length;
  const secondaryCount = students.filter(s => s.stage === 'secondary').length;

  // المذاهب الفقهية
  const hanafiCount = students.filter(s => s.madhhab === 'hanafi').length;
  const shafiiCount = students.filter(s => s.madhhab === 'shafii').length;
  const malikiCount = students.filter(s => s.madhhab === 'maliki').length;

  const madhhabPercentages = () => {
    if (totalStudents === 0) return { hanafi: 0, shafii: 0, maliki: 0 };
    return {
      hanafi: Math.round((hanafiCount / totalStudents) * 100),
      shafii: Math.round((shafiiCount / totalStudents) * 100),
      maliki: Math.round((malikiCount / totalStudents) * 100)
    };
  };

  const { hanafi: hanafiPct, shafii: shafiiPct, maliki: malikiPct } = madhhabPercentages();

  // حساب غياب اليوم (آخر تاريخ مسجل في الدفتر)
  const getTodayAttendancePercentage = () => {
    if (attendance.length === 0) return 100;
    
    // اعثر على أحدث تاريخ في سجلات الغياب
    const uniqueDates = Array.from(new Set(attendance.map(a => a.date))).sort();
    const latestDate = uniqueDates[uniqueDates.length - 1];
    
    if (!latestDate) return 100;

    const todayRecords = attendance.filter(a => a.date === latestDate);
    if (todayRecords.length === 0) return 100;

    const present = todayRecords.filter(a => a.status === 'present').length;
    return Math.round((present / todayRecords.length) * 100);
  };

  const todayAttendancePct = getTodayAttendancePercentage();

  // لوحة الشرف للطلاب المتفوقين (GPA >= 90%)
  const topStudents = () => {
    if (grades.length === 0) return [];
    
    // احسب متوسط درجات الطلاب لترتيب المتفوقين
    const studentAverages: { [studentId: string]: { name: string; gpa: number; grade: string; stage: string } } = {};
    
    grades.forEach(g => {
      const student = students.find(s => s.id === g.studentId);
      if (student) {
        // نأخذ المجموع الأعلى لو كان الطالب مسجل له كشف درجات لأكثر من ترم
        if (!studentAverages[g.studentId] || studentAverages[g.studentId].gpa < g.gpaPercentage) {
          studentAverages[g.studentId] = {
            name: student.name,
            gpa: g.gpaPercentage,
            grade: student.grade,
            stage: student.stage
          };
        }
      }
    });

    return Object.values(studentAverages)
      .filter(item => item.gpa >= 90)
      .sort((a, b) => b.gpa - a.gpa)
      .slice(0, 5); // خذ أعلى 5 طلاب متفوقين
  };

  const honorsList = topStudents();

  // حساب الاستفسارات قيد الانتظار للشات بوت
  const pendingInquiriesCount = inquiries.filter(i => i.status === 'pending').length;

  // الحصول على تاريخ اليوم بالصيغة العربية الجميلة
  const getArabicFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('ar-EG', options);
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* هيدر الترحيب الأزهري */}
      <div className="bg-gradient-to-l from-azhar-green to-azhar-green-hover text-white p-6 rounded-2xl shadow-xl border border-green-950 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="bg-yellow-400 text-azhar-green-hover font-black text-[10px] px-2 py-0.5 rounded-md shadow-sm">بوابة المعهد</span>
            <span className="text-emerald-200 text-xs font-semibold">{getArabicFormattedDate()}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black font-sans leading-tight">
            مرحباً بك في لوحة تحكم معهد الأزهر الشريف
          </h1>
          <p className="text-emerald-100/90 text-xs md:text-sm max-w-xl leading-relaxed">
            النظام المتكامل لإدارة شؤون الطلاب، ورصد الدفاتر اليومية للحضور والغياب، وإدارة درجات الفقه والقرآن والمواد الثقافية.
          </p>
        </div>

        {(!loggedInAdmin || loggedInAdmin.role !== 'attendance_officer') ? (
          <button 
            onClick={onAddStudent}
            className="relative z-10 shrink-0 bg-white hover:bg-yellow-400 text-azhar-green hover:text-azhar-green-hover px-5 py-3 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
            id="dash-quick-add"
          >
            + تسجيل طالب جديد
          </button>
        ) : (
          <button 
            onClick={onNavigateToAttendance}
            className="relative z-10 shrink-0 bg-white hover:bg-yellow-400 text-azhar-green hover:text-azhar-green-hover px-5 py-3 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
            id="dash-quick-attendance"
          >
            + رصد الحضور اليومي
          </button>
        )}
      </div>

      {/* تنبيه بالاستفسارات قيد الانتظار */}
      {pendingInquiriesCount > 0 && (!loggedInAdmin || loggedInAdmin.role !== 'attendance_officer') && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-750 flex items-center justify-center text-lg font-bold shrink-0 animate-pulse">
              💬
            </div>
            <div>
              <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                <span>يوجد {pendingInquiriesCount} استفسارات جديدة معلقة بالشات بوت!</span>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              </h4>
              <p className="text-[10px] text-amber-750 font-semibold mt-0.5">
                قام بعض الزوار أو أولياء الأمور بترك أسئلتهم بانتظار رد شؤون طلاب المعهد (بنين).
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToInquiries}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
          >
            عرض وإدارة الطلبات ←
          </button>
        </div>
      )}

      {/* كروت الإحصائيات الأربعة السريعة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* إجمالي الطلاب المقيدين */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-4 group hover:border-azhar-green/30 transition-all">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 font-semibold">إجمالي الطلاب المقيدين</p>
            <h3 className="text-2xl font-black text-azhar font-mono mt-0.5">{totalStudents}</h3>
            <p className="text-[10px] text-emerald-700 font-medium">الطلاب المسجلين نشطين</p>
          </div>
          <div className="bg-emerald-50 text-azhar p-3 rounded-xl border border-emerald-100 group-hover:scale-105 transition-transform shrink-0">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* طلاب الإعدادي */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-4 group hover:border-sky-200 transition-all">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 font-semibold">المرحلة الإعدادية</p>
            <h3 className="text-2xl font-black text-sky-800 font-mono mt-0.5">{prepCount}</h3>
            <p className="text-[10px] text-sky-700 font-medium">صفوف: أولى وتانية وتالتة إعدادي</p>
          </div>
          <div className="bg-sky-50 text-sky-800 p-3 rounded-xl border border-sky-100 group-hover:scale-105 transition-transform shrink-0">
            <GraduationCap className="h-6 w-6" />
          </div>
        </div>

        {/* طلاب الثانوي */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-4 group hover:border-indigo-200 transition-all">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 font-semibold">المرحلة الثانوية</p>
            <h3 className="text-2xl font-black text-indigo-850 font-mono mt-0.5">{secondaryCount}</h3>
            <p className="text-[10px] text-indigo-700 font-medium">صفوف: أولى وتانية ثانوي</p>
          </div>
          <div className="bg-indigo-50 text-indigo-800 p-3 rounded-xl border border-indigo-100 group-hover:scale-105 transition-transform shrink-0">
            <BookOpen className="h-6 w-6" />
          </div>
        </div>

        {/* نسبة حضور اليوم */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-4 group hover:border-amber-200 transition-all">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 font-semibold">نسبة الحضور اليومي</p>
            <h3 className="text-2xl font-black text-amber-700 font-mono mt-0.5">{todayAttendancePct}%</h3>
            <p className="text-[10px] text-amber-700 font-medium">وفقاً لآخر كشف حضور مسجل</p>
          </div>
          <div className="bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-100 group-hover:scale-105 transition-transform shrink-0">
            <CheckCircle className="h-6 w-6" />
          </div>
        </div>

      </div>

      {/* الإحصائيات التفصيلية ولوحة الشرف */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* العمود الأيمن: نسب المذاهب والأقسام الدراسية */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 lg:col-span-2">
          
          {/* كرت المذاهب الشرعية بالأزهر */}
          <div className="space-y-4">
            <h3 className="text-slate-800 font-bold text-sm font-sans flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-azhar-green rounded"></span>
              التوزيع الديموغرافي للمذاهب الشرعية بالأزهر الشريف
            </h3>
            
            {totalStudents > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* الحنفي */}
                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 space-y-2">
                  <div className="flex justify-between items-center text-xs text-amber-900 font-bold">
                    <span>{ARABIC_LABELS.madhhabs.hanafi}</span>
                    <span className="font-mono">{hanafiPct}%</span>
                  </div>
                  <div className="h-2 w-full bg-amber-100 rounded-full overflow-hidden">
                    <div className="bg-amber-600 h-full rounded-full transition-all duration-500" style={{ width: `${hanafiPct}%` }}></div>
                  </div>
                  <p className="text-[10px] text-amber-850 font-medium font-mono">{hanafiCount} طالب مقيد</p>
                </div>

                {/* الشافعي */}
                <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 space-y-2">
                  <div className="flex justify-between items-center text-xs text-purple-900 font-bold">
                    <span>{ARABIC_LABELS.madhhabs.shafii}</span>
                    <span className="font-mono">{shafiiPct}%</span>
                  </div>
                  <div className="h-2 w-full bg-purple-100 rounded-full overflow-hidden">
                    <div className="bg-purple-600 h-full rounded-full transition-all duration-500" style={{ width: `${shafiiPct}%` }}></div>
                  </div>
                  <p className="text-[10px] text-purple-850 font-medium font-mono">{shafiiCount} طالب مقيد</p>
                </div>

                {/* المالكي */}
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-2">
                  <div className="flex justify-between items-center text-xs text-indigo-900 font-bold">
                    <span>{ARABIC_LABELS.madhhabs.maliki}</span>
                    <span className="font-mono">{malikiPct}%</span>
                  </div>
                  <div className="h-2 w-full bg-indigo-100 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${malikiPct}%` }}></div>
                  </div>
                  <p className="text-[10px] text-indigo-850 font-medium font-mono">{malikiCount} طالب مقيد</p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                لا توجد إحصاءات حالية للمذاهب. يرجى إضافة طلاب أولاً لتوليد التقارير.
              </div>
            )}
          </div>

          {/* روابط سريعة لإدارة المعهد */}
          <div className="space-y-3 pt-4 border-t border-slate-150">
            <h4 className="text-slate-850 font-bold text-xs font-sans">عمليات إدارية سريعة ومهمة بالمعهد</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={onNavigateToStudents}
                className="p-4 rounded-xl border border-slate-200 hover:border-azhar-green hover:bg-emerald-50/10 text-right transition-all flex items-center justify-between gap-4 group"
              >
                <div>
                  <h5 className="font-bold text-slate-800 text-xs group-hover:text-azhar-green-hover">إدارة سجل شؤون الطلاب</h5>
                  <p className="text-[10px] text-slate-450 mt-1">سجل التقييدات والتعديل لبيانات الطلاب وأرقام الهواتف</p>
                </div>
                <Users className="h-5 w-5 text-slate-400 group-hover:text-azhar-green shrink-0 transition-colors" />
              </button>

              <button
                onClick={onNavigateToAttendance}
                className="p-4 rounded-xl border border-slate-200 hover:border-azhar-green hover:bg-emerald-50/10 text-right transition-all flex items-center justify-between gap-4 group"
              >
                <div>
                  <h5 className="font-bold text-slate-800 text-xs group-hover:text-azhar-green-hover">رصد الحضور والغياب اليومي</h5>
                  <p className="text-[10px] text-slate-450 mt-1">تحديد دفتر الحضور وتوثيق الغيابات والغياب بعذر للطلاب</p>
                </div>
                <CheckSquare className="h-5 w-5 text-slate-400 group-hover:text-azhar-green shrink-0 transition-colors" />
              </button>
            </div>
          </div>

        </div>

        {/* العمود الأيسر: لوحة الشرف وأوائل المعهد (المتفوقين) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-slate-800 font-bold text-sm font-sans flex items-center gap-2">
              <Flame className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
              <span>لوحة شرف أوائل الطلاب بالمعهد</span>
            </h3>
            <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-100">
              متفوقين {`>= 90%`}
            </span>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-azhar-green border-t-transparent rounded-full"></div>
            </div>
          ) : honorsList.length > 0 ? (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[35vh]">
              {honorsList.map((student, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-gradient-to-l from-slate-50 to-slate-50/20 border border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`h-7 w-7 rounded-lg font-bold text-xs flex items-center justify-center ${
                      idx === 0 
                        ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                        : idx === 1
                          ? 'bg-slate-200 text-slate-800 border border-slate-300'
                          : 'bg-orange-100 text-orange-800 border border-orange-200'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">{student.name}</h4>
                      <p className="text-[9px] text-slate-450 mt-0.5">{ARABIC_LABELS.grades[student.grade]}</p>
                    </div>
                  </div>
                  
                  <span className="text-xs font-black font-mono text-azhar bg-emerald-50 px-2 py-1 rounded border border-emerald-100/50">
                    {student.gpa}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-100 rounded-xl">
              <Award className="h-10 w-10 text-slate-300 mb-2" />
              <h4 className="text-xs font-bold text-slate-550">لا يوجد متفوقين حالياً</h4>
              <p className="text-[10px] text-slate-450 mt-1 max-w-xs leading-relaxed">
                سيظهر أوائل الطلاب في هذه القائمة تلقائياً فور قيام المدرسين برصد درجات الفصل بمجموع مئوي يتجاوز 90%.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
