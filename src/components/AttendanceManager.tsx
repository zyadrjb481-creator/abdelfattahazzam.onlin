/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, AcademicStage, GradeLevel, AttendanceRecord, ARABIC_LABELS, AdminUser } from '../types';
import { fetchAttendanceFromDB, saveAttendanceBatchToDB } from '../firebase';
import { Calendar, Users, Check, X, ShieldAlert, ArrowRight, Save, HelpCircle } from 'lucide-react';

interface AttendanceManagerProps {
  students: Student[];
  onClose: () => void;
  loggedInAdmin?: AdminUser | null;
}

export default function AttendanceManager({ students, onClose, loggedInAdmin }: AttendanceManagerProps) {
  // التحقق من وجود صف دراسي محدد لمسؤول الحضور والغياب
  const restrictedGrade = loggedInAdmin?.role === 'attendance_officer' && loggedInAdmin.gradeRestriction && loggedInAdmin.gradeRestriction !== 'all'
    ? loggedInAdmin.gradeRestriction as GradeLevel
    : null;

  const initialStage = restrictedGrade
    ? (['1_prep', '2_prep', '3_prep'].includes(restrictedGrade) ? 'prep' : 'secondary')
    : 'prep';

  // تصفية الطلاب النشطين للحضور والغياب
  const [selectedStage, setSelectedStage] = useState<AcademicStage>(initialStage);
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(restrictedGrade || '1_prep');
  const [selectedClassRoom, setSelectedClassRoom] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [attendanceRecords, setAttendanceRecords] = useState<{ [studentId: string]: 'present' | 'absent' | 'excused' | undefined }>({});
  const [notes, setNotes] = useState<{ [studentId: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);

  // تحديث الصفوف تلقائياً بناءً على المرحلة الدراسية المختارة
  useEffect(() => {
    if (restrictedGrade) return; // لا تقم بتغيير الصف تلقائياً إذا كان هناك صف محدد للمسؤول
    if (selectedStage === 'prep') {
      setSelectedGrade('1_prep');
    } else {
      setSelectedGrade('1_secondary');
    }
  }, [selectedStage, restrictedGrade]);

  // تصفية الفصول المتاحة لتسهيل الاختيار على المدرسين
  const availableClassRooms = Array.from(
    new Set(
      students
        .filter(s => s.grade === selectedGrade)
        .map(s => s.classRoom)
    )
  ).sort();

  // تعيين الفصل الأول تلقائياً عند تغيير الصف لسهولة العمل
  useEffect(() => {
    if (availableClassRooms.length > 0) {
      setSelectedClassRoom(availableClassRooms[0]);
    } else {
      setSelectedClassRoom('');
    }
  }, [selectedGrade, students]);

  // جلب سجلات الغياب السابقة للتاريخ والصف المحددين
  useEffect(() => {
    async function loadExistingAttendance() {
      if (!selectedDate || !selectedGrade) return;
      setIsLoading(true);
      try {
        const records = await fetchAttendanceFromDB(selectedDate);
        const recordsMap: { [studentId: string]: 'present' | 'absent' | 'excused' } = {};
        const notesMap: { [studentId: string]: string } = {};
        
        records.forEach(r => {
          recordsMap[r.studentId] = r.status;
          if (r.notes) notesMap[r.studentId] = r.notes;
        });

        setAttendanceRecords(recordsMap);
        setNotes(notesMap);
      } catch (err) {
        console.error("Error fetching existing attendance:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadExistingAttendance();
  }, [selectedDate, selectedGrade]);

  // الطلاب الخاضعون للفلترة الحالية
  const activeStudents = students.filter(s => s.grade === selectedGrade);

  // ضبط حضور جميع الطلاب الحاليين دفعة واحدة
  const handleBulkAction = (status: 'present' | 'absent') => {
    const updatedRecords = { ...attendanceRecords };
    activeStudents.forEach(s => {
      updatedRecords[s.id!] = status;
    });
    setAttendanceRecords(updatedRecords);
  };

  // تغيير حالة طالب معين
  const handleSingleStatusChange = (studentId: string, status: 'present' | 'absent' | 'excused') => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  // تعديل ملاحظة غياب طالب
  const handleNoteChange = (studentId: string, noteText: string) => {
    setNotes(prev => ({
      ...prev,
      [studentId]: noteText
    }));
  };

  // حفظ الغياب والحضور في الداتابيز
  const handleSaveAttendance = async () => {
    setIsLoading(true);
    setIsSavedSuccessfully(false);
    try {
      // إعداد سجلات الغياب لحفظها
      const recordsToSave: AttendanceRecord[] = activeStudents.map(student => {
        const status = attendanceRecords[student.id!] || 'present'; // القيمة الافتراضية حاضر
        return {
          studentId: student.id!,
          studentName: student.name,
          grade: student.grade,
          classRoom: student.classRoom,
          date: selectedDate,
          status,
          notes: status !== 'present' ? notes[student.id!] || '' : '',
          updatedAt: Date.now()
        };
      });

      await saveAttendanceBatchToDB(recordsToSave);
      setIsSavedSuccessfully(true);
      setTimeout(() => setIsSavedSuccessfully(false), 3000); // إخفاء إشعار النجاح بعد 3 ثواني
    } catch (err) {
      console.error("Failed to save attendance:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* هيدر الصفحة والعودة */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          {!restrictedGrade && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition-all border border-slate-100 text-slate-500 cursor-pointer"
              title="رجوع لسجل الطلاب"
              id="back-to-students-btn"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-850 font-sans">دفتر حضور وغياب المعهد الأزهري</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              رصد الحضور اليومي بالفصول وحفظ الغيابات الشرعية وتوثيقها
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs bg-emerald-50/60 text-azhar font-bold px-3 py-1.5 rounded-lg border border-emerald-100/50 flex items-center gap-1.5">
            <Calendar className="h-4 w-4" /> {selectedDate}
          </span>
        </div>
      </div>

      {/* تنبيه بالحساب المقيد لمسؤول الحضور */}
      {restrictedGrade && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3 shadow-xs font-sans">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-azhar-green flex items-center justify-center text-sm font-bold shrink-0">
            🕌
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-900">حساب مخصص لرصد الحضور والغياب</h4>
            <p className="text-[10px] text-emerald-700 mt-0.5">
              تم حصر صلاحيات حسابك بواسطة الإدارة العامة لرصد غياب وحضور طلاب ({ARABIC_LABELS.grades[restrictedGrade]}) فقط. لا يمكن تغيير الصف أو الانتقال لأي صفحات أخرى.
            </p>
          </div>
        </div>
      )}

      {/* لوحة التحكم والفلترة لتسجيل الغياب */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* اختيار المرحلة */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">المرحلة الدراسية</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedStage('prep')}
                disabled={!!restrictedGrade}
                className={`py-2 rounded-xl border text-xs font-medium transition-all ${selectedStage === 'prep' ? 'bg-azhar-green border-azhar-green text-white shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'} ${restrictedGrade ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                id="attendance-stage-prep"
              >
                الإعدادي
              </button>
              <button
                type="button"
                onClick={() => setSelectedStage('secondary')}
                disabled={!!restrictedGrade}
                className={`py-2 rounded-xl border text-xs font-medium transition-all ${selectedStage === 'secondary' ? 'bg-azhar-green border-azhar-green text-white shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'} ${restrictedGrade ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                id="attendance-stage-secondary"
              >
                الثانوي
              </button>
            </div>
          </div>

          {/* اختيار الصف */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">الصف الدراسي</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value as GradeLevel)}
              disabled={!!restrictedGrade}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-azhar-green focus:ring-1 focus:ring-azhar-green outline-none text-slate-700 text-xs transition-all bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              id="attendance-grade"
            >
              {selectedStage === 'prep' ? (
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

          {/* اختيار التاريخ */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">التاريخ</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-azhar-green focus:ring-1 focus:ring-azhar-green outline-none text-slate-700 text-xs transition-all bg-slate-50/50"
              id="attendance-date"
            />
          </div>
        </div>
      </div>

      {/* جدول الحضور والغياب للطلاب الخاضعين للتصفية */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* الترويسة الفرعية والإجراءات السريعة */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-azhar" />
            <span className="font-bold text-slate-700 text-sm font-sans">
              قائمة طلاب فصل ({selectedClassRoom || '-'}) : {activeStudents.length} طلاب
            </span>
          </div>

          {activeStudents.length > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500 ml-1">إجراءات جماعية:</span>
              <button
                onClick={() => handleBulkAction('present')}
                className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100/50 border border-emerald-200/60 rounded-lg transition-all"
                id="bulk-present-btn"
              >
                حضور الجميع
              </button>
              <button
                onClick={() => handleBulkAction('absent')}
                className="px-3 py-1.5 text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all"
                id="bulk-absent-btn"
              >
                غياب الجميع
              </button>
            </div>
          )}
        </div>

        {/* جسم السجل */}
        {isLoading ? (
          <div className="p-20 text-center text-slate-500 space-y-2">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-azhar-green border-t-transparent rounded-full mb-2"></div>
            <p className="text-sm font-semibold">يرجى الانتظار، جاري تحميل سجل الحضور...</p>
          </div>
        ) : activeStudents.length > 0 ? (
          <div>
            <div className="divide-y divide-slate-100">
              {activeStudents.map((student, idx) => {
                const currentStatus = attendanceRecords[student.id!] || 'present';
                return (
                  <div key={student.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50 transition-all">
                    
                    {/* معلومات الطالب */}
                    <div className="flex items-center gap-3.5 min-w-[280px]">
                      <span className="text-xs font-bold text-slate-400 font-mono w-6 text-center">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{student.name}</h4>
                        <p className="text-slate-450 text-xs mt-0.5">
                          المذهب: {ARABIC_LABELS.madhhabs[student.madhhab]} | ولي الأمر: {student.guardianName}
                        </p>
                      </div>
                    </div>

                    {/* أزرار الحضور والغياب */}
                    <div className="flex items-center gap-2">
                      {/* حاضر */}
                      <button
                        onClick={() => handleSingleStatusChange(student.id!, 'present')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                          currentStatus === 'present'
                            ? 'bg-azhar-green border-azhar-green text-white shadow-sm ring-1 ring-azhar-green'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                        id={`present-btn-${student.id}`}
                      >
                        <Check className="h-4 w-4" />
                        حاضر
                      </button>

                      {/* غائب */}
                      <button
                        onClick={() => handleSingleStatusChange(student.id!, 'absent')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                          currentStatus === 'absent'
                            ? 'bg-rose-600 border-rose-600 text-white shadow-sm ring-1 ring-rose-500'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                        id={`absent-btn-${student.id}`}
                      >
                        <X className="h-4 w-4" />
                        غائب
                      </button>

                      {/* غائب بعذر */}
                      <button
                        onClick={() => handleSingleStatusChange(student.id!, 'excused')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                          currentStatus === 'excused'
                            ? 'bg-amber-500 border-amber-500 text-white shadow-sm ring-1 ring-amber-400'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                        id={`excused-btn-${student.id}`}
                      >
                        <HelpCircle className="h-4 w-4" />
                        بعذر
                      </button>
                    </div>

                    {/* سبب الغياب (يظهر فقط إذا كان غائباً أو بعذر) */}
                    {currentStatus !== 'present' && (
                      <div className="w-full md:w-64">
                        <input
                          type="text"
                          placeholder="اكتب سبب الغياب هنا..."
                          value={notes[student.id!] || ''}
                          onChange={(e) => handleNoteChange(student.id!, e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-azhar-green outline-none bg-slate-50 text-slate-800"
                          id={`attendance-note-input-${student.id}`}
                        />
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

            {/* فوتر الحفظ */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2.5 text-xs text-slate-550 font-medium">
                <ShieldAlert className="h-4 w-4 text-azhar shrink-0" />
                <span>يرجى مراجعة الجدول جيداً ومطابقته بالواقع قبل النقر على حفظ التعديلات.</span>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {isSavedSuccessfully && (
                  <span className="text-xs text-emerald-700 font-bold ml-2 animate-pulse bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                    ✓ تم حفظ كشف الحضور والغياب بنجاح!
                  </span>
                )}
                
                <button
                  onClick={handleSaveAttendance}
                  className="w-full sm:w-auto bg-azhar-green hover:bg-azhar-green-hover text-white px-7 py-3 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  id="save-attendance-btn"
                >
                  <Save className="h-4.5 w-4.5" />
                  حفظ سجل الحضور والغياب
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-16 text-center">
            <div className="h-14 w-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-4 border border-slate-100">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-slate-800 font-bold text-lg font-sans">لا يوجد طلاب مسجلين</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
              الصف الدراسي والمجموعات الفلترية لا تحتوي على طلاب حالياً في المعهد. قم بإضافة طلاب لتبدأ في تسجيل الحضور.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
