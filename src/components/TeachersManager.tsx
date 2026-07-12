/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Camera, 
  Image as ImageIcon, 
  Save, 
  X, 
  User, 
  GraduationCap, 
  Upload, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { Teacher } from '../types';
import { fetchTeachersFromDB, saveTeacherToDB, deleteTeacherFromDB } from '../firebase';

const GRADIENT_PRESETS = [
  { name: 'emerald', class: 'from-emerald-600 to-teal-700', label: 'أخضر أزهري' },
  { name: 'amber', class: 'from-amber-500 to-orange-600', label: 'برتقالي دافئ' },
  { name: 'blue', class: 'from-blue-500 to-indigo-600', label: 'أزرق سماوي' },
  { name: 'rose', class: 'from-rose-500 to-red-600', label: 'وردي زاهي' },
  { name: 'cyan', class: 'from-cyan-500 to-sky-600', label: 'رقمي حديث' },
  { name: 'purple', class: 'from-purple-500 to-fuchsia-600', label: 'بنفسجي ملكي' },
  { name: 'slate', class: 'from-slate-600 to-slate-800', label: 'رمادي وقور' }
];

export default function TeachersManager() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // حالة المعلم الجاري إضافته أو تعديله
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [bio, setBio] = useState('');
  const [avatarColor, setAvatarColor] = useState('from-emerald-600 to-teal-700');
  const [initials, setInitials] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  // تحميل المعلمين عند بدء التشغيل
  const loadTeachers = async () => {
    setIsLoading(true);
    try {
      const data = await fetchTeachersFromDB();
      setTeachers(data);
    } catch (error) {
      console.error("Error loading teachers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  // توليد الأحرف الأولى تلقائياً عند تغيير الاسم
  useEffect(() => {
    if (name.trim()) {
      const parts = name.trim().split(/\s+/).filter(Boolean);
      let letters = '';
      if (parts.length >= 2) {
        letters = `${parts[0][0]} ${parts[1][0]}`;
      } else if (parts.length === 1) {
        letters = parts[0].substring(0, 2);
      }
      setInitials(letters);
    } else {
      setInitials('');
    }
  }, [name]);

  // معالجة ملف الصورة المرفوع وتحويله إلى Base64
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) { // حد 800 كيلوبايت لسلامة التخزين
        setErrorMsg('حجم الصورة كبير جداً! يرجى اختيار صورة أقل من 800 كيلوبايت لضمان كفاءة العرض.');
        return;
      }
      setErrorMsg('');
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // فتح النموذج للإضافة
  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setRole('');
    setSpecialty('');
    setBio('');
    setAvatarColor('from-emerald-600 to-teal-700');
    setInitials('');
    setPhotoUrl('');
    setImageFile(null);
    setErrorMsg('');
    setIsFormOpen(true);
  };

  // فتح النموذج للتعديل
  const handleOpenEdit = (teacher: Teacher) => {
    setEditingId(teacher.id || null);
    setName(teacher.name);
    setRole(teacher.role);
    setSpecialty(teacher.specialty);
    setBio(teacher.bio);
    setAvatarColor(teacher.avatarColor || 'from-emerald-600 to-teal-700');
    setInitials(teacher.initials || '');
    setPhotoUrl(teacher.photoUrl || '');
    setImageFile(null);
    setErrorMsg('');
    setIsFormOpen(true);
  };

  // حفظ المعلم (إضافة أو تعديل)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim() || !specialty.trim() || !bio.trim()) {
      setErrorMsg('يرجى ملء جميع الحقول الإلزامية!');
      return;
    }

    setIsLoading(true);
    try {
      const teacherPayload: Teacher = {
        id: editingId || undefined,
        name: name.trim(),
        role: role.trim(),
        specialty: specialty.trim(),
        bio: bio.trim(),
        avatarColor,
        initials: initials.trim() || 'معلم',
        photoUrl: photoUrl.trim() || undefined,
        createdAt: editingId 
          ? (teachers.find(t => t.id === editingId)?.createdAt || Date.now()) 
          : Date.now()
      };

      await saveTeacherToDB(teacherPayload);
      await loadTeachers();
      setIsFormOpen(false);
    } catch (error) {
      console.error("Failed to save teacher:", error);
      setErrorMsg('حدث خطأ أثناء حفظ بيانات المعلم، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  // حذف معلم
  const handleDelete = async (teacherId: string, teacherName: string) => {
    if (window.confirm(`هل أنت متأكد من حذف المعلم "${teacherName}" نهائياً من هيئة التدريس؟`)) {
      setIsLoading(true);
      try {
        await deleteTeacherFromDB(teacherId);
        await loadTeachers();
      } catch (error) {
        console.error("Failed to delete teacher:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6 font-sans text-right" dir="rtl">
      
      {/* الترويسة العلوية */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-850 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-emerald-600" />
            <span>إدارة الهيئة التدريسية وإدارة المعهد</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold">
            أضف المعلمين، عدل تخصصاتهم وصورهم، ورتب ظهورهم في الصفحة الرئيسية للمعهد بشكل مباشر.
          </p>
        </div>
        
        <button
          onClick={handleOpenAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>إضافة معلم جديد</span>
        </button>
      </div>

      {/* مؤشر التحميل */}
      {isLoading && teachers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full"></div>
          <p className="text-xs text-slate-500 font-bold">جاري تحميل بيانات الكادر التعليمي...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map((teacher) => (
            <div 
              key={teacher.id} 
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full group"
            >
              <div>
                {/* الجزء العلوي (الصورة الشخصية والاسم) */}
                <div className="flex items-start gap-4">
                  {teacher.photoUrl ? (
                    <img 
                      src={teacher.photoUrl} 
                      alt={teacher.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-slate-150 shadow-sm"
                    />
                  ) : (
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${teacher.avatarColor || 'from-emerald-600 to-teal-700'} text-white font-black text-base flex items-center justify-center shrink-0 shadow-sm`}>
                      <span>{teacher.initials || 'معلم'}</span>
                    </div>
                  )}

                  <div className="space-y-1 min-w-0 flex-1">
                    <h3 className="text-sm font-black text-slate-850 truncate">{teacher.name}</h3>
                    <span className="inline-block text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full border border-emerald-100/50">
                      {teacher.role}
                    </span>
                    <p className="text-xs text-slate-500 font-bold">{teacher.specialty}</p>
                  </div>
                </div>

                {/* النبذة التعريفية */}
                <p className="text-xs text-slate-600 font-semibold leading-relaxed mt-4 border-t border-slate-100 pt-3 line-clamp-3">
                  {teacher.bio}
                </p>
              </div>

              {/* أزرار التحكم والعمليات */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                <span className="text-[10px] text-slate-400 font-bold">
                  مضاف في {new Date(teacher.createdAt).toLocaleDateString('ar-EG')}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(teacher)}
                    className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                    title="تعديل بيانات المعلم"
                  >
                    <Edit className="h-4.5 w-4.5" />
                  </button>

                  <button
                    onClick={() => teacher.id && handleDelete(teacher.id, teacher.name)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="حذف المعلم نهائياً"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {teachers.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full text-slate-500 text-xl">
                👨‍🏫
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">قائمة هيئة التدريس فارغة</h3>
                <p className="text-xs text-slate-500 font-semibold">لم يتم إضافة أي معلم بعد. اضغط على الزر بالأعلى لإضافة أول معلم.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* مودال الإضافة والتعديل */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[110] p-4 text-right">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-scale-up">
            
            {/* الهيدر للمودال */}
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-emerald-400" />
                  <span>{editingId ? 'تعديل بيانات المعلم' : 'إضافة معلم جديد للمعهد'}</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">أدخل البيانات والصورة لعرضها في الصفحة الرئيسية للبوابة</p>
              </div>

              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* محتوى الاستمارة */}
            <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[calc(100vh-10rem)] overflow-y-auto">
              
              {errorMsg && (
                <div className="p-3 bg-rose-50 border-r-4 border-rose-500 text-rose-800 text-xs font-bold rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* الاسم بالكامل */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700">اسم المعلم بالكامل <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: الأستاذ / محمود أحمد علي"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none text-xs font-bold bg-slate-50/50"
                  required
                />
              </div>

              {/* المسمى والوظيفة + التخصص */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-700">المسمى الوظيفي <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="مثال: شيخ المعهد، معلم أول، أخصائي"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none text-xs font-bold bg-slate-50/50"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-700">التخصص الدراسي <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="مثال: الفقه الحنفي، اللغة العربية"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none text-xs font-bold bg-slate-50/50"
                    required
                  />
                </div>
              </div>

              {/* النبذة التعريفية */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700">نبذة تعريفية ومسيرة العطاء <span className="text-rose-500">*</span></label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="اكتب نبذة قصيرة عن خبراته والصفوف التي يدرسها والمهام الإدارية بالمعهد..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none text-xs font-bold bg-slate-50/50 resize-none leading-relaxed"
                  required
                ></textarea>
              </div>

              {/* اختيار صورة المعلم */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="block text-xs font-extrabold text-slate-700">صورة المعلم الشخصية</label>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  {/* عرض مسبق */}
                  <div className="shrink-0">
                    {photoUrl ? (
                      <div className="relative group">
                        <img 
                          src={photoUrl} 
                          alt="Preivew" 
                          referrerPolicy="no-referrer"
                          className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => { setPhotoUrl(''); setImageFile(null); }}
                          className="absolute -top-1.5 -left-1.5 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md transition-colors cursor-pointer"
                          title="حذف الصورة"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${avatarColor} text-white font-black text-lg flex items-center justify-center shadow-md`}>
                        <span>{initials || 'م'}</span>
                      </div>
                    )}
                  </div>

                  {/* خيارات الإدخال والرفع */}
                  <div className="flex-1 space-y-3 w-full">
                    {/* خيار الرفع من الجهاز */}
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden" 
                        id="teacher-file-uploader"
                      />
                      <label 
                        htmlFor="teacher-file-uploader"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all cursor-pointer"
                      >
                        <Upload className="h-4 w-4 text-emerald-600" />
                        <span>تحميل صورة حقيقية من جهازك</span>
                      </label>
                    </div>

                    <div className="relative flex items-center">
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                      <input
                        type="url"
                        value={photoUrl.startsWith('data:') ? '' : photoUrl}
                        onChange={(e) => setPhotoUrl(e.target.value)}
                        placeholder="أو الصق رابط صورة خارجي مباشر هنا..."
                        className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none text-[11px] font-semibold bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* تدرج الألوان الخلفية الاحتياطي */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="block text-xs font-extrabold text-slate-700">تنسيق الخلفية الاحتياطية (في حال عدم وجود صورة)</label>
                <div className="flex flex-wrap gap-2.5">
                  {GRADIENT_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setAvatarColor(preset.class)}
                      className={`h-9 px-3 rounded-xl text-[10px] font-bold text-white bg-gradient-to-br ${preset.class} transition-all border-2 ${
                        avatarColor === preset.class ? 'border-yellow-400 scale-105 shadow-md' : 'border-transparent opacity-80 hover:opacity-100'
                      } cursor-pointer`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* أزرار الإجراءات */}
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="h-4.5 w-4.5" />
                  <span>حفظ وإضافة المعلم</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
