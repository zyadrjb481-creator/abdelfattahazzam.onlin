/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// المراحل الدراسية
export type AcademicStage = 'prep' | 'secondary'; // إعدادي أو ثانوي

// الصفوف الدراسية بالتفصيل
export type GradeLevel = 
  | '1_prep'        // الصف الأول الإعدادي
  | '2_prep'        // الصف الثاني الإعدادي
  | '3_prep'        // الصف الثالث الإعدادي
  | '1_secondary'   // الصف الأول الثانوي
  | '2_secondary';  // الصف الثاني الثانوي

// المذهب الفقهي الأزهري
export type Madhhab = 'hanafi' | 'shafii' | 'maliki';

// حالة القيد
export type EnrollmentStatus = 'new' | 'repeating'; // مستجد أو باق للإعادة

// الجنس
export type Gender = 'male' | 'female';

// هيكل الطالب
export interface Student {
  id?: string;
  name: string;             // الاسم بالكامل
  stage: AcademicStage;     // المرحلة
  grade: GradeLevel;        // الصف الدراسي
  classRoom: string;        // الفصل (مثال: أ، ب، 1/1)
  madhhab: Madhhab;         // المذهب الفقهي
  nationalId: string;       // الرقم القومي (14 رقم)
  birthDate: string;        // تاريخ الميلاد
  gender: Gender;           // الجنس
  guardianName: string;     // اسم ولي الأمر
  guardianPhone: string;    // هاتف ولي الأمر
  address: string;          // العنوان
  enrollmentStatus: EnrollmentStatus; // حالة القيد
  notes?: string;           // ملاحظات إضافية
  createdAt: number;        // تاريخ التسجيل (timestamp)
}

// تصنيف المواد الدراسية بالأزهر الشريف
export type SubjectCategory = 'shari' | 'arabic' | 'cultural'; // شرعي، عربي، ثقافي

// هيكل المادة الدراسية
export interface Subject {
  id: string;
  name: string;             // اسم المادة
  category: SubjectCategory; // تصنيف المادة
  maxGrade: number;         // الدرجة العظمى
  minGrade: number;         // درجة النجاح (الصغرى)
  applicableStages: AcademicStage[]; // المراحل التي تدرس فيها المادة
  applicableMadhhab?: Madhhab[];    // المذاهب التي تدرس لها (في حال كانت مادة فقهية)
}

// هيكل درجات المادة لطالب معين
export interface SubjectGrade {
  examGrade: number;        // درجة الامتحان التحريري
  classGrade: number;       // درجة أعمال السنة والشفهي
  total: number;            // المجموع الكلي
  isPassed: boolean;        // حالة النجاح
}

// هيكل درجات الفصل الدراسي لطالب
export interface StudentTermGrades {
  id?: string;              // معرف السجل (studentId_year_term)
  studentId: string;        // معرف الطالب
  term: 'term1' | 'term2';  // الفصل الدراسي الأول أو الثاني
  academicYear: string;     // العام الدراسي (مثال: 2025/2026)
  grades: {                 // درجات المواد (مفتاحها هو معرف المادة)
    [subjectId: string]: SubjectGrade;
  };
  totalGradesSum: number;   // مجموع درجات الطالب
  maxGradesSum: number;     // المجموع الكلي للمواد
  gpaPercentage: number;    // النسبة المئوية
  isOverallPassed: boolean; // النتيجة العامة (ناجح/راسب)
  updatedAt: number;        // تاريخ التعديل
}

// هيكل الحضور والغياب
export interface AttendanceRecord {
  id?: string;
  studentId: string;        // معرف الطالب
  studentName: string;      // اسم الطالب (لتسهيل العرض المباشر)
  grade: GradeLevel;        // صف الطالب لتسهيل الفلترة
  classRoom: string;        // فصل الطالب لتسهيل الفلترة
  date: string;             // التاريخ بصيغة YYYY-MM-DD
  status: 'present' | 'absent' | 'excused'; // حالة الحضور: حاضر، غائب، غائب بعذر
  notes?: string;           // سبب الغياب أو ملاحظات
  updatedAt: number;
}

// مصفوفة المواد الدراسية الأزهرية المعتمدة لجميع الصفوف
export const AL_AZHAR_SUBJECTS: Subject[] = [
  // --- العلوم الشرعية ---
  { id: 'quran', name: 'القرآن الكريم', category: 'shari', maxGrade: 100, minGrade: 50, applicableStages: ['prep', 'secondary'] },
  { id: 'fiqh_hanafi', name: 'الفقه الحنفي', category: 'shari', maxGrade: 100, minGrade: 50, applicableStages: ['prep', 'secondary'], applicableMadhhab: ['hanafi'] },
  { id: 'fiqh_shafii', name: 'الفقه الشافعي', category: 'shari', maxGrade: 100, minGrade: 50, applicableStages: ['prep', 'secondary'], applicableMadhhab: ['shafii'] },
  { id: 'fiqh_maliki', name: 'الفقه المالكي', category: 'shari', maxGrade: 100, minGrade: 50, applicableStages: ['prep', 'secondary'], applicableMadhhab: ['maliki'] },
  { id: 'usul_din_tafsir_hadith', name: 'أصول الدين (التفسير والحديث)', category: 'shari', maxGrade: 100, minGrade: 50, applicableStages: ['prep'] },
  { id: 'usul_din_tawheed_seerah', name: 'أصول الدين (التوحيد والسيرة)', category: 'shari', maxGrade: 100, minGrade: 50, applicableStages: ['prep'] },
  { id: 'tafsir', name: 'التفسير (علوم القرآن)', category: 'shari', maxGrade: 100, minGrade: 50, applicableStages: ['secondary'] },
  { id: 'hadith', name: 'الحديث الشريف (وعلومه)', category: 'shari', maxGrade: 100, minGrade: 50, applicableStages: ['secondary'] },
  { id: 'tawheed', name: 'التوحيد والمنطق', category: 'shari', maxGrade: 100, minGrade: 50, applicableStages: ['secondary'] },
  { id: 'thaqafa', name: 'الثقافة الإسلامية', category: 'shari', maxGrade: 50, minGrade: 25, applicableStages: ['prep', 'secondary'] },

  // --- المواد العربية ---
  { id: 'nahw', name: 'النحو', category: 'arabic', maxGrade: 100, minGrade: 50, applicableStages: ['prep', 'secondary'] },
  { id: 'sarf', name: 'الصرف', category: 'arabic', maxGrade: 100, minGrade: 50, applicableStages: ['prep', 'secondary'] },
  { id: 'balagha', name: 'البلاغة', category: 'arabic', maxGrade: 100, minGrade: 50, applicableStages: ['secondary'] },
  { id: 'adab_nusoos', name: 'الأدب والنصوص', category: 'arabic', maxGrade: 100, minGrade: 50, applicableStages: ['secondary'] },
  { id: 'insha', name: 'الإنشاء', category: 'arabic', maxGrade: 50, minGrade: 25, applicableStages: ['prep', 'secondary'] },

  // --- المواد الثقافية والعلمية ---
  { id: 'english', name: 'اللغة الإنجليزية', category: 'cultural', maxGrade: 100, minGrade: 50, applicableStages: ['prep', 'secondary'] },
  { id: 'math', name: 'الرياضيات', category: 'cultural', maxGrade: 100, minGrade: 50, applicableStages: ['prep', 'secondary'] },
  { id: 'science', name: 'العلوم', category: 'cultural', maxGrade: 100, minGrade: 50, applicableStages: ['prep', 'secondary'] },
  { id: 'social_studies', name: 'الدراسات الاجتماعية', category: 'cultural', maxGrade: 100, minGrade: 50, applicableStages: ['prep'] },
  { id: 'history_geography', name: 'التاريخ والجغرافيا', category: 'cultural', maxGrade: 120, minGrade: 60, applicableStages: ['secondary'] },
  { id: 'computer', name: 'الفيزياء', category: 'cultural', maxGrade: 50, minGrade: 25, applicableStages: ['prep', 'secondary'] },
  { id: 'art', name: 'الكيمياء', category: 'cultural', maxGrade: 40, minGrade: 20, applicableStages: ['prep'] }
];

// تسميات المراحل والصفوف باللغة العربية لعرضها في الواجهات بشكل أنيق
export const ARABIC_LABELS = {
  stages: {
    prep: 'المرحلة الإعدادية',
    secondary: 'المرحلة الثانوية'
  },
  grades: {
    '1_prep': 'الصف الأول الإعدادي',
    '2_prep': 'الصف الثاني الإعدادي',
    '3_prep': 'الصف الثالث الإعدادي',
    '1_secondary': 'الصف الأول الثانوي',
    '2_secondary': 'الصف الثاني الثانوي'
  },
  madhhabs: {
    hanafi: 'المذهب الحنفي',
    shafii: 'المذهب الشافعي',
    maliki: 'المذهب المالكي'
  },
  enrollmentStatus: {
    new: 'مستجد',
    repeating: 'باقٍ للإعادة'
  },
  genders: {
    male: 'طالب (ذكر)',
    female: 'طالبة (أنثى)'
  },
  categories: {
    shari: 'العلوم الشرعية',
    arabic: 'المواد العربية',
    cultural: 'المواد الثقافية والعلمية'
  },
  attendance: {
    present: 'حاضر',
    absent: 'غائب',
    excused: 'غائب بعذر'
  },
  terms: {
    term1: 'الفصل الدراسي الأول',
    term2: 'الفصل الدراسي الثاني'
  }
};

// هيكل المعلم
export interface Teacher {
  id?: string;
  name: string;             // اسم المعلم
  role: string;             // المسمى الوظيفي (مثال: شيخ المعهد، معلم أول)
  specialty: string;        // التخصص (مثال: فقه، لغة عربية، رياضيات)
  bio: string;              // نبذة تعريفية قصيرة
  avatarColor: string;      // تدرج الألوان الخلفية (الـ CSS classes)
  photoUrl?: string;        // رابط الصورة الشخصية أو صورة مرفوعة
  initials: string;         // الحروف الأولى للاسم
  createdAt: number;
}

// هيكل طلب الاستفسار المرسل للأدمن
export interface Inquiry {
  id?: string;
  question: string;         // نص الاستفسار أو السؤال
  phone: string;            // رقم الهاتف للتواصل
  status: 'pending' | 'resolved'; // حالة الطلب (قيد الانتظار / تم التواصل)
  createdAt: number;        // تاريخ الإرسال
}

// أدوار المسؤولين (الـ RBAC)
export type AdminRole = 'super_admin' | 'principal' | 'attendance_officer' | 'teacher';

// هيكل حساب مسؤول/أدمن في المعهد
export interface AdminUser {
  id?: string;
  username: string;         // اسم المستخدم لتسجيل الدخول
  password: string;         // كلمة المرور
  name: string;             // الاسم بالكامل
  role: AdminRole;          // الدور والصلاحية
  gradeRestriction?: GradeLevel | 'all'; // الصف الدراسي المخصص له (في حال كان مسؤول حضور وغياب) أو الكل
  subjectRestriction?: string; // المادة المخصصة له (في حال كان معلماً)
  createdAt: number;
}

// مسميات الأدوار باللغة العربية لعرضها للـ Super Admin
export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'سوبر أدمن (مالك النظام)',
  principal: 'مدير معهد (كامل الصلاحيات عدا إدارة الحسابات)',
  attendance_officer: 'مسؤول حضور وغياب (محدد بصف معين)',
  teacher: 'معلم / أستاذ مواد (رصد درجات لصف معين)'
};



