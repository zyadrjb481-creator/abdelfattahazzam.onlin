/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Student, 
  GradeLevel, 
  ARABIC_LABELS, 
  AL_AZHAR_SUBJECTS, 
  StudentTermGrades, 
  SubjectGrade, 
  AdminUser,
  Subject
} from '../types';
import { 
  fetchStudentGradesFromDB, 
  fetchAllGradesFromDB, 
  saveGradesToDB 
} from '../firebase';
import { 
  GraduationCap, 
  Save, 
  Check, 
  AlertTriangle, 
  Award, 
  CheckCircle, 
  HelpCircle,
  FileSpreadsheet,
  Users,
  ChevronDown
} from 'lucide-react';

interface TeacherManagerProps {
  students: Student[];
  loggedInAdmin: AdminUser;
}

export default function TeacherManager({ students, loggedInAdmin }: TeacherManagerProps) {
  // التحقق من وجود صف دراسي محدد للمعلم
  const restrictedGrade = loggedInAdmin.role === 'teacher' && loggedInAdmin.gradeRestriction && loggedInAdmin.gradeRestriction !== 'all'
    ? loggedInAdmin.gradeRestriction as GradeLevel
    : null;

  const initialStage = restrictedGrade
    ? (['1_prep', '2_prep', '3_prep'].includes(restrictedGrade) ? 'prep' : 'secondary')
    : 'prep';

  const [selectedStage, setSelectedStage] = useState<'prep' | 'secondary'>(initialStage);
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(restrictedGrade || '1_prep');
  const [selectedClassRoom, setSelectedClassRoom] = useState('');
  const [academicYear, setAcademicYear] = useState('2025/2026');
  const [term, setTerm] = useState<'term1' | 'term2'>('term1');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  
  // حفظ درجات الطلاب المدخلة محلياً في حالة الصفحة
  // هيكلية: { [studentId]: { exam: string, classWork: string, isParticipated: boolean } }
  const [gradesInput, setGradesInput] = useState<{ 
    [studentId: string]: { exam: string; classWork: string; isParticipated: boolean } 
  }>({});
  
  const [allGradesRecords, setAllGradesRecords] = useState<StudentTermGrades[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. تحديد الصفوف تلقائياً بناءً على المرحلة الدراسية المحددة (إذا لم يكن مقيداً بصف معين)
  useEffect(() => {
    if (restrictedGrade) return;
    if (selectedStage === 'prep') {
      setSelectedGrade('1_prep');
    } else {
      setSelectedGrade('1_secondary');
    }
  }, [selectedStage, restrictedGrade]);

  // 2. تحميل جميع درجات الطلاب المخزنة مسبقاً لتسهيل دمج الدرجات وحفظها دون فقدان بيانات المواد الأخرى
  const loadAllGrades = async () => {
    setIsLoading(true);
    try {
      const list = await fetchAllGradesFromDB();
      setAllGradesRecords(list);
    } catch (err) {
      console.error("Failed to fetch grades:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllGrades();
  }, []);

  // 3. تصفية الطلاب المنتمين للصف المختار
  const activeStudents = students.filter(s => 
    s.grade === selectedGrade && 
    (selectedClassRoom === '' || s.classRoom === selectedClassRoom)
  );

  // الفصول المتاحة لتسهيل الاختيار
  const availableClassRooms = Array.from(
    new Set(students.filter(s => s.grade === selectedGrade).map(s => s.classRoom))
  ).filter(Boolean).sort();

  // 4. تصفية المواد لتتناسب مع الصف المختار والمعلم المسئول
  const currentStage = ['1_prep', '2_prep', '3_prep'].includes(selectedGrade) ? 'prep' : 'secondary';
  const filteredSubjects = AL_AZHAR_SUBJECTS.filter(subject => {
    const isApplicable = subject.applicableStages.includes(currentStage);
    if (!isApplicable) return false;
    
    // إذا كان المستخدم معلماً ولديه مادة مخصصة
    if (loggedInAdmin.role === 'teacher' && loggedInAdmin.subjectRestriction && loggedInAdmin.subjectRestriction !== 'all') {
      return subject.id === loggedInAdmin.subjectRestriction;
    }
    return true;
  });

  // تحديث المادة الافتراضية عند تغيير الصف
  useEffect(() => {
    if (filteredSubjects.length > 0) {
      if (loggedInAdmin.role === 'teacher' && loggedInAdmin.subjectRestriction && loggedInAdmin.subjectRestriction !== 'all') {
        setSelectedSubjectId(loggedInAdmin.subjectRestriction);
      } else {
        setSelectedSubjectId(filteredSubjects[0].id);
      }
    } else {
      setSelectedSubjectId('');
    }
  }, [selectedGrade, loggedInAdmin]);

  // المادة المختارة حالياً وتفاصيل درجاتها الكبرى والصغرى
  const currentSubject = filteredSubjects.find(s => s.id === selectedSubjectId);
  const maxExamGrade = currentSubject ? Math.round(currentSubject.maxGrade * 0.7) : 0;
  const maxClassWorkGrade = currentSubject ? Math.round(currentSubject.maxGrade * 0.3) : 0;

  // 5. تهيئة المدخلات عند تغيير المادة أو الفصل أو الطلاب
  useEffect(() => {
    if (!selectedSubjectId || activeStudents.length === 0) return;

    const initialInputs: typeof gradesInput = {};
    activeStudents.forEach(student => {
      // البحث عن السجل المطابق لهذا الطالب للفصل الدراسي والعام الحالي
      const record = allGradesRecords.find(
        r => r.studentId === student.id && r.term === term && r.academicYear === academicYear
      );

      const subjectGrade = record?.grades?.[selectedSubjectId];

      if (subjectGrade) {
        initialInputs[student.id!] = {
          exam: String(subjectGrade.examGrade),
          classWork: String(subjectGrade.classGrade),
          isParticipated: true
        };
      } else {
        initialInputs[student.id!] = {
          exam: '',
          classWork: '',
          isParticipated: false
        };
      }
    });

    setGradesInput(initialInputs);
    setErrorMessage('');
  }, [selectedSubjectId, selectedGrade, selectedClassRoom, term, academicYear, allGradesRecords]);

  // تحديث قيم الدرجات والمدخلات
  const handleInputChange = (studentId: string, field: 'exam' | 'classWork', value: string) => {
    const sanitizedVal = value.replace(/[^0-9.]/g, ''); // أرقام فقط
    setGradesInput(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: sanitizedVal,
        isParticipated: true // تفعيل علامة الاختبار تلقائياً عند الكتابة
      }
    }));
  };

  const handleCheckboxChange = (studentId: string, checked: boolean) => {
    setGradesInput(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        isParticipated: checked,
        // تصفير القيم في حال إلغاء تحديد الاشتراك بالاختبار
        exam: checked ? prev[studentId]?.exam || '' : '',
        classWork: checked ? prev[studentId]?.classWork || '' : ''
      }
    }));
  };

  // 6. حفظ الدرجات المدخلة لجميع الطلاب دفعة واحدة
  const handleSaveAll = async () => {
    if (!currentSubject) return;
    setErrorMessage('');
    setIsLoading(true);

    let hasValidationError = false;
    let errorText = '';

    // التحقق من صحة جميع المدخلات للطلاب المشاركين
    for (const student of activeStudents) {
      const input = gradesInput[student.id!];
      if (input?.isParticipated) {
        const examVal = parseFloat(input.exam || '0') || 0;
        const classVal = parseFloat(input.classWork || '0') || 0;

        if (examVal > maxExamGrade) {
          errorText = `درجة اختبار الشهر للطالب (${student.name}) تجاوزت الحد الأقصى المسموح وهو ${maxExamGrade}`;
          hasValidationError = true;
          break;
        }

        if (classVal > maxClassWorkGrade) {
          errorText = `درجة أعمال الشهر والمشاركة للطالب (${student.name}) تجاوزت الحد الأقصى المسموح وهو ${maxClassWorkGrade}`;
          hasValidationError = true;
          break;
        }

        // تحقق من توافق المذهب الفقهي مع الطالب
        if (currentSubject.applicableMadhhab && !currentSubject.applicableMadhhab.includes(student.madhhab)) {
          errorText = `المادة المحددة (${currentSubject.name}) مخصصة لطلاب المذهب (${currentSubject.applicableMadhhab.map(m => ARABIC_LABELS.madhhabs[m as keyof typeof ARABIC_LABELS.madhhabs] || m).join(', ')})، بينما الطالب (${student.name}) ينتمي للمذهب (${ARABIC_LABELS.madhhabs[student.madhhab]}).`;
          hasValidationError = true;
          break;
        }
      }
    }

    if (hasValidationError) {
      setErrorMessage(errorText);
      setIsLoading(false);
      return;
    }

    try {
      // إعداد كائنات الحفظ لكل طالب
      const savePromises = activeStudents.map(async (student) => {
        const input = gradesInput[student.id!];
        
        // جلب أو العثور على سجل درجات الطالب للترم والعام الحالي
        const existingRecord = allGradesRecords.find(
          r => r.studentId === student.id && r.term === term && r.academicYear === academicYear
        );

        // خريطة الدرجات الحالية
        const gradesMap: { [subjectId: string]: SubjectGrade } = existingRecord 
          ? { ...existingRecord.grades } 
          : {};

        if (input?.isParticipated) {
          const examVal = parseFloat(input.exam || '0') || 0;
          const classVal = parseFloat(input.classWork || '0') || 0;
          const total = examVal + classVal;

          gradesMap[selectedSubjectId] = {
            examGrade: examVal,
            classGrade: classVal,
            total,
            isPassed: total >= currentSubject.minGrade
          };
        } else {
          // إذا كان غير مشارك، نمسح الدرجة للمادة من هذا الترم
          delete gradesMap[selectedSubjectId];
        }

        // تصفية المواد التي يدرسها الطالب لحساب المجموع الأقصى والمجموع الحالي
        // (حسب مرحلته ومذهبه)
        const studentApplicableSubjects = AL_AZHAR_SUBJECTS.filter(sub => {
          const matchStage = sub.applicableStages.includes(student.stage);
          const matchMadhhab = !sub.applicableMadhhab || sub.applicableMadhhab.includes(student.madhhab);
          return matchStage && matchMadhhab;
        });

        // إعادة حساب الإحصائيات الشاملة للطالب
        let totalGradesSum = 0;
        let maxGradesSum = 0;
        let hasFailedAnySubject = false;

        studentApplicableSubjects.forEach(sub => {
          const subGrade = gradesMap[sub.id];
          if (subGrade) {
            totalGradesSum += subGrade.total;
            maxGradesSum += sub.maxGrade;
            if (!subGrade.isPassed) {
              hasFailedAnySubject = true;
            }
          } else {
            // المواد التي لم يتم رصدها بعد نعتبرها 0 في الجمع الحالي للمجموع التراكمي
            maxGradesSum += sub.maxGrade;
          }
        });

        const gpaPercentage = maxGradesSum > 0 ? parseFloat(((totalGradesSum / maxGradesSum) * 100).toFixed(2)) : 0;
        const isOverallPassed = !hasFailedAnySubject && gpaPercentage >= 50;

        const termGradesRecord: StudentTermGrades = {
          id: existingRecord?.id || undefined,
          studentId: student.id!,
          term,
          academicYear,
          grades: gradesMap,
          totalGradesSum,
          maxGradesSum,
          gpaPercentage,
          isOverallPassed,
          updatedAt: Date.now()
        };

        return saveGradesToDB(termGradesRecord);
      });

      await Promise.all(savePromises);
      setIsSavedSuccessfully(true);
      await loadAllGrades(); // إعادة التحميل لتحديث البيانات من قاعدة البيانات
      setTimeout(() => setIsSavedSuccessfully(false), 3000);
    } catch (err) {
      console.error(err);
      setErrorMessage("حدث خطأ أثناء حفظ الدرجات، يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      
      {/* هيدر ترحيبي وتفاصيل الحساب الملتزم به */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 p-6 rounded-2xl text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-yellow-400 shrink-0" />
            <h1 className="text-xl md:text-2xl font-black">بوابة المعلم الأزهري لرصد درجات اختبارات الشهر</h1>
          </div>
          <p className="text-xs text-emerald-100 font-semibold mt-1.5 leading-relaxed">
            مرحباً بك فضيلة الشيخ/الأستاذ <b>{loggedInAdmin.name}</b>. يمكنك رصد وتعديل درجات اختبارات الشهر للطلاب في مادتك وتدقيق النتائج بدقة وسهولة.
          </p>
        </div>
        
        <div className="px-4 py-2 bg-black/25 rounded-xl border border-white/10 text-xs flex flex-col gap-1 shrink-0">
          <div className="flex items-center gap-1.5 justify-between">
            <span className="opacity-80 font-medium">الصف المخصص:</span>
            <span className="font-bold text-yellow-300">
              {restrictedGrade ? ARABIC_LABELS.grades[restrictedGrade] : 'جميع الصفوف (شامل)'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 justify-between">
            <span className="opacity-80 font-medium">مستوى الحساب:</span>
            <span className="font-extrabold bg-emerald-700 px-2 py-0.5 rounded text-[10px] text-white">معلم مواد</span>
          </div>
        </div>
      </div>

      {/* لوحة تحديد الفصل الدراسي والمادة */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
          <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-600" />
          <span>إعدادات دفتر رصد اختبارات الشهر</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* اختيار العام الدراسي */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-500 font-bold block">العام الأكاديمي: *</label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none text-xs font-bold bg-slate-50/50"
            >
              <option value="2025/2026">2025 / 2026</option>
              <option value="2026/2027">2026 / 2027</option>
            </select>
          </div>

          {/* اختيار الترم */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-500 font-bold block">الفصل الدراسي (الترم): *</label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value as 'term1' | 'term2')}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none text-xs font-bold bg-slate-50/50"
            >
              <option value="term1">الفصل الدراسي الأول (الترم 1)</option>
              <option value="term2">الفصل الدراسي الثاني (الترم 2)</option>
            </select>
          </div>

          {/* اختيار الصف (معطل إذا كان الحساب مقيداً) */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-500 font-bold block">الصف الدراسي المتاح: *</label>
            <select
              value={selectedGrade}
              disabled={!!restrictedGrade}
              onChange={(e) => setSelectedGrade(e.target.value as GradeLevel)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none text-xs font-bold bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              {Object.entries(ARABIC_LABELS.grades).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* تصفية الفصل السكني/الحجرة */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-500 font-bold block">فصل الطالب (مثال: 1/أ):</label>
            <select
              value={selectedClassRoom}
              onChange={(e) => setSelectedClassRoom(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none text-xs font-bold bg-slate-50/50"
            >
              <option value="">جميع فصول الصف</option>
              {availableClassRooms.map(room => (
                <option key={room} value={room}>فصل: {room}</option>
              ))}
            </select>
          </div>

          {/* اختيار المادة المراد رصدها */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-500 font-bold block">المادة الأزهرية المستهدفة: *</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-emerald-600 focus:border-emerald-700 outline-none text-xs font-black bg-emerald-50/20 text-emerald-950"
            >
              {filteredSubjects.length === 0 ? (
                <option value="">لا توجد مواد متاحة لهذا الصف</option>
              ) : (
                filteredSubjects.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} {sub.applicableMadhhab ? `(${sub.applicableMadhhab.map(m => ARABIC_LABELS.madhhabs[m as keyof typeof ARABIC_LABELS.madhhabs] || m).join('/')})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* عرض تفاصيل المادة */}
        {currentSubject && (
          <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex flex-wrap items-center justify-between text-xs font-bold text-slate-700 gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <span>المادة: <b className="text-emerald-900">{currentSubject.name}</b></span>
            </div>
            <div>
              <span>الدرجة الكلية للشهر: <b className="text-slate-900">{currentSubject.maxGrade} درجة</b></span>
            </div>
            <div className="flex gap-4">
              <span>اختبار الشهر (70%): <b className="text-slate-900">{maxExamGrade} درجة عظمى</b></span>
              <span>أعمال الشهر والمشاركة (30%): <b className="text-slate-900">{maxClassWorkGrade} درجة عظمى</b></span>
            </div>
            <div>
              <span>حد النجاح: <b className="text-rose-600">{currentSubject.minGrade} درجة</b></span>
            </div>
          </div>
        )}
      </div>

      {/* لوحة ورقة الرصد وقائمة الطلاب */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-emerald-600" />
            <span>قائمة طلاب ({ARABIC_LABELS.grades[selectedGrade]}) {selectedClassRoom ? `- فصل ${selectedClassRoom}` : ''} ({activeStudents.length} طالب نشط)</span>
          </h3>

          <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-lg border border-emerald-100 font-extrabold">
            دفتر الرصد الإلكتروني المعتمد
          </span>
        </div>

        {errorMessage && (
          <div className="m-5 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-start gap-2">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isSavedSuccessfully && (
          <div className="m-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-pulse">
            <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
            <span>تم حفظ درجات جميع الطلاب المحددين بنجاح، وتحديث مجموعهم التراكمي في المعهد الأزهري!</span>
          </div>
        )}

        {activeStudents.length === 0 ? (
          <div className="p-16 text-center text-slate-400 font-bold space-y-2">
            <p className="text-sm">لا يوجد طلاب نشطين مضافين في هذا الصف الدراسي/الفصل حالياً.</p>
            <p className="text-[10px] text-slate-400">تأكد من اختيار صف دراسي يحتوي على طلاب نشطين من شؤون الطلاب.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/75 text-slate-500 text-xs font-black border-b border-slate-100">
                  <th className="px-6 py-4 text-center w-16">امتحن؟</th>
                  <th className="px-6 py-4">اسم الطالب بالكامل</th>
                  <th className="px-6 py-4 w-32">المذهب الفقهي</th>
                  <th className="px-6 py-4 text-center w-36">درجة اختبار الشهر (العظمى: {maxExamGrade})</th>
                  <th className="px-6 py-4 text-center w-36">أعمال الشهر والمشاركة (العظمى: {maxClassWorkGrade})</th>
                  <th className="px-6 py-4 text-center w-28">مجموع الشهر الكلي ({currentSubject?.maxGrade})</th>
                  <th className="px-6 py-4 text-center w-24">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs text-slate-700 font-bold">
                {activeStudents.map((student, idx) => {
                  const input = gradesInput[student.id!] || { exam: '', classWork: '', isParticipated: false };
                  const isRestrictedMadhhab = currentSubject?.applicableMadhhab && !currentSubject.applicableMadhhab.includes(student.madhhab);
                  
                  const examVal = parseFloat(input.exam || '0') || 0;
                  const classVal = parseFloat(input.classWork || '0') || 0;
                  const total = input.isParticipated ? (examVal + classVal) : 0;
                  const isPassed = currentSubject ? total >= currentSubject.minGrade : false;

                  return (
                    <tr 
                      key={student.id} 
                      className={`transition-colors ${
                        isRestrictedMadhhab 
                          ? 'bg-slate-50/40 text-slate-400' 
                          : input.isParticipated 
                          ? 'bg-emerald-50/10' 
                          : 'hover:bg-slate-50/50'
                      }`}
                    >
                      {/* اختيار الطالب */}
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          disabled={!!isRestrictedMadhhab}
                          checked={input.isParticipated}
                          onChange={(e) => handleCheckboxChange(student.id!, e.target.checked)}
                          className="w-4.5 h-4.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        />
                      </td>

                      {/* اسم الطالب */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 font-mono text-[10px] w-5 text-center">{idx + 1}</span>
                          <div>
                            <span className={`text-xs ${isRestrictedMadhhab ? 'line-through text-slate-400' : 'font-black text-slate-800'}`}>
                              {student.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-400">
                              <span>رقم قومي: {student.nationalId}</span>
                              <span>•</span>
                              <span>فصل: {student.classRoom}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* المذهب الفقهي */}
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] ${
                          student.madhhab === 'hanafi' 
                            ? 'bg-blue-50 text-blue-700' 
                            : student.madhhab === 'shafii' 
                            ? 'bg-amber-50 text-amber-700' 
                            : 'bg-indigo-50 text-indigo-700'
                        }`}>
                          {ARABIC_LABELS.madhhabs[student.madhhab]}
                        </span>
                      </td>

                      {/* درجة الامتحان */}
                      <td className="px-6 py-4 text-center">
                        <input
                          type="text"
                          placeholder={`أقصى ${maxExamGrade}`}
                          disabled={!input.isParticipated || !!isRestrictedMadhhab}
                          value={input.exam}
                          onChange={(e) => handleInputChange(student.id!, 'exam', e.target.value)}
                          className={`w-24 px-2.5 py-1.5 text-center rounded-lg border text-xs font-black outline-none transition-all ${
                            !input.isParticipated 
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                              : examVal > maxExamGrade 
                              ? 'border-rose-400 bg-rose-50 text-rose-700 focus:ring-1 focus:ring-rose-400' 
                              : 'border-slate-200 bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 text-slate-800'
                          }`}
                        />
                      </td>

                      {/* أعمال السنة */}
                      <td className="px-6 py-4 text-center">
                        <input
                          type="text"
                          placeholder={`أقصى ${maxClassWorkGrade}`}
                          disabled={!input.isParticipated || !!isRestrictedMadhhab}
                          value={input.classWork}
                          onChange={(e) => handleInputChange(student.id!, 'classWork', e.target.value)}
                          className={`w-24 px-2.5 py-1.5 text-center rounded-lg border text-xs font-black outline-none transition-all ${
                            !input.isParticipated 
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                              : classVal > maxClassWorkGrade 
                              ? 'border-rose-400 bg-rose-50 text-rose-700 focus:ring-1 focus:ring-rose-400' 
                              : 'border-slate-200 bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 text-slate-800'
                          }`}
                        />
                      </td>

                      {/* المجموع الكلي للمادة */}
                      <td className="px-6 py-4 text-center">
                        {input.isParticipated ? (
                          <span className={`text-sm font-extrabold ${isPassed ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {total} / {currentSubject?.maxGrade}
                          </span>
                        ) : isRestrictedMadhhab ? (
                          <span className="text-[9px] text-slate-400 font-semibold italic">غير مخصص لمذهبه</span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold italic">لم يرصد بعد</span>
                        )}
                      </td>

                      {/* الحالة */}
                      <td className="px-6 py-4 text-center">
                        {input.isParticipated ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isPassed 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {isPassed ? '✓ ناجـح' : '✕ راسـب'}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* زر الحفظ في الفوتر */}
        {activeStudents.length > 0 && (
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <div className="text-[10px] text-slate-500 font-semibold">
              * يرجى التحقق بدقة من درجات اختبار الشهر وأعمال الشهر قبل النقر على زر الحفظ، حيث سيتم تحديث تقارير الطلاب والشهادات العامة فوراً.
            </div>

            <button
              onClick={handleSaveAll}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-600/10 hover:shadow-lg disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none cursor-pointer"
            >
              {isLoading ? (
                <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"></span>
              ) : (
                <Save className="h-4.5 w-4.5" />
              )}
              <span>حفظ ورصد درجات جميع الطلاب المحددين</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
