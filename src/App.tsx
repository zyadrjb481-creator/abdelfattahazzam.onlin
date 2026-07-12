/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  fetchStudentsFromDB, 
  addStudentToDB, 
  updateStudentInDB, 
  deleteStudentFromDB,
  isForcedLocalMode,
  setForcedLocalMode,
  testFirestoreConnection,
  verifyAdminLoginWithDetails
} from './firebase';
import { Student, AdminUser } from './types';

// استيراد المكونات الفرعية
import Dashboard from './components/Dashboard';
import StudentSearch from './components/StudentSearch';
import StudentList from './components/StudentList';
import StudentForm from './components/StudentForm';
import AttendanceManager from './components/AttendanceManager';
import GradesManager from './components/GradesManager';
import StudentProfile from './components/StudentProfile';
import TeachersManager from './components/TeachersManager';
import InquiriesManager from './components/InquiriesManager';
import AdminManager from './components/AdminManager';
import TeacherManager from './components/TeacherManager';
import AIChatManager from './components/AIChatManager';

// الأيقونات المستخدمة من مكتبة lucide-react
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Award, 
  GraduationCap, 
  Database, 
  Wifi, 
  WifiOff, 
  BookOpen, 
  Sliders,
  Search,
  LogOut,
  MessageSquare,
  Shield,
  Bot,
  Sparkles
} from 'lucide-react';

type ActiveView = 'dashboard' | 'students' | 'attendance' | 'grades' | 'profile' | 'teachers' | 'inquiries' | 'admins' | 'teacher_grades' | 'ai_chat';

export default function App() {
  // حالات تسجيل الدخول للأدمن
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return sessionStorage.getItem('elazhar_admin_logged_in') === 'true';
  });
  const [loggedInAdmin, setLoggedInAdmin] = useState<AdminUser | null>(() => {
    const stored = sessionStorage.getItem('elazhar_admin_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    if (sessionStorage.getItem('elazhar_admin_logged_in') === 'true') {
      return {
        id: 'super_admin_hassan',
        username: 'hassan',
        password: '01126269124',
        name: 'الأستاذ حسن (السوبر أدمن)',
        role: 'super_admin',
        gradeRestriction: 'all',
        createdAt: 1719999999000
      };
    }
    return null;
  });
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // حالات التحكم بالصفحات والمشاهد
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    const stored = sessionStorage.getItem('elazhar_admin_user');
    if (stored) {
      try {
        const admin = JSON.parse(stored);
        if (admin && admin.role === 'attendance_officer') {
          return 'attendance';
        } else if (admin && admin.role === 'teacher') {
          return 'teacher_grades';
        }
      } catch (e) {}
    }
    return 'dashboard';
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [profileBackView, setProfileBackView] = useState<ActiveView>('students');
  
  // التحكم في نموذج إضافة/تعديل طالب
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>(undefined);
  
  // حالة الاتصال بقاعدة بيانات الفاير بيز
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(true);
  const [localModeActive, setLocalModeActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // تصفية الطلاب حسب صلاحية الغياب أو رصد الدرجات للصف الدراسي المحدد
  const getFilteredStudents = () => {
    if (loggedInAdmin && (loggedInAdmin.role === 'attendance_officer' || loggedInAdmin.role === 'teacher') && loggedInAdmin.gradeRestriction && loggedInAdmin.gradeRestriction !== 'all') {
      return students.filter(student => student.grade === loggedInAdmin.gradeRestriction);
    }
    return students;
  };
  const filteredStudents = getFilteredStudents();

  // تحميل البيانات المبدئية والتحقق من حالة الاتصال
  useEffect(() => {
    async function initializeSystem() {
      setIsLoading(true);
      
      // 1. اختبار اتصال Firebase Firestore المباشر
      const isConnected = await testFirestoreConnection();
      setIsFirebaseConnected(isConnected);
      
      setLocalModeActive(false);

      // 2. تحميل كشف الطلاب المسجلين
      try {
        const studentList = await fetchStudentsFromDB();
        setStudents(studentList);
      } catch (err) {
        console.error("Failed to load initial student directory:", err);
      } finally {
        setIsLoading(false);
      }
    }
    initializeSystem();
  }, []);

  // دالة تسجيل الدخول للأدمن
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput.trim()) {
      setLoginError('يرجى كتابة اسم المستخدم وكلمة المرور');
      return;
    }
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const admin = await verifyAdminLoginWithDetails(usernameInput.trim(), passwordInput.trim());
      if (admin) {
        setIsAdminLoggedIn(true);
        setLoggedInAdmin(admin);
        sessionStorage.setItem('elazhar_admin_logged_in', 'true');
        sessionStorage.setItem('elazhar_admin_user', JSON.stringify(admin));
        setLoginError('');
        if (admin.role === 'attendance_officer') {
          setActiveView('attendance');
        } else if (admin.role === 'teacher') {
          setActiveView('teacher_grades');
        } else {
          setActiveView('dashboard');
        }
      } else {
        setLoginError('اسم المستخدم أو كلمة المرور غير صحيحة!');
      }
    } catch (err) {
      console.error(err);
      setLoginError('حدث خطأ أثناء الاتصال بالخادم، يرجى المحاولة لاحقاً');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // تسجيل الخروج
  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    setLoggedInAdmin(null);
    setUsernameInput('');
    setPasswordInput('');
    sessionStorage.removeItem('elazhar_admin_logged_in');
    sessionStorage.removeItem('elazhar_admin_user');
  };

  // تحديث كشف الطلاب بعد أي عملية (إضافة، تعديل، حذف)
  const reloadStudents = async () => {
    try {
      const studentList = await fetchStudentsFromDB();
      setStudents(studentList);
    } catch (err) {
      console.error("Error reloading students:", err);
    }
  };

  // تبديل يدوي بين وضع السيرفر والمحلي لتسهيل التجربة للعميل
  const handleToggleLocalMode = async () => {
    setIsLoading(true);
    const newLocalMode = !localModeActive;
    setForcedLocalMode(newLocalMode);
    setLocalModeActive(newLocalMode);
    
    // إعادة شحن البيانات بناءً على الوضع الجديد
    const studentList = await fetchStudentsFromDB();
    setStudents(studentList);
    setIsLoading(false);
  };

  // إضافة طالب جديد
  const handleSaveStudent = async (studentData: Omit<Student, 'id' | 'createdAt'>) => {
    setIsLoading(true);
    try {
      if (editingStudent && editingStudent.id) {
        // تعديل بيانات طالب موجود
        await updateStudentInDB(editingStudent.id, studentData);
      } else {
        // تسجيل طالب جديد بالكامل
        const newStudentPayload = {
          ...studentData,
          createdAt: Date.now()
        };
        await addStudentToDB(newStudentPayload);
      }
      
      await reloadStudents();
      setIsFormOpen(false);
      setEditingStudent(undefined);
    } catch (err) {
      console.error("Failed to save student payload:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // حذف طالب نهائياً
  const handleDeleteStudent = async (id: string) => {
    setIsLoading(true);
    try {
      await deleteStudentFromDB(id);
      await reloadStudents();
      
      // إذا كان معروضاً حالياً نقوم بإغلاقه لعدم التعارض
      if (selectedStudent && selectedStudent.id === id) {
        setSelectedStudent(null);
        setActiveView('students');
      }
    } catch (err) {
      console.error("Failed to delete student:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // التوجيهات الفرعية لفتح الكاشفات
  const openEditForm = (student: Student) => {
    setEditingStudent(student);
    setIsFormOpen(true);
  };

  const openAddForm = () => {
    setEditingStudent(undefined);
    setIsFormOpen(true);
  };

  const openStudentProfile = (student: Student, backView: ActiveView = 'students') => {
    setSelectedStudent(student);
    setProfileBackView(backView);
    setActiveView('profile');
  };

  const openManageGrades = (student: Student) => {
    setSelectedStudent(student);
    setActiveView('grades');
  };

  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans selection:bg-emerald-100" dir="rtl">
        {/* عنصر زخرفي خلفي */}
        <div className="absolute top-0 right-0 h-96 w-96 bg-azhar-green/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 h-96 w-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-8 relative overflow-hidden z-10">
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-50 rounded-full border-2 border-emerald-100 text-3xl mb-1 shadow-sm">
              🕌
            </div>
            <h1 className="text-2xl font-black text-slate-850">بوابة الإدارة لمعهد عبد الفتاح عزام</h1>
            <p className="text-slate-500 text-xs font-semibold">لوحة تحكم المشرفين وشؤون طلاب المعهد (بنين)</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {loginError && (
              <div className="p-3 bg-rose-50 border-r-4 border-rose-500 text-rose-800 text-xs font-bold rounded-lg">
                {loginError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-slate-700 font-bold text-xs">اسم المستخدم</label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="اكتب اسم المستخدم..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-azhar-green focus:ring-4 focus:ring-emerald-50 outline-none text-xs font-bold transition-all bg-slate-50/50"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-slate-700 font-bold text-xs">كلمة المرور</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="اكتب كلمة المرور..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-azhar-green focus:ring-4 focus:ring-emerald-50 outline-none text-xs font-bold transition-all bg-slate-50/50"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-azhar-green hover:bg-azhar-green-hover disabled:bg-slate-300 text-white py-3 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري التحقق من الحساب...</span>
                </>
              ) : (
                <span>تسجيل الدخول الآمن</span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <a
              href="/index.html"
              className="text-[11px] text-slate-400 hover:text-azhar-green font-bold transition-colors"
            >
              ← الانتقال للبوابة العامة للطلاب وأولياء الأمور
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased select-none" dir="rtl">
      
      {/* 1. القائمة الجانبية (شريط التنقل الأزهري الفاخر) */}
      <aside className="w-full md:w-64 bg-azhar-green text-white shrink-0 flex flex-col border-l border-white/5 shadow-2xl print:hidden">
        
        {/* رأس القائمة الجانبية (الهوية والشعار الأزهري) */}
        <div className="p-6 border-b border-green-800/50 flex flex-col items-center">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-3 border border-white/20 text-2xl">
            🕌
          </div>
          <h2 className="text-sm font-bold font-sans text-center tracking-wide">معهد عبد الفتاح عزام بنين</h2>
          <p className="text-[10px] text-emerald-200/85 font-medium mt-0.5">نظام إدارة الطلاب الذكي</p>
        </div>

        {/* أزرار التنقل الرئيسية */}
        <nav className="p-4 flex-1 space-y-1.5 font-sans">
          
          {/* بوابة الاستعلام العام للجمهور */}
          {(!loggedInAdmin || (loggedInAdmin.role !== 'attendance_officer' && loggedInAdmin.role !== 'teacher')) && (
            <a
              href="/index.html"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-emerald-100 hover:bg-white/5 hover:text-white opacity-85 hover:opacity-100 border-r-4 border-transparent"
              id="nav-search"
            >
              <Search className="h-4.5 w-4.5 shrink-0" />
              <span>بوابة الاستعلام العام ↗</span>
            </a>
          )}

          {/* لوحة التحكم */}
          {(!loggedInAdmin || (loggedInAdmin.role !== 'attendance_officer' && loggedInAdmin.role !== 'teacher')) && (
            <button
              onClick={() => { setActiveView('dashboard'); setSelectedStudent(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeView === 'dashboard' 
                  ? 'bg-white/10 text-white border-r-4 border-yellow-400' 
                  : 'text-emerald-100 hover:bg-white/5 hover:text-white opacity-85 hover:opacity-100 border-r-4 border-transparent'
              }`}
              id="nav-dashboard"
            >
              <LayoutDashboard className="h-4.5 w-4.5 shrink-0" />
              <span>لوحة القيادة</span>
            </button>
          )}

          {/* شؤون الطلاب */}
          {(!loggedInAdmin || (loggedInAdmin.role !== 'attendance_officer' && loggedInAdmin.role !== 'teacher')) && (
            <button
              onClick={() => { setActiveView('students'); setSelectedStudent(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeView === 'students' || (activeView === 'profile' && selectedStudent)
                  ? 'bg-white/10 text-white border-r-4 border-yellow-400' 
                  : 'text-emerald-100 hover:bg-white/5 hover:text-white opacity-85 hover:opacity-100 border-r-4 border-transparent'
              }`}
              id="nav-students"
            >
              <Users className="h-4.5 w-4.5 shrink-0" />
              <span>شؤون الطلاب</span>
            </button>
          )}

          {/* دفتر حضور وغياب اليوم */}
          {(!loggedInAdmin || loggedInAdmin.role !== 'teacher') && (
            <button
              onClick={() => { setActiveView('attendance'); setSelectedStudent(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeView === 'attendance' 
                  ? 'bg-white/10 text-white border-r-4 border-yellow-400' 
                  : 'text-emerald-100 hover:bg-white/5 hover:text-white opacity-85 hover:opacity-100 border-r-4 border-transparent'
              }`}
              id="nav-attendance"
            >
              <CheckSquare className="h-4.5 w-4.5 shrink-0" />
              <span>الحضور والغياب</span>
            </button>
          )}

          {/* بوابة المعلم لرصد الدرجات */}
          {loggedInAdmin?.role === 'teacher' && (
            <button
              onClick={() => { setActiveView('teacher_grades'); setSelectedStudent(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeView === 'teacher_grades' 
                  ? 'bg-white/10 text-white border-r-4 border-yellow-400' 
                  : 'text-emerald-100 hover:bg-white/5 hover:text-white opacity-85 hover:opacity-100 border-r-4 border-transparent'
              }`}
              id="nav-teacher-grades"
            >
              <GraduationCap className="h-4.5 w-4.5 shrink-0 text-yellow-400" />
              <span>رصد درجات الطلاب</span>
            </button>
          )}

          {/* إدارة المعلمين والكوادر التدريسية */}
          {(!loggedInAdmin || (loggedInAdmin.role !== 'attendance_officer' && loggedInAdmin.role !== 'teacher')) && (
            <button
              onClick={() => { setActiveView('teachers'); setSelectedStudent(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeView === 'teachers' 
                  ? 'bg-white/10 text-white border-r-4 border-yellow-400' 
                  : 'text-emerald-100 hover:bg-white/5 hover:text-white opacity-85 hover:opacity-100 border-r-4 border-transparent'
              }`}
              id="nav-teachers"
            >
              <GraduationCap className="h-4.5 w-4.5 shrink-0" />
              <span>إدارة المعلمين</span>
            </button>
          )}

          {/* استفسارات الشات بوت وطلبات التواصل */}
          {(!loggedInAdmin || (loggedInAdmin.role !== 'attendance_officer' && loggedInAdmin.role !== 'teacher')) && (
            <button
              onClick={() => { setActiveView('inquiries'); setSelectedStudent(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeView === 'inquiries' 
                  ? 'bg-white/10 text-white border-r-4 border-yellow-400' 
                  : 'text-emerald-100 hover:bg-white/5 hover:text-white opacity-85 hover:opacity-100 border-r-4 border-transparent'
              }`}
              id="nav-inquiries"
            >
              <MessageSquare className="h-4.5 w-4.5 shrink-0" />
              <span>طلبات الشات بوت</span>
            </button>
          )}

          {/* المساعد الذكي لقراءة المستندات واستيراد الطلاب */}
          {(!loggedInAdmin || (loggedInAdmin.role !== 'attendance_officer' && loggedInAdmin.role !== 'teacher')) && (
            <button
              onClick={() => { setActiveView('ai_chat'); setSelectedStudent(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeView === 'ai_chat' 
                  ? 'bg-white/10 text-white border-r-4 border-yellow-400' 
                  : 'text-emerald-100 hover:bg-white/5 hover:text-white opacity-85 hover:opacity-100 border-r-4 border-transparent'
              }`}
              id="nav-ai-chat"
            >
              <Bot className="h-4.5 w-4.5 shrink-0 text-yellow-300" />
              <span className="flex items-center gap-1.5">
                <span>المساعد الذكي (AI)</span>
                <span className="bg-yellow-400 text-emerald-950 text-[8px] font-extrabold px-1 rounded-sm animate-pulse">جديد</span>
              </span>
            </button>
          )}

          {/* إدارة حسابات الأدمن */}
          {loggedInAdmin?.role === 'super_admin' && (
            <button
              onClick={() => { setActiveView('admins'); setSelectedStudent(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeView === 'admins' 
                  ? 'bg-white/10 text-white border-r-4 border-yellow-400' 
                  : 'text-emerald-100 hover:bg-white/5 hover:text-white opacity-85 hover:opacity-100 border-r-4 border-transparent'
              }`}
              id="nav-admins"
            >
              <Shield className="h-4.5 w-4.5 shrink-0 text-yellow-400" />
              <span>إدارة حسابات الأدمن</span>
            </button>
          )}

        </nav>

        {/* تذييل القائمة الجانبية (شريط معلومات الأمان والداتابيز) */}
        <div className="p-4 border-t border-green-800/50 bg-black/10 space-y-2.5 text-[10px] mt-auto">
          <div className="flex items-center justify-between text-emerald-200">
            <span className="flex items-center gap-1.5 font-medium">
              <Database className="h-3.5 w-3.5" />
              قاعدة البيانات المباشرة
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> Firestore متصل
            </span>
          </div>

          {/* اسم الحساب المسجل */}
          {loggedInAdmin && (
            <div className="px-3 py-1.5 bg-black/20 rounded-lg text-emerald-100/90 text-[10px] flex items-center justify-between font-sans">
              <span className="font-bold truncate max-w-[130px]">{loggedInAdmin.name}</span>
              <span className="bg-yellow-400 text-azhar-green-hover text-[8px] px-1.5 py-0.5 rounded font-black shrink-0">
                {loggedInAdmin.role === 'super_admin' ? 'مدير عام' : loggedInAdmin.role === 'principal' ? 'مدير معهد' : loggedInAdmin.role === 'teacher' ? 'معلم مواد' : 'مسؤول غياب'}
              </span>
            </div>
          )}

          {/* زر تسجيل الخروج للأمان */}
          <button
            onClick={handleLogout}
            className="w-full mt-2 py-2 px-3 bg-rose-600/20 hover:bg-rose-600/40 text-rose-200 border border-rose-500/30 rounded-lg text-right font-bold transition-all flex items-center justify-between gap-2 cursor-pointer text-[10px]"
          >
            <span className="flex items-center gap-1.5">
              <LogOut className="h-3.5 w-3.5" />
              تسجيل خروج آمن
            </span>
            <span className="text-[8px] bg-rose-950/40 px-1.5 py-0.5 rounded font-black text-rose-300">أدمن</span>
          </button>
        </div>

      </aside>

      {/* 2. مساحة العمل ومستعرض الصفحات */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* التوب بار (شريط المعلومات العلوي) */}
        <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between shadow-sm shrink-0 print:hidden">
          <div className="flex items-center gap-3 text-gray-500 text-xs sm:text-sm">
            <span>الإدارة المركزية</span>
            <span className="text-gray-300">/</span>
            <span className="text-azhar font-bold">إدارة المراحل التعليمية</span>
          </div>

          {/* معلومات كوتا أو إشعار للتطمين */}
          <div className="flex items-center gap-4">
            <div className="text-left text-[11px] text-gray-400 hidden sm:block font-medium">
              مرحبًا، {navigator.onLine ? 'الشبكة نشطة' : 'أنت أوفلاين'}
            </div>
            <div className="w-9 h-9 bg-gray-100 rounded-full border-2 border-white shadow-sm flex items-center justify-center font-bold text-azhar">
              أ
            </div>
          </div>
        </header>

        {/* مساحة العرض الرئيسية */}
        <div className="p-6 flex-1 overflow-y-auto max-h-[calc(105vh-4rem)] print:p-0">
          
          {/* إشعار التخزين الاحتياطي (يظهر فقط كتحذير خفيف في حال تفعيل التخزين المحلي) */}
          {localModeActive && (
            <div className="mb-6 bg-amber-50 border-r-4 border-amber-500 text-amber-900 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm print:hidden">
              <div className="flex items-start gap-3">
                <Database className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold">وضع التخزين الموضعي المؤقت (Local Sandbox) نشط</p>
                  <p className="text-amber-700/90 mt-0.5">يتم حفظ كشوف الحساب والدرجات والطلاب في التخزين الموضعي لمتصفحك حالياً بنجاح بنسبة 100%. يمكنك تبديل وضع المزامنة مع خادم Firebase في أي وقت.</p>
                </div>
              </div>
              <button 
                onClick={handleToggleLocalMode}
                className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0"
                id="disable-sandbox-btn"
              >
                تفعيل الفايربيز المباشر
              </button>
            </div>
          )}

          {/* التوجيه الفعلي للواجهة الحالية مع حركات motion الرشيقة */}
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center py-20 text-slate-500 space-y-2">
              <div className="animate-spin inline-block w-10 h-10 border-4 border-emerald-700 border-t-transparent rounded-full mb-2"></div>
              <p className="text-sm font-semibold">جاري جلب البيانات من الخادم، يرجى الانتظار...</p>
            </div>
          ) : (
            <motion.div
              key={activeView + (selectedStudent ? `_${selectedStudent.id}` : '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="h-full"
            >
              {activeView === 'dashboard' && (
                <Dashboard 
                  students={filteredStudents} 
                  onNavigateToStudents={() => setActiveView('students')}
                  onNavigateToAttendance={() => setActiveView('attendance')}
                  onAddStudent={openAddForm}
                  onViewProfile={(student) => openStudentProfile(student, 'dashboard')}
                  onNavigateToInquiries={() => setActiveView('inquiries')}
                  loggedInAdmin={loggedInAdmin}
                />
              )}

              {activeView === 'students' && (
                <StudentList 
                  students={filteredStudents}
                  onAddStudent={openAddForm}
                  onEditStudent={openEditForm}
                  onDeleteStudent={handleDeleteStudent}
                  onViewProfile={openStudentProfile}
                  onManageGrades={openManageGrades}
                  onOpenAttendance={() => setActiveView('attendance')}
                  loggedInAdmin={loggedInAdmin}
                />
              )}

              {activeView === 'attendance' && (
                <AttendanceManager 
                  students={filteredStudents}
                  onClose={() => setActiveView('students')}
                  loggedInAdmin={loggedInAdmin}
                />
              )}

              {activeView === 'grades' && selectedStudent && (
                <GradesManager 
                  student={selectedStudent}
                  onClose={() => { setSelectedStudent(null); setActiveView('students'); }}
                />
              )}

              {activeView === 'profile' && selectedStudent && (
                <StudentProfile 
                  student={selectedStudent}
                  onClose={() => { setSelectedStudent(null); setActiveView(profileBackView); }}
                />
              )}

              {activeView === 'teachers' && (
                <TeachersManager />
              )}

              {activeView === 'inquiries' && (
                <InquiriesManager />
              )}

              {activeView === 'admins' && loggedInAdmin?.role === 'super_admin' && (
                <AdminManager />
              )}

              {activeView === 'teacher_grades' && loggedInAdmin && (
                <TeacherManager 
                  students={filteredStudents}
                  loggedInAdmin={loggedInAdmin}
                />
              )}

              {activeView === 'ai_chat' && (
                <AIChatManager 
                  onStudentsImported={reloadStudents}
                />
              )}
            </motion.div>
          )}

        </div>

      </main>

      {/* 3. نافذة إضافة وتعديل طالب الطافية */}
      {isFormOpen && (
        <StudentForm 
          student={editingStudent}
          onSave={handleSaveStudent}
          onClose={() => { setIsFormOpen(false); setEditingStudent(undefined); }}
        />
      )}

    </div>
  );
}
