/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, AL_AZHAR_SUBJECTS, Subject, SubjectGrade, StudentTermGrades, ARABIC_LABELS } from '../types';
import { fetchStudentGradesFromDB, saveGradesToDB } from '../firebase';
import { Award, ArrowRight, Save, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';

interface GradesManagerProps {
  student: Student;
  onClose: () => void;
}

export default function GradesManager({ student, onClose }: GradesManagerProps) {
  const [academicYear, setAcademicYear] = useState('2025/2026');
  const [term, setTerm] = useState<'term1' | 'term2'>('term1');
  const [gradesInput, setGradesInput] = useState<{ [subjectId: string]: { exam: string; classWork: string } }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);
  const [validationError, setValidationError] = useState('');

  // 1. تصفية المواد لتتناسب مع هذا الطالب بالضبط (مرحلة الطالب + المذهب الفقهي الخاص به)
  const filteredSubjects = AL_AZHAR_SUBJECTS.filter(subject => {
    // التحقق من توافق المرحلة الدراسية للمادة مع مرحلة الطالب
    const matchStage = subject.applicableStages.includes(student.stage);
    
    // التحقق من توافق المذهب الفقهي إذا كانت مادة فقهية مخصصة
    const matchMadhhab = !subject.applicableMadhhab || subject.applicableMadhhab.includes(student.madhhab);

    return matchStage && matchMadhhab;
  });

  // 2. تحميل درجات الطالب السابقة إن وجدت للفصل الدراسي والسنة المحددة
  useEffect(() => {
    async function loadStudentGrades() {
      setIsLoading(true);
      try {
        const studentGrades = await fetchStudentGradesFromDB(student.id!);
        // ابحث عن السجل المطابق للفصل الدراسي والسنة الحالية
        const matchRecord = studentGrades.find(r => r.term === term && r.academicYear === academicYear);
        
        const inputs: { [subjectId: string]: { exam: string; classWork: string } } = {};
        
        filteredSubjects.forEach(sub => {
          if (matchRecord && matchRecord.grades[sub.id]) {
            inputs[sub.id] = {
              exam: String(matchRecord.grades[sub.id].examGrade),
              classWork: String(matchRecord.grades[sub.id].classGrade)
            };
          } else {
            inputs[sub.id] = { exam: '', classWork: '' };
          }
        });

        setGradesInput(inputs);
      } catch (err) {
        console.error("Error loading student grades:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStudentGrades();
  }, [term, academicYear, student.id, student.stage, student.madhhab]);

  // تحديث مدخلات الدرجات
  const handleGradeChange = (subjectId: string, field: 'exam' | 'classWork', value: string) => {
    // السماح بالأرقام فقط والنقاط العشرية
    const sanitizedVal = value.replace(/[^0-9.]/g, '');
    setGradesInput(prev => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        [field]: sanitizedVal
      }
    }));
  };

  // الحسابات المباشرة للدرجات (أثناء الكتابة)
  const calculatedStats = () => {
    let totalGradesSum = 0;
    let maxGradesSum = 0;
    let hasFailedAnySubject = false;

    const subjectsDetails = filteredSubjects.map(sub => {
      const examVal = parseFloat(gradesInput[sub.id]?.exam || '0') || 0;
      const classVal = parseFloat(gradesInput[sub.id]?.classWork || '0') || 0;
      
      // نقسم الدرجة الكلية بنسبة: 70% للامتحان و30% لأعمال السنة
      const maxExam = Math.round(sub.maxGrade * 0.7);
      const maxClass = Math.round(sub.maxGrade * 0.3);

      const total = examVal + classVal;
      const isPassed = total >= sub.minGrade;
      
      if (!isPassed) {
        hasFailedAnySubject = true;
      }

      totalGradesSum += total;
      maxGradesSum += sub.maxGrade;

      return {
        id: sub.id,
        name: sub.name,
        category: sub.category,
        examVal,
        classVal,
        maxExam,
        maxClass,
        total,
        maxGrade: sub.maxGrade,
        minGrade: sub.minGrade,
        isPassed
      };
    });

    const gpaPercentage = maxGradesSum > 0 ? parseFloat(((totalGradesSum / maxGradesSum) * 100).toFixed(2)) : 0;
    const isOverallPassed = !hasFailedAnySubject && gpaPercentage >= 50;

    return {
      subjectsDetails,
      totalGradesSum,
      maxGradesSum,
      gpaPercentage,
      isOverallPassed
    };
  };

  const { subjectsDetails, totalGradesSum, maxGradesSum, gpaPercentage, isOverallPassed } = calculatedStats();

  // حفظ الدرجات
  const handleSaveGrades = async () => {
    setValidationError('');
    setIsLoading(true);

    // التحقق من صحة الدرجات المدخلة ومطابقتها للشروط والحدود العظمى والصغرى
    let isValid = true;
    for (const sub of filteredSubjects) {
      const examVal = parseFloat(gradesInput[sub.id]?.exam || '0') || 0;
      const classVal = parseFloat(gradesInput[sub.id]?.classWork || '0') || 0;

      const maxExam = Math.round(sub.maxGrade * 0.7);
      const maxClass = Math.round(sub.maxGrade * 0.3);

      if (examVal > maxExam) {
        setValidationError(`درجة امتحان مادة (${sub.name}) يجب ألا تتجاوز الحد الأقصى وهو ${maxExam}`);
        isValid = false;
        break;
      }

      if (classVal > maxClass) {
        setValidationError(`درجة أعمال سنة مادة (${sub.name}) يجب ألا تتجاوز الحد الأقصى وهو ${maxClass}`);
        isValid = false;
        break;
      }
    }

    if (!isValid) {
      setIsLoading(false);
      return;
    }

    try {
      // إعداد كائن الحفظ النهائي بالدرجات
      const gradesMap: { [subjectId: string]: SubjectGrade } = {};
      
      filteredSubjects.forEach(sub => {
        const examVal = parseFloat(gradesInput[sub.id]?.exam || '0') || 0;
        const classVal = parseFloat(gradesInput[sub.id]?.classWork || '0') || 0;
        const total = examVal + classVal;
        
        gradesMap[sub.id] = {
          examGrade: examVal,
          classGrade: classVal,
          total,
          isPassed: total >= sub.minGrade
        };
      });

      const termGradesRecord: StudentTermGrades = {
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

      await saveGradesToDB(termGradesRecord);
      setIsSavedSuccessfully(true);
      setTimeout(() => setIsSavedSuccessfully(false), 3000);
    } catch (err) {
      console.error("Failed to save student grades:", err);
      setValidationError("فشل الحفظ. يرجى مراجعة اتصال الإنترنت أو قواعد البيانات.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* هيدر الصفحة والعودة */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all border border-slate-100 text-slate-500"
            title="رجوع لسجل الطلاب"
            id="back-from-grades-btn"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-850 font-sans">رصد وإدارة درجات الطالب</h1>
              <span className="bg-emerald-50/60 text-azhar text-xs font-bold px-2.5 py-1 rounded-lg border border-emerald-100/50">
                {student.name}
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-0.5">
              إدخال درجات الفترات والامتحانات لمواد الأزهر الشريف طبقاً لمذهب الطالب: ({ARABIC_LABELS.madhhabs[student.madhhab]})
            </p>
          </div>
        </div>
      </div>

      {/* لوحة تحديد الفصل الدراسي والعام الأكاديمي */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* اختيار العام الدراسي */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">العام الدراسي</label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-azhar-green focus:ring-1 focus:ring-azhar-green outline-none text-slate-700 text-xs transition-all bg-slate-50/50"
              id="grades-academic-year"
            >
              <option value="2025/2026">العام الدراسي: 2025/2026</option>
              <option value="2026/2027">العام الدراسي: 2026/2027</option>
            </select>
          </div>

          {/* اختيار الترم */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">الفصل الدراسي</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTerm('term1')}
                className={`py-2.5 rounded-xl border text-xs font-medium transition-all ${term === 'term1' ? 'bg-azhar-green border-azhar-green text-white shadow-sm font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                id="grades-term-1"
              >
                الفصل الدراسي الأول (الترم الأول)
              </button>
              <button
                type="button"
                onClick={() => setTerm('term2')}
                className={`py-2.5 rounded-xl border text-xs font-medium transition-all ${term === 'term2' ? 'bg-azhar-green border-azhar-green text-white shadow-sm font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                id="grades-term-2"
              >
                الفصل الدراسي الثاني (الترم الثاني)
              </button>
            </div>
          </div>
        </div>
      </div>

      {validationError && (
        <div className="bg-rose-50 border-r-4 border-rose-500 text-rose-800 p-4 rounded-xl flex items-start gap-3 shadow-sm">
          <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="text-sm font-medium">{validationError}</div>
        </div>
      )}

      {/* لوحة إدخال درجات المواد كجدول تفصيلي */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-20 text-center text-slate-500 space-y-2">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-azhar-green border-t-transparent rounded-full mb-2"></div>
            <p className="text-sm font-semibold">جاري تحميل سجل درجات الطالب...</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-650 text-xs font-bold border-b border-slate-100">
                    <th className="p-4 w-1/4">المادة الدراسية الأزهرية</th>
                    <th className="p-4 text-center">التصنيف</th>
                    <th className="p-4 text-center">درجة أعمال السنة / الشفهي (30%)</th>
                    <th className="p-4 text-center">درجة الامتحان التحريري (70%)</th>
                    <th className="p-4 text-center">مجموع الدرجة</th>
                    <th className="p-4 text-center">النهاية العظمى / الصغرى</th>
                    <th className="p-4 text-center">حالة المادة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-slate-700 text-sm">
                  {subjectsDetails.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition-all">
                      {/* اسم المادة */}
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-sm">
                          {sub.name}
                        </div>
                      </td>

                      {/* التصنيف */}
                      <td className="p-4 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          sub.category === 'shari' 
                            ? 'bg-emerald-50/60 text-azhar border border-emerald-100/50'
                            : sub.category === 'arabic'
                              ? 'bg-sky-50 text-sky-800 border border-sky-100'
                              : 'bg-indigo-50 text-indigo-800 border border-indigo-100'
                        }`}>
                          {ARABIC_LABELS.categories[sub.category]}
                        </span>
                      </td>

                      {/* أعمال السنة والشفهي (30%) */}
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="text"
                            placeholder="0"
                            value={gradesInput[sub.id]?.classWork || ''}
                            onChange={(e) => handleGradeChange(sub.id, 'classWork', e.target.value)}
                            className="w-16 text-center px-2 py-1.5 border border-slate-200 focus:border-azhar-green rounded-lg text-xs font-mono outline-none"
                            id={`class-grade-input-${sub.id}`}
                          />
                          <span className="text-slate-400 text-[10px]">من {sub.maxClass}</span>
                        </div>
                      </td>

                      {/* التحريري (70%) */}
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="text"
                            placeholder="0"
                            value={gradesInput[sub.id]?.exam || ''}
                            onChange={(e) => handleGradeChange(sub.id, 'exam', e.target.value)}
                            className="w-16 text-center px-2 py-1.5 border border-slate-200 focus:border-azhar-green rounded-lg text-xs font-mono outline-none"
                            id={`exam-grade-input-${sub.id}`}
                          />
                          <span className="text-slate-400 text-[10px]">من {sub.maxExam}</span>
                        </div>
                      </td>

                      {/* مجموع الدرجة */}
                      <td className="p-4 text-center font-bold text-slate-800 text-sm font-mono">
                        {sub.total}
                      </td>

                      {/* العظمى والصغرى */}
                      <td className="p-4 text-center text-slate-500 text-xs font-mono">
                        {sub.maxGrade} / <span className="text-rose-600 font-semibold">{sub.minGrade}</span>
                      </td>

                      {/* الحالة */}
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center justify-center text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                          sub.isPassed 
                            ? 'bg-emerald-50/60 text-azhar border border-emerald-100/50' 
                            : 'bg-rose-50 text-rose-800 border border-rose-100'
                        }`}>
                          {sub.isPassed ? '✓ اجتاز (ناجح)' : '⚠ لم يجتز (راسب)'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* بطاقة عرض النتيجة التراكمية الحية */}
            <div className="bg-slate-50 p-6 border-t border-slate-100 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-6">
              
              {/* التراكمي المباشر */}
              <div className="flex flex-wrap items-center gap-6">
                
                {/* المجموع الكلي */}
                <div className="bg-white px-5 py-3.5 rounded-xl border border-slate-200 flex items-center gap-3">
                  <div className="bg-slate-50 p-2.5 rounded-lg text-slate-600">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-450 font-semibold">المجموع التراكمي</p>
                    <p className="text-lg font-extrabold text-slate-800 font-mono mt-0.5">
                      {totalGradesSum} / {maxGradesSum}
                    </p>
                  </div>
                </div>

                {/* النسبة المئوية */}
                <div className="bg-white px-5 py-3.5 rounded-xl border border-slate-200 flex items-center gap-3">
                  <div className="bg-emerald-50/60 p-2.5 rounded-lg text-azhar">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-450 font-semibold">النسبة المئوية</p>
                    <p className="text-lg font-extrabold text-azhar font-mono mt-0.5">
                      {gpaPercentage}%
                    </p>
                  </div>
                </div>

                {/* النتيجة الإجمالية */}
                <div className="bg-white px-5 py-3.5 rounded-xl border border-slate-200 flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${isOverallPassed ? 'bg-emerald-50/60 text-azhar border border-emerald-100/30' : 'bg-rose-50 text-rose-800'}`}>
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-450 font-semibold">النتيجة العامة للترم</p>
                    <p className={`text-md font-extrabold mt-0.5 ${isOverallPassed ? 'text-azhar' : 'text-rose-800'}`}>
                      {isOverallPassed ? 'ناجح ومنقول' : 'راسب (باقي للإعادة)'}
                    </p>
                  </div>
                </div>

              </div>

              {/* أزرار الحفظ والإلغاء */}
              <div className="flex items-center gap-3 justify-end shrink-0">
                {isSavedSuccessfully && (
                  <span className="text-xs text-emerald-700 font-bold animate-pulse bg-emerald-50/60 px-3 py-2 rounded-lg border border-emerald-100/50">
                    ✓ تم حفظ الدرجات بنجاح!
                  </span>
                )}
                
                <button
                  onClick={onClose}
                  className="px-5 py-3.5 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-semibold transition-all border border-transparent"
                  id="cancel-grades-btn"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveGrades}
                  className="bg-azhar-green hover:bg-azhar-green-hover text-white px-7 py-3.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                  id="save-grades-submit-btn"
                >
                  <Save className="h-4.5 w-4.5" />
                  حفظ ورصد درجات الطالب
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
