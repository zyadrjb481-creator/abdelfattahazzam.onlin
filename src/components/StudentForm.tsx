/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, AcademicStage, GradeLevel, Madhhab, EnrollmentStatus, Gender, ARABIC_LABELS } from '../types';
import { X, UserPlus, Save, AlertCircle, Sparkles } from 'lucide-react';

interface StudentFormProps {
  student?: Student; // إذا تم إرساله، تكون العملية "تعديل" وإلا "إضافة جديد"
  onSave: (studentData: Omit<Student, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

export default function StudentForm({ student, onSave, onClose }: StudentFormProps) {
  // الحقول الفرعية للنموذج
  const [name, setName] = useState('');
  const [stage, setStage] = useState<AcademicStage>('prep');
  const [grade, setGrade] = useState<GradeLevel>('1_prep');
  const [classRoom, setClassRoom] = useState('1/1');
  const [madhhab, setMadhhab] = useState<Madhhab>('hanafi');
  const [nationalId, setNationalId] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [address, setAddress] = useState('');
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus>('new');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // شحن البيانات في حالة التعديل
  useEffect(() => {
    if (student) {
      setName(student.name);
      setStage(student.stage);
      setGrade(student.grade);
      setClassRoom(student.classRoom);
      setMadhhab('hanafi');
      setNationalId(student.nationalId);
      setBirthDate(student.birthDate);
      setGender(student.gender);
      setGuardianName(student.guardianName);
      setGuardianPhone(student.guardianPhone);
      setAddress(student.address);
      setEnrollmentStatus(student.enrollmentStatus);
      setNotes(student.notes || '');
    }
  }, [student]);

  // تعديل تلقائي للصفوف عند تغيير المرحلة الدراسية
  const handleStageChange = (selectedStage: AcademicStage) => {
    setStage(selectedStage);
    if (selectedStage === 'prep') {
      setGrade('1_prep');
    } else {
      setGrade('1_secondary');
    }
  };

  // استخراج تاريخ الميلاد والجنس من الرقم القومي المصري تلقائياً (ذكاء اصطناعي محلي)
  useEffect(() => {
    if (nationalId.length === 14) {
      // التحقق من صحة الرقم القومي المصري المبدئية
      const centuryDigit = nationalId.charAt(0);
      const year = nationalId.substring(1, 3);
      const month = nationalId.substring(3, 5);
      const day = nationalId.substring(5, 7);

      if (['2', '3'].includes(centuryDigit)) {
        // تحديد القرن (2 للقرن 1900-1999، 3 للقرن 2000-2099)
        const fullYear = (centuryDigit === '3' ? '20' : '19') + year;
        const formattedBirthdate = `${fullYear}-${month}-${day}`;
        setBirthDate(formattedBirthdate);
        setGender('male');
      }
    }
  }, [nationalId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // التحقق من المدخلات
    if (!name.trim()) {
      setErrorMessage('يرجى إدخال اسم الطالب ثلاثي أو رباعي.');
      return;
    }
    if (name.trim().split(' ').length < 3) {
      setErrorMessage('يرجى إدخال الاسم كاملاً (ثلاثي على الأقل) لسهولة التعرف على الطالب.');
      return;
    }
    if (nationalId.length !== 14 || isNaN(Number(nationalId))) {
      setErrorMessage('الرقم القومي المصري يجب أن يتكون من 14 رقماً صحيحاً.');
      return;
    }
    if (!classRoom.trim()) {
      setErrorMessage('يرجى كتابة اسم أو رقم الفصل (مثال: أ، ب، 1/1).');
      return;
    }
    if (!guardianName.trim()) {
      setErrorMessage('يرجى إدخال اسم ولي الأمر.');
      return;
    }
    if (!guardianPhone.trim() || guardianPhone.length < 11) {
      setErrorMessage('يرجى إدخال هاتف ولي أمر صحيح (11 رقماً على الأقل).');
      return;
    }
    if (!birthDate) {
      setErrorMessage('يرجى اختيار تاريخ الميلاد.');
      return;
    }

    onSave({
      name: name.trim(),
      stage,
      grade,
      classRoom: classRoom.trim(),
      madhhab,
      nationalId,
      birthDate,
      gender,
      guardianName: guardianName.trim(),
      guardianPhone: guardianPhone.trim(),
      address: address.trim(),
      enrollmentStatus,
      notes: notes.trim()
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-emerald-100/30 flex flex-col max-h-[90vh]">
        
        {/* الهيدر */}
        <div className="bg-gradient-to-l from-azhar-green to-azhar-green-hover px-6 py-4 rounded-t-2xl flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg border border-white/20">
              <UserPlus className="h-6 w-6 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-sans">
                {student ? 'تعديل بيانات الطالب الأزهري' : 'تسجيل طالب جديد بالمعهد'}
              </h2>
              <p className="text-emerald-100 text-xs mt-0.5">
                أدخل كافة البيانات الشخصية والشرعية بدقة مع مطابقة الرقم القومي
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-emerald-100 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
            aria-label="إغلاق"
            id="close-student-form"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* جسم الفورم */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {errorMessage && (
            <div className="bg-rose-50 border-r-4 border-rose-500 text-rose-800 p-4 rounded-xl flex items-start gap-3 shadow-sm">
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-sm font-medium">{errorMessage}</div>
            </div>
          )}

          {/* القسم الأول: البيانات الأساسية */}
          <div>
            <h3 className="text-sm font-bold text-azhar mb-3 pb-1 border-b border-emerald-100/50 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-azhar-green rounded"></span>
              البيانات الشخصية والأساسية للأزهر الشريف
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* الاسم بالكامل */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">اسم الطالب بالكامل (ثنائي أو ثلاثي كما بالشهادة) <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="محمد أحمد محمود الشافعي"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-azhar-green focus:ring-1 focus:ring-azhar-green outline-none text-slate-800 text-sm transition-all bg-slate-50/30"
                  id="student-name-input"
                />
              </div>

              {/* الرقم القومي */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">الرقم القومي المصري (14 رقم) <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={14}
                    required
                    placeholder="30501121512345"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-azhar-green focus:ring-1 focus:ring-azhar-green outline-none text-slate-800 text-sm font-mono tracking-wider transition-all bg-slate-50/30"
                    id="student-national-id"
                  />
                  {nationalId.length === 14 && (
                    <span className="absolute left-3 top-2.5 text-xs text-azhar font-bold flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> ذكي
                    </span>
                  )}
                </div>
              </div>

              {/* تاريخ الميلاد */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">تاريخ الميلاد <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-azhar-green focus:ring-1 focus:ring-azhar-green outline-none text-slate-800 text-sm transition-all bg-slate-50/30"
                  id="student-birth-date"
                />
              </div>

              {/* المذهب الفقهي */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">المذهب الفقهي الأزهري <span className="text-rose-500">*</span></label>
                <select
                  disabled
                  value="hanafi"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-800 text-sm transition-all bg-slate-100 cursor-not-allowed opacity-80"
                  id="student-madhhab"
                >
                  <option value="hanafi">{ARABIC_LABELS.madhhabs.hanafi} (ثابت للمعهد)</option>
                </select>
              </div>
            </div>
          </div>

          {/* القسم الثاني: البيانات الدراسية والتوزيع في المعهد */}
          <div>
            <h3 className="text-sm font-bold text-azhar mb-3 pb-1 border-b border-emerald-100/50 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-azhar-green rounded"></span>
              التوزيع الأكاديمي والصفي بالمعهد
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* المرحلة الدراسية */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">المرحلة الدراسية <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleStageChange('prep')}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${stage === 'prep' ? 'bg-azhar-green border-azhar-green text-white shadow-md' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    id="stage-prep-btn"
                  >
                    الإعدادي
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStageChange('secondary')}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${stage === 'secondary' ? 'bg-azhar-green border-azhar-green text-white shadow-md' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    id="stage-secondary-btn"
                  >
                    الثانوي
                  </button>
                </div>
              </div>

              {/* الصف الدراسي */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">الصف الدراسي <span className="text-rose-500">*</span></label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as GradeLevel)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-azhar-green focus:ring-1 focus:ring-azhar-green outline-none text-slate-800 text-sm transition-all bg-slate-50/30"
                  id="student-grade-level"
                >
                  {stage === 'prep' ? (
                    <>
                      <option value="1_prep">{ARABIC_LABELS.grades['1_prep']}</option>
                      <option value="2_prep">{ARABIC_LABELS.grades['2_prep']}</option>
                      <option value="3_prep">{ARABIC_LABELS.grades['3_prep']}</option>
                    </>
                  ) : (
                    <>
                      <option value="1_secondary">{ARABIC_LABELS.grades['1_secondary']}</option>
                      <option value="2_secondary">{ARABIC_LABELS.grades['2_secondary']}</option>
                    </>
                  )}
                </select>
              </div>

              {/* حالة القيد */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">حالة القيد بالمعهد <span className="text-rose-500">*</span></label>
                <select
                  value={enrollmentStatus}
                  onChange={(e) => setEnrollmentStatus(e.target.value as EnrollmentStatus)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-azhar-green focus:ring-1 focus:ring-azhar-green outline-none text-slate-800 text-sm transition-all bg-slate-50/30"
                  id="student-enrollment-status"
                >
                  <option value="new">{ARABIC_LABELS.enrollmentStatus.new}</option>
                  <option value="repeating">{ARABIC_LABELS.enrollmentStatus.repeating}</option>
                </select>
              </div>
            </div>
          </div>

          {/* القسم الثالث: بيانات ولي الأمر والاتصال */}
          <div>
            <h3 className="text-sm font-bold text-azhar mb-3 pb-1 border-b border-emerald-100/50 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-azhar-green rounded"></span>
              بيانات ولي الأمر والاتصال
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* اسم ولي الأمر */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">اسم ولي الأمر بالكامل <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="أحمد محمود الشافعي"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-azhar-green focus:ring-1 focus:ring-azhar-green outline-none text-slate-800 text-sm transition-all bg-slate-50/30"
                  id="student-guardian-name"
                />
              </div>

              {/* هاتف ولي الأمر */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">رقم هاتف ولي الأمر للتواصل <span className="text-rose-500">*</span></label>
                <input
                  type="tel"
                  required
                  placeholder="01012345678"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-azhar-green focus:ring-1 focus:ring-azhar-green outline-none text-slate-800 text-sm font-mono transition-all bg-slate-50/30 text-left"
                  dir="ltr"
                  id="student-guardian-phone"
                />
              </div>
            </div>
          </div>

          {/* القسم الرابع: ملاحظات إضافية */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">ملاحظات أو توصيات طبية/خاصة بالطالب</label>
            <textarea
              placeholder="اكتب أي ملاحظات إضافية هنا (أمراض، تفوق دراسي، مشارك بمسابقات القرآن الكريم، إلخ)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-azhar-green focus:ring-1 focus:ring-azhar-green outline-none text-slate-800 text-sm transition-all bg-slate-50/30 resize-none"
              id="student-notes"
            />
          </div>

        </form>

        {/* الفوتر وأزرار الحفظ */}
        <div className="bg-slate-50 px-6 py-4 rounded-b-2xl border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-semibold transition-all"
            id="cancel-student-form"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="bg-azhar-green hover:bg-azhar-green-hover text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            id="save-student-btn"
          >
            <Save className="h-4 w-4" />
            حفظ بيانات الطالب
          </button>
        </div>

      </div>
    </div>
  );
}
