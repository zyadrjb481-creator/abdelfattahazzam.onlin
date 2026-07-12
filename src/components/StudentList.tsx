/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Student, AcademicStage, GradeLevel, Madhhab, ARABIC_LABELS, AdminUser } from '../types';
import { Search, Filter, Eye, Edit2, Trash2, Award, CheckSquare, Plus, GraduationCap, Users } from 'lucide-react';

interface StudentListProps {
  students: Student[];
  onAddStudent: () => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onViewProfile: (student: Student) => void;
  onManageGrades: (student: Student) => void;
  onOpenAttendance: () => void;
  loggedInAdmin?: AdminUser | null;
}

export default function StudentList({
  students,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onViewProfile,
  onManageGrades,
  onOpenAttendance,
  loggedInAdmin
}: StudentListProps) {
  // حالات التصفية والبحث
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<AcademicStage | 'all'>('all');
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | 'all'>('all');
  const [selectedMadhhab, setSelectedMadhhab] = useState<Madhhab | 'all'>('all');

  // تصفية الطلاب ديناميكياً
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.nationalId.includes(searchTerm) ||
      student.guardianPhone.includes(searchTerm) ||
      student.classRoom.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStage = selectedStage === 'all' || student.stage === selectedStage;
    const matchesGrade = selectedGrade === 'all' || student.grade === selectedGrade;
    const matchesMadhhab = selectedMadhhab === 'all' || student.madhhab === selectedMadhhab;

    return matchesSearch && matchesStage && matchesGrade && matchesMadhhab;
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* هيدر الصفحة والتحكم العلوي */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100/50 text-azhar">
            <Users className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-850 font-sans">سجل شؤون طلاب المعهد</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              عرض الطلاب، البحث السريع، الفرز الشامل وتعديل البيانات الأكاديمية
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          {/* زر تسجيل الغياب الجماعي */}
          <button
            onClick={onOpenAttendance}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-xl text-sm font-semibold transition-all border border-slate-200 cursor-pointer"
            id="go-attendance-btn"
          >
            <CheckSquare className="h-4.5 w-4.5" />
            دفتر الحضور والغياب اليومي
          </button>
          
          {/* زر إضافة طالب (يخفى لمسؤولي الغياب) */}
          {(!loggedInAdmin || loggedInAdmin.role !== 'attendance_officer') && (
            <button
              onClick={onAddStudent}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-azhar-green hover:bg-azhar-green-hover text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer"
              id="add-student-btn"
            >
              <Plus className="h-5 w-5" />
              تسجيل طالب جديد
            </button>
          )}
        </div>
      </div>

      {/* لوحة التصفية والبحث */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-azhar font-bold text-sm">
          <Filter className="h-4 w-4" />
          <span>أدوات تصفية وبحث ذكية</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* حقل البحث */}
          <div className="relative">
            <Search className="absolute right-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث بالاسم، الرقم القومي، رقم الهاتف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 focus:border-azhar-green focus:ring-1 focus:ring-azhar-green outline-none text-slate-800 text-xs transition-all bg-slate-50/50"
              id="student-search-input"
            />
          </div>

          {/* فلتر المرحلة */}
          <div>
            <select
              value={selectedStage}
              onChange={(e) => {
                const val = e.target.value as AcademicStage | 'all';
                setSelectedStage(val);
                setSelectedGrade('all'); // إعادة تعيين الصف لعدم حدوث تعارض
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-azhar-green focus:ring-1 focus:ring-azhar-green outline-none text-slate-700 text-xs transition-all bg-slate-50/50"
              id="filter-stage-select"
            >
              <option value="all">كل المراحل الدراسية</option>
              <option value="prep">{ARABIC_LABELS.stages.prep}</option>
              <option value="secondary">{ARABIC_LABELS.stages.secondary}</option>
            </select>
          </div>

          {/* فلتر الصف */}
          <div>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value as GradeLevel | 'all')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-azhar-green focus:ring-1 focus:ring-azhar-green outline-none text-slate-700 text-xs transition-all bg-slate-50/50"
              id="filter-grade-select"
            >
              <option value="all">كل الصفوف الدراسية</option>
              {selectedStage === 'all' || selectedStage === 'prep' ? (
                <>
                  <option value="1_prep">{ARABIC_LABELS.grades['1_prep']}</option>
                  <option value="2_prep">{ARABIC_LABELS.grades['2_prep']}</option>
                  <option value="3_prep">{ARABIC_LABELS.grades['3_prep']}</option>
                </>
              ) : null}
              {selectedStage === 'all' || selectedStage === 'secondary' ? (
                <>
                  <option value="1_secondary">{ARABIC_LABELS.grades['1_secondary']}</option>
                  <option value="2_secondary">{ARABIC_LABELS.grades['2_secondary']}</option>
                </>
              ) : null}
            </select>
          </div>

          {/* فلتر المذهب الفقهي */}
          <div>
            <select
              value={selectedMadhhab}
              onChange={(e) => setSelectedMadhhab(e.target.value as Madhhab | 'all')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-azhar-green focus:ring-1 focus:ring-azhar-green outline-none text-slate-700 text-xs transition-all bg-slate-50/50"
              id="filter-madhhab-select"
            >
              <option value="all">كل المذاهب الفقهية</option>
              <option value="hanafi">{ARABIC_LABELS.madhhabs.hanafi}</option>
              <option value="shafii">{ARABIC_LABELS.madhhabs.shafii}</option>
              <option value="maliki">{ARABIC_LABELS.madhhabs.maliki}</option>
            </select>
          </div>
        </div>
      </div>

      {/* جدول عرض الطلاب */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-100">
                  <th className="p-4">اسم الطالب الأزهري</th>
                  <th className="p-4">المرحلة والصف الدراسي</th>
                  <th className="p-4 text-center">المذهب الفقهي</th>
                  <th className="p-4 text-center">حالة القيد</th>
                  <th className="p-4">رقم ولي الأمر</th>
                  <th className="p-4 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition-all group">
                    {/* الاسم والجنس */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          student.gender === 'male' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {student.name.substring(0, 1)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm group-hover:text-azhar transition-colors">
                            {student.name}
                          </div>
                          <div className="text-slate-450 font-mono text-xs mt-0.5">
                            الرقم القومي: {student.nationalId}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* المرحلة والصف */}
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800 text-xs">
                          {ARABIC_LABELS.grades[student.grade]}
                        </span>
                        <span className="text-slate-450 text-[10px] mt-0.5 flex items-center gap-1">
                          <GraduationCap className="h-3.5 w-3.5 shrink-0 text-azhar" />
                          {ARABIC_LABELS.stages[student.stage]}
                        </span>
                      </div>
                    </td>

                    {/* المذهب الفقهي */}
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold ${
                        student.madhhab === 'hanafi' 
                          ? 'bg-amber-50 text-amber-800 border border-amber-100' 
                          : student.madhhab === 'shafii'
                            ? 'bg-purple-50 text-purple-800 border border-purple-100'
                            : 'bg-indigo-50 text-indigo-800 border border-indigo-100'
                      }`}>
                        {ARABIC_LABELS.madhhabs[student.madhhab]}
                      </span>
                    </td>

                    {/* حالة القيد */}
                    <td className="p-4 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-lg font-medium border ${
                        student.enrollmentStatus === 'new' 
                          ? 'bg-emerald-50/50 border-emerald-100/50 text-azhar' 
                          : 'bg-amber-50/50 border-amber-100 text-amber-800'
                      }`}>
                        {ARABIC_LABELS.enrollmentStatus[student.enrollmentStatus]}
                      </span>
                    </td>

                    {/* هاتف ولي الأمر */}
                    <td className="p-4">
                      <div className="text-slate-700 text-xs font-mono font-medium">
                        {student.guardianPhone}
                      </div>
                      <div className="text-slate-400 text-[10px] mt-0.5">
                        الولي: {student.guardianName}
                      </div>
                    </td>

                    {/* الإجراءات */}
                    <td className="p-4">
                      <div className="flex items-center justify-start gap-1">
                        
                        {/* عرض الملف */}
                        <button
                          onClick={() => onViewProfile(student)}
                          title="عرض الملف التفصيلي والشهادة"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-azhar hover:bg-slate-100 transition-all cursor-pointer"
                          id={`view-profile-${student.id}`}
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </button>

                        {(!loggedInAdmin || loggedInAdmin.role !== 'attendance_officer') && (
                          <>
                            {/* إدارة الدرجات */}
                            <button
                              onClick={() => onManageGrades(student)}
                              title="رصد وإدارة الدرجات والنتائج"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-slate-100 transition-all cursor-pointer"
                              id={`manage-grades-${student.id}`}
                            >
                              <Award className="h-4.5 w-4.5" />
                            </button>

                            {/* تعديل */}
                            <button
                              onClick={() => onEditStudent(student)}
                              title="تعديل بيانات الطالب"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-slate-100 transition-all cursor-pointer"
                              id={`edit-student-${student.id}`}
                            >
                              <Edit2 className="h-4.5 w-4.5" />
                            </button>

                            {/* حذف */}
                            <button
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف الطالب (${student.name}) نهائياً من المعهد؟ سيتم حذف جميع سجلات الدرجات والحضور التابعة له.`)) {
                                  onDeleteStudent(student.id!);
                                }
                              }}
                              title="حذف الطالب من المعهد"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-all cursor-pointer"
                              id={`delete-student-${student.id}`}
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </>
                        )}

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center">
            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-4 border border-slate-100">
              <Search className="h-7 w-7" />
            </div>
            <h3 className="text-slate-800 font-bold text-lg font-sans">لا يوجد طلاب متطابقين</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
              تأكد من كتابة الاسم بشكل صحيح أو جرب تغيير معايير البحث والفرز لتجد طلاباً آخرين.
            </p>
            {students.length === 0 && (
              <button
                onClick={onAddStudent}
                className="mt-5 bg-azhar-green hover:bg-azhar-green-hover text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all inline-flex items-center gap-2"
                id="create-first-student-btn"
              >
                <Plus className="h-4 w-4" />
                سجل أول طالب بالمعهد الآن
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
