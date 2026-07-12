/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AdminUser, AdminRole, ROLE_LABELS, ARABIC_LABELS, GradeLevel, AL_AZHAR_SUBJECTS } from '../types';
import { fetchAdminsFromDB, saveAdminToDB, deleteAdminFromDB } from '../firebase';
import { 
  UserCheck, 
  Plus, 
  Trash2, 
  Shield, 
  Clock, 
  RefreshCw, 
  Key, 
  AlertTriangle, 
  Lock, 
  Edit3, 
  Layers,
  GraduationCap
} from 'lucide-react';

export default function AdminManager() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // حقول الفورم
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AdminRole>('principal');
  const [gradeRestriction, setGradeRestriction] = useState<GradeLevel | 'all'>('all');
  const [subjectRestriction, setSubjectRestriction] = useState('quran');
  const [formError, setFormError] = useState('');

  // تحميل المشرفين والمدراء
  const loadAdmins = async () => {
    setIsLoading(true);
    try {
      const list = await fetchAdminsFromDB();
      setAdmins(list);
    } catch (error) {
      console.error("Error loading admins:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  // فتح المودال لإضافة مستخدم جديد
  const handleOpenAddModal = () => {
    setEditingId(null);
    setName('');
    setUsername('');
    setPassword('');
    setRole('principal');
    setGradeRestriction('all');
    setSubjectRestriction('quran');
    setFormError('');
    setIsFormOpen(true);
  };

  // فتح المودال لتعديل مستخدم
  const handleOpenEditModal = (admin: AdminUser) => {
    setEditingId(admin.id || null);
    setName(admin.name);
    setUsername(admin.username);
    setPassword(admin.password);
    setRole(admin.role);
    setGradeRestriction(admin.gradeRestriction || 'all');
    setSubjectRestriction(admin.subjectRestriction || 'quran');
    setFormError('');
    setIsFormOpen(true);
  };

  // حفظ التغييرات
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !username.trim() || !password.trim()) {
      setFormError('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    if (username.trim().toLowerCase() === 'hassan') {
      setFormError('لا يمكن استخدام اسم المستخدم "hassan" لأنه الحساب الرئيسي المالك للنظام.');
      return;
    }

    // التحقق من تكرار اسم المستخدم لحساب آخر
    const isDuplicate = admins.some(
      a => a.username.toLowerCase() === username.trim().toLowerCase() && a.id !== editingId
    );
    if (isDuplicate) {
      setFormError('اسم المستخدم هذا مستخدم بالفعل لحساب مشرف آخر، يرجى اختيار اسم مستخدم فريد.');
      return;
    }

    setIsLoading(true);
    try {
      const newAdmin: AdminUser = {
        id: editingId || undefined,
        name: name.trim(),
        username: username.trim().toLowerCase(),
        password: password.trim(),
        role,
        gradeRestriction: (role === 'attendance_officer' || role === 'teacher') ? gradeRestriction : 'all',
        subjectRestriction: role === 'teacher' ? subjectRestriction : 'all',
        createdAt: editingId ? (admins.find(a => a.id === editingId)?.createdAt || Date.now()) : Date.now()
      };

      await saveAdminToDB(newAdmin);
      await loadAdmins();
      setIsFormOpen(false);
    } catch (err) {
      console.error(err);
      setFormError('حدث خطأ أثناء حفظ التغييرات، يرجى المحاولة مجدداً.');
    } finally {
      setIsLoading(false);
    }
  };

  // حذف مشرف
  const handleDeleteAdmin = async (id: string, adminName: string) => {
    if (!window.confirm(`هل أنت متأكد تماماً من حذف حساب المشرف (${adminName}) نهائياً وسحب صلاحياته؟`)) return;
    setIsLoading(true);
    try {
      await deleteAdminFromDB(id);
      await loadAdmins();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // تنسيق تاريخ الإنشاء
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* الهيدر */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-850 flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            <span>إدارة حسابات المسؤولين والصلاحيات (RBAC)</span>
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            بصفتك المالك (سوبر أدمن)، يمكنك إضافة مدراء وتخصيص صلاحيات محددة لهم بصفوف معينة.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadAdmins}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 disabled:bg-slate-100 disabled:text-slate-400 rounded-xl text-xs font-bold transition-all border border-slate-150 shadow-xs"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث القائمة</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة مشرف جديد</span>
          </button>
        </div>
      </div>

      {/* تحذير أمني توضيحي */}
      <div className="bg-emerald-50/50 border border-emerald-600/10 p-4 rounded-2xl flex items-start gap-3.5 shadow-xs">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-lg">
          💡
        </div>
        <div>
          <h4 className="text-xs font-black text-emerald-900 leading-normal">
            حول مستويات الصلاحيات المتاحة في معهد عبد الفتاح عزام بنين:
          </h4>
          <p className="text-[10px] text-emerald-850 font-medium leading-relaxed mt-1">
            • <b>مدير المعهد (Principal)</b>: صلاحيات مطلقة لعرض وتعديل الطلاب والدرجات والغياب والمعلمين والاستفسارات، ولكن لا يستطيع الدخول لصفحة إدارة الحسابات الحالية أو إنشاء مستخدمين.<br />
            • <b>أدمن الغياب (Attendance Officer)</b>: مخصص لإدارة الحضور والغياب <b>فقط لصف دراسي معين</b> (مثال: الصف الأول الثانوي)، وسيتم حجب رؤية أو تعديل أي صف آخر أو ميزات الدرجات والطلاب والمعلمين عنه لحماية الخصوصية.
          </p>
        </div>
      </div>

      {/* جدول الحسابات */}
      {isLoading && admins.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center justify-center text-slate-400 space-y-3">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-emerald-700 border-t-transparent rounded-full mb-1"></div>
          <p className="text-xs font-black">جاري جلب حسابات المسؤولين من السيرفر...</p>
        </div>
      ) : admins.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/75 text-slate-500 text-xs font-black border-b border-slate-100">
                  <th className="px-6 py-4">الاسم بالكامل</th>
                  <th className="px-6 py-4">اسم المستخدم (Login)</th>
                  <th className="px-6 py-4">كلمة المرور</th>
                  <th className="px-6 py-4">الدور والمستوى</th>
                  <th className="px-6 py-4">نطاق الصف المخصص</th>
                  <th className="px-6 py-4">تاريخ الإنشاء</th>
                  <th className="px-6 py-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-bold">
                {admins.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-900 font-black flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                        {item.name.slice(0, 2)}
                      </div>
                      <span>{item.name}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">{item.username}</td>
                    <td className="px-6 py-4 font-mono text-slate-500 bg-slate-50/40">{item.password}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                        item.role === 'principal' 
                          ? 'bg-blue-50 text-blue-700 border-blue-100' 
                          : item.role === 'teacher'
                          ? 'bg-purple-50 text-purple-700 border-purple-100'
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        <Shield className="h-3 w-3" />
                        {ROLE_LABELS[item.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.role === 'attendance_officer' ? (
                        <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-1 rounded-lg text-[10px]">
                          {item.gradeRestriction && item.gradeRestriction !== 'all' 
                            ? ARABIC_LABELS.grades[item.gradeRestriction] 
                            : 'جميع الصفوف (غياب فقط)'}
                        </span>
                      ) : item.role === 'teacher' ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-purple-800 font-semibold bg-purple-50 px-2 py-1 rounded-lg text-[10px] w-fit">
                            {item.gradeRestriction && item.gradeRestriction !== 'all' 
                              ? ARABIC_LABELS.grades[item.gradeRestriction] 
                              : 'جميع الصفوف'}
                          </span>
                          <span className="text-emerald-800 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-lg text-[10px] w-fit">
                            مادة: {AL_AZHAR_SUBJECTS.find(sub => sub.id === item.subjectRestriction)?.name || item.subjectRestriction || 'الكل'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-lg text-[10px]">
                          شامل كامل صلاحيات المعهد
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-semibold flex items-center gap-1 mt-2.5">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(item.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          title="تعديل صلاحيات الحساب"
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-all cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAdmin(item.id!, item.name)}
                          title="سحب الصلاحيات وحذف الحساب"
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-16 rounded-2xl border border-slate-100 shadow-xs text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center mb-1 text-2xl">
            🔐
          </div>
          <h3 className="text-sm font-black text-slate-700">لا توجد حسابات مشرفين فرعيين مضافة حالياً</h3>
          <p className="text-[11px] text-slate-400 font-semibold max-w-sm leading-relaxed">
            يمكنك الضغط على زر "إضافة مشرف جديد" لإنشاء مدراء مساعدين أو مسؤولين لقسم الحضور والغياب.
          </p>
        </div>
      )}

      {/* مودال الإضافة والتعديل */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden text-right" dir="rtl">
            
            {/* عنوان المودال */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-850 flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-emerald-600" />
                <span>{editingId ? 'تعديل صلاحيات حساب مسؤول' : 'إضافة حساب مسؤول / أدمن جديد'}</span>
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="w-7 h-7 text-xs font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full flex items-center justify-center transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* محتوى الفورم */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-[10px] font-bold text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* الاسم بالكامل */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-bold block">الاسم بالكامل (ثلاثي أو رباعي): *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أ. محمود السعيد عبد الحليم"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none text-xs font-semibold bg-slate-50/50 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* اسم المستخدم */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-bold block">اسم المستخدم للدخول (Login): *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="مثال: mahmoud_admin"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none text-xs font-semibold bg-slate-50/50 transition-all font-mono text-left"
                    dir="ltr"
                  />
                </div>

                {/* كلمة المرور */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-bold block">كلمة المرور: *</label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="مثال: pass_12345"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none text-xs font-semibold bg-slate-50/50 transition-all font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* الصلاحية / الدور */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-bold block">تخصيص الصلاحية والمستوى: *</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  
                  {/* مدير معهد */}
                  <div 
                    onClick={() => setRole('principal')}
                    className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      role === 'principal' 
                        ? 'border-emerald-600 bg-emerald-50/20' 
                        : 'border-slate-150 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Lock className={`h-3.5 w-3.5 ${role === 'principal' ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="text-[11px] font-black text-slate-800">مدير معهد</span>
                      </div>
                      <p className="text-[8px] text-slate-400 font-semibold mt-1 leading-normal">
                        صلاحيات مطلقة عدا الحسابات.
                      </p>
                    </div>
                  </div>

                  {/* مسؤول غياب بصف معين */}
                  <div 
                    onClick={() => { setRole('attendance_officer'); setGradeRestriction('1_secondary'); }}
                    className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      role === 'attendance_officer' 
                        ? 'border-emerald-600 bg-emerald-50/20' 
                        : 'border-slate-150 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Layers className={`h-3.5 w-3.5 ${role === 'attendance_officer' ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="text-[11px] font-black text-slate-800">مسؤول غياب</span>
                      </div>
                      <p className="text-[8px] text-slate-400 font-semibold mt-1 leading-normal">
                        غياب وحضور صف معين فقط.
                      </p>
                    </div>
                  </div>

                  {/* معلم / أستاذ مواد */}
                  <div 
                    onClick={() => { setRole('teacher'); setGradeRestriction('1_secondary'); }}
                    className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      role === 'teacher' 
                        ? 'border-emerald-600 bg-emerald-50/20' 
                        : 'border-slate-150 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className={`h-4 w-4 ${role === 'teacher' ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="text-[11px] font-black text-slate-800">معلم / أستاذ</span>
                      </div>
                      <p className="text-[8px] text-slate-400 font-semibold mt-1 leading-normal">
                        رصد درجات صف معين ومواده فقط.
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* تخصيص صف معين (يظهر فقط إذا اختار مسؤول حضور وغياب أو معلم) */}
              {(role === 'attendance_officer' || role === 'teacher') && (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2 animate-fade-in">
                  <label className="text-[11px] text-amber-900 font-black block">
                    حدد الصف الدراسي المخصص لهذا {role === 'teacher' ? 'المعلم' : 'المسؤول'}: *
                  </label>
                  <select
                    value={gradeRestriction}
                    onChange={(e) => setGradeRestriction(e.target.value as GradeLevel | 'all')}
                    className="w-full px-3 py-1.5 rounded-lg border border-amber-300 focus:border-amber-600 outline-none text-xs font-bold bg-white"
                  >
                    {Object.entries(ARABIC_LABELS.grades).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                    <option value="all">جميع الصفوف</option>
                  </select>
                  <p className="text-[9px] text-amber-700/80 font-bold leading-normal">
                    بموجب هذا الخيار، سيتم تحديد صلاحيات هذا الحساب لرؤية والتعامل مع طلاب الصف المختار فقط.
                  </p>
                </div>
              )}

              {/* تخصيص المادة (يظهر فقط إذا اختار معلم) */}
              {role === 'teacher' && (
                <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 space-y-2 animate-fade-in">
                  <label className="text-[11px] text-purple-900 font-black block">
                    حدد المادة المخصصة لرصد درجاتها من قبل هذا المعلم: *
                  </label>
                  <select
                    value={subjectRestriction}
                    onChange={(e) => setSubjectRestriction(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-purple-300 focus:border-purple-600 outline-none text-xs font-bold bg-white"
                  >
                    {AL_AZHAR_SUBJECTS.map((subject) => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                    <option value="all">كل المواد المتاحة</option>
                  </select>
                  <p className="text-[9px] text-purple-700/80 font-bold leading-normal">
                    سيتم تفعيل رصد الدرجات لهذا المعلم في المادة المحددة هنا فقط ولن يمكنه تعديل درجات المواد الأخرى.
                  </p>
                </div>
              )}

              {/* أزرار الحفظ والإغلاق */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {isLoading ? (
                    <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                  ) : (
                    <UserCheck className="h-4 w-4" />
                  )}
                  <span>{editingId ? 'تعديل الحساب' : 'إنشاء الحساب وتفعيله'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
