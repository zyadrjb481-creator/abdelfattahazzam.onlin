/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  setDoc,
  getDoc,
  getDocFromServer
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Student, AttendanceRecord, StudentTermGrades, Teacher, Inquiry, AdminUser } from "./types";

// تكوين Firebase المقدم من المستخدم لتوجيه النظام للمشروع المطلوب
const firebaseConfig = {
  apiKey: "AIzaSyA5WkhmhYjqnnkDldjmh-mkpOjsPD7Ivso",
  authDomain: "elazhar.firebaseapp.com",
  projectId: "elazhar",
  storageBucket: "elazhar.firebasestorage.app",
  messagingSenderId: "787155813174",
  appId: "1:787155813174:web:846e5a7c9f9a0a017d6997",
  measurementId: "G-PWM002B4E2"
};

// تهيئة تطبيق Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// هيكل خطأ Firestore المعتمد
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

// معالج الأخطاء القياسي في قواعد البيانات
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.warn('Firestore Sandbox Warning: ', JSON.stringify(errInfo));
  return errInfo;
}

// اختبار الاتصال بقاعدة البيانات في بداية التشغيل للتأكد من الحالة
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    console.warn("Firestore service connection status (using fallback local engine if permission denied):", error);
    return false;
  }
}

// === إدارة التخزين المحلي الاحتياطي (LocalStorage Fallback) ===
// يضمن هذا المعالج استمرار عمل البرنامج بنسبة 100% في حال عدم تفعيل Firestore أو انتهاء الكوتا اليومية للعميل.

const LOCAL_STORAGE_KEYS = {
  STUDENTS: 'elazhar_students',
  ATTENDANCE: 'elazhar_attendance',
  GRADES: 'elazhar_grades',
  TEACHERS: 'elazhar_teachers',
  INQUIRIES: 'elazhar_inquiries',
  IS_LOCAL_MODE: 'elazhar_force_local_mode'
};

// التحقق من تفعيل الوضع المحلي (تم التعطيل والاعتماد كلياً على الفايربيز المباشر)
export function isForcedLocalMode(): boolean {
  return false; // دائمًا وضع الفايربيز المباشر بناءً على طلب المستخدم
}

export function setForcedLocalMode(value: boolean) {
  // تم إيقاف التبديل والاعتماد كلياً على الفايربيز المباشر
}

// --- دوال الكيانات (الطلاب) ---

export async function fetchStudentsFromDB(): Promise<Student[]> {
  const isLocal = isForcedLocalMode();
  if (!isLocal) {
    try {
      const q = query(collection(db, "students"));
      const querySnapshot = await getDocs(q);
      const studentsList: Student[] = [];
      querySnapshot.forEach((doc) => {
        studentsList.push({ id: doc.id, ...doc.data() } as Student);
      });
      return studentsList;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "students");
      // في حال وجود خطأ في الصلاحيات أو الاتصال، ننتقل تلقائياً للتخزين المحلي
      setForcedLocalMode(true);
    }
  }

  // التخزين المحلي الاحتياطي
  const localData = localStorage.getItem(LOCAL_STORAGE_KEYS.STUDENTS);
  return localData ? JSON.parse(localData) : [];
}

export async function addStudentToDB(student: Omit<Student, 'id'>): Promise<string> {
  const isLocal = isForcedLocalMode();
  if (!isLocal) {
    try {
      const docRef = await addDoc(collection(db, "students"), student);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "students");
      setForcedLocalMode(true);
    }
  }

  // إضافة طالب محلياً
  const localData = localStorage.getItem(LOCAL_STORAGE_KEYS.STUDENTS);
  const students: Student[] = localData ? JSON.parse(localData) : [];
  const tempId = 'student_' + Math.random().toString(36).substring(2, 11);
  const newStudent: Student = { ...student, id: tempId };
  students.push(newStudent);
  localStorage.setItem(LOCAL_STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  return tempId;
}

export async function updateStudentInDB(id: string, updatedFields: Partial<Student>): Promise<void> {
  const isLocal = isForcedLocalMode();
  if (!isLocal) {
    try {
      await updateDoc(doc(db, "students", id), updatedFields);
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `students/${id}`);
      setForcedLocalMode(true);
    }
  }

  // تعديل محلي
  const localData = localStorage.getItem(LOCAL_STORAGE_KEYS.STUDENTS);
  if (localData) {
    const students: Student[] = JSON.parse(localData);
    const index = students.findIndex(s => s.id === id);
    if (index !== -1) {
      students[index] = { ...students[index], ...updatedFields };
      localStorage.setItem(LOCAL_STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    }
  }
}

export async function deleteStudentFromDB(id: string): Promise<void> {
  const isLocal = isForcedLocalMode();
  if (!isLocal) {
    try {
      await deleteDoc(doc(db, "students", id));
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `students/${id}`);
      setForcedLocalMode(true);
    }
  }

  // حذف محلي
  const localData = localStorage.getItem(LOCAL_STORAGE_KEYS.STUDENTS);
  if (localData) {
    const students: Student[] = JSON.parse(localData);
    const updated = students.filter(s => s.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEYS.STUDENTS, JSON.stringify(updated));

    // تنظيف الحضور والدرجات التابعة له محلياً أيضاً
    const localGrades = localStorage.getItem(LOCAL_STORAGE_KEYS.GRADES);
    if (localGrades) {
      const grades: StudentTermGrades[] = JSON.parse(localGrades);
      localStorage.setItem(LOCAL_STORAGE_KEYS.GRADES, JSON.stringify(grades.filter(g => g.studentId !== id)));
    }
    const localAttendance = localStorage.getItem(LOCAL_STORAGE_KEYS.ATTENDANCE);
    if (localAttendance) {
      const attendance: AttendanceRecord[] = JSON.parse(localAttendance);
      localStorage.setItem(LOCAL_STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance.filter(a => a.studentId !== id)));
    }
  }
}

// --- دوال الحضور والغياب ---

export async function fetchAttendanceFromDB(date?: string): Promise<AttendanceRecord[]> {
  const isLocal = isForcedLocalMode();
  if (!isLocal) {
    try {
      const collRef = collection(db, "attendance");
      const q = date ? query(collRef, where("date", "==", date)) : query(collRef);
      const querySnapshot = await getDocs(q);
      const attendanceList: AttendanceRecord[] = [];
      querySnapshot.forEach((doc) => {
        attendanceList.push({ id: doc.id, ...doc.data() } as AttendanceRecord);
      });
      return attendanceList;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "attendance");
      setForcedLocalMode(true);
    }
  }

  const localData = localStorage.getItem(LOCAL_STORAGE_KEYS.ATTENDANCE);
  const records: AttendanceRecord[] = localData ? JSON.parse(localData) : [];
  if (date) {
    return records.filter(r => r.date === date);
  }
  return records;
}

export async function saveAttendanceBatchToDB(records: AttendanceRecord[]): Promise<void> {
  const isLocal = isForcedLocalMode();
  if (!isLocal) {
    try {
      // بما أنه لا يوجد دعم للـ batch في API المبسط مباشرة سنقوم بالحفظ المتسلسل أو عبر وعود متوازية
      const promises = records.map(record => {
        const docId = record.id || `${record.studentId}_${record.date}`;
        return setDoc(doc(db, "attendance", docId), { ...record, id: docId });
      });
      await Promise.all(promises);
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "attendance/batch");
      setForcedLocalMode(true);
    }
  }

  // التخزين المحلي
  const localData = localStorage.getItem(LOCAL_STORAGE_KEYS.ATTENDANCE);
  const existingRecords: AttendanceRecord[] = localData ? JSON.parse(localData) : [];
  
  records.forEach(newRecord => {
    const id = newRecord.id || `${newRecord.studentId}_${newRecord.date}`;
    const idx = existingRecords.findIndex(r => r.id === id || (r.studentId === newRecord.studentId && r.date === newRecord.date));
    const finalRecord = { ...newRecord, id };
    if (idx !== -1) {
      existingRecords[idx] = finalRecord;
    } else {
      existingRecords.push(finalRecord);
    }
  });

  localStorage.setItem(LOCAL_STORAGE_KEYS.ATTENDANCE, JSON.stringify(existingRecords));
}

// --- دوال نتائج الطلاب والدرجات ---

export async function fetchAllGradesFromDB(): Promise<StudentTermGrades[]> {
  const isLocal = isForcedLocalMode();
  if (!isLocal) {
    try {
      const q = query(collection(db, "grades"));
      const querySnapshot = await getDocs(q);
      const gradesList: StudentTermGrades[] = [];
      querySnapshot.forEach((doc) => {
        gradesList.push({ id: doc.id, ...doc.data() } as StudentTermGrades);
      });
      return gradesList;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "grades");
      setForcedLocalMode(true);
    }
  }

  const localData = localStorage.getItem(LOCAL_STORAGE_KEYS.GRADES);
  return localData ? JSON.parse(localData) : [];
}

export async function saveGradesToDB(gradeRecord: StudentTermGrades): Promise<string> {
  const isLocal = isForcedLocalMode();
  const docId = gradeRecord.id || `${gradeRecord.studentId}_${gradeRecord.academicYear.replace('/', '-')}_${gradeRecord.term}`;
  const finalRecord = { ...gradeRecord, id: docId };

  if (!isLocal) {
    try {
      await setDoc(doc(db, "grades", docId), finalRecord);
      return docId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `grades/${docId}`);
      setForcedLocalMode(true);
    }
  }

  // حفظ محلي
  const localData = localStorage.getItem(LOCAL_STORAGE_KEYS.GRADES);
  const records: StudentTermGrades[] = localData ? JSON.parse(localData) : [];
  const index = records.findIndex(r => r.id === docId || (r.studentId === gradeRecord.studentId && r.academicYear === gradeRecord.academicYear && r.term === gradeRecord.term));
  
  if (index !== -1) {
    records[index] = finalRecord;
  } else {
    records.push(finalRecord);
  }
  
  localStorage.setItem(LOCAL_STORAGE_KEYS.GRADES, JSON.stringify(records));
  return docId;
}

export async function fetchStudentGradesFromDB(studentId: string): Promise<StudentTermGrades[]> {
  const isLocal = isForcedLocalMode();
  if (!isLocal) {
    try {
      const q = query(collection(db, "grades"), where("studentId", "==", studentId));
      const querySnapshot = await getDocs(q);
      const gradesList: StudentTermGrades[] = [];
      querySnapshot.forEach((doc) => {
        gradesList.push({ id: doc.id, ...doc.data() } as StudentTermGrades);
      });
      return gradesList;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "grades_by_student");
      setForcedLocalMode(true);
    }
  }

  const localData = localStorage.getItem(LOCAL_STORAGE_KEYS.GRADES);
  const records: StudentTermGrades[] = localData ? JSON.parse(localData) : [];
  return records.filter(r => r.studentId === studentId);
}

// === التحقق من بيانات الدخول للأدمن المتقدم (مع الصلاحيات والـ RBAC) ===
export async function verifyAdminLoginWithDetails(usernameInput: string, passwordInput: string): Promise<AdminUser | null> {
  const normalizedUser = usernameInput.trim();
  const normalizedPass = passwordInput.trim();

  // الحساب الافتراضي والاحتياطي المباشر كـ Super Admin
  const fallbackUsername = "hassan";
  const fallbackPassword = "01126269124";
  
  if (normalizedUser === fallbackUsername && normalizedPass === fallbackPassword) {
    return {
      id: 'super_admin_hassan',
      username: fallbackUsername,
      password: fallbackPassword,
      name: 'الأستاذ حسن (السوبر أدمن)',
      role: 'super_admin',
      gradeRestriction: 'all',
      createdAt: 1719999999000
    };
  }

  try {
    // 1. نحاول جلب مستند 'name' مباشرة من مجموعة 'Users'
    const userDocRef = doc(db, "Users", "name");
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      if (userData.username === normalizedUser && userData.password === normalizedPass) {
        return {
          id: 'name',
          username: userData.username,
          password: userData.password,
          name: userData.name || 'مدير المعهد المعتمد',
          role: userData.role || 'principal',
          gradeRestriction: userData.gradeRestriction || 'all',
          createdAt: userData.createdAt || Date.now()
        };
      }
    }

    // 2. كخيار بديل، نقوم بالاستعلام عن مستند يحتوي على اسم المستخدم وكلمة المرور
    const usersColRef = collection(db, "Users");
    const q = query(usersColRef, where("username", "==", normalizedUser), where("password", "==", normalizedPass));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      return {
        id: docSnap.id,
        username: data.username,
        password: data.password,
        name: data.name || 'مستخدم مخصص',
        role: data.role || 'principal',
        gradeRestriction: data.gradeRestriction || 'all',
        createdAt: data.createdAt || Date.now()
      };
    }
  } catch (error) {
    console.warn("Firestore Auth Query Error:", error);
  }

  // فحص محلي للاحتياط
  const localData = localStorage.getItem('elazhar_users');
  if (localData) {
    try {
      const records: AdminUser[] = JSON.parse(localData);
      const matched = records.find(r => r.username === normalizedUser && r.password === normalizedPass);
      if (matched) {
        return matched;
      }
    } catch (e) {
      console.error(e);
    }
  }

  return null;
}

// === التحقق من بيانات الدخول للأدمن البسيط ===
export async function verifyAdminLogin(usernameInput: string, passwordInput: string): Promise<boolean> {
  const admin = await verifyAdminLoginWithDetails(usernameInput, passwordInput);
  return admin !== null;
}

// === إدارة حسابات المشرفين والمدراء (خاص بالسوبر أدمن) ===
export async function fetchAdminsFromDB(): Promise<AdminUser[]> {
  try {
    const q = query(collection(db, "Users"));
    const querySnapshot = await getDocs(q);
    const list: AdminUser[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // استبعاد المستندات غير المكتملة أو غير الحسابية
      if (data.username && data.password && docSnap.id !== 'name') {
        list.push({ id: docSnap.id, ...data } as AdminUser);
      }
    });
    // ترتيب الحسابات أبجدياً أو تاريخ التسجيل
    return list.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Error fetching admins from DB:", error);
  }

  // في حال فشل الاتصال أو الحسابات المحلية
  const localData = localStorage.getItem('elazhar_users');
  return localData ? JSON.parse(localData) : [];
}

export async function saveAdminToDB(admin: AdminUser): Promise<string> {
  const id = admin.id || `admin_${Date.now()}`;
  const finalRecord = { ...admin, id };

  try {
    await setDoc(doc(db, "Users", id), finalRecord);
  } catch (error) {
    console.error("Error saving admin user to DB:", error);
  }

  // حفظ محلي للمزامنة والسرعة
  const localData = localStorage.getItem('elazhar_users');
  let records: AdminUser[] = localData ? JSON.parse(localData) : [];
  const index = records.findIndex(r => r.id === id || r.username === admin.username);
  if (index !== -1) {
    records[index] = finalRecord;
  } else {
    records.push(finalRecord);
  }
  localStorage.setItem('elazhar_users', JSON.stringify(records));
  return id;
}

export async function deleteAdminFromDB(adminId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "Users", adminId));
  } catch (error) {
    console.error("Error deleting admin from DB:", error);
  }

  const localData = localStorage.getItem('elazhar_users');
  if (localData) {
    try {
      let records: AdminUser[] = JSON.parse(localData);
      records = records.filter(r => r.id !== adminId);
      localStorage.setItem('elazhar_users', JSON.stringify(records));
    } catch (e) {
      console.error(e);
    }
  }
  return true;
}

// === بذر ومعالجة المعلمين وأعضاء الهيئة التدريسية ===
const DEFAULT_TEACHERS: Teacher[] = [
  {
    id: 'teacher_1',
    name: 'الأستاذ / أحمد محمد إبراهيم',
    role: 'شيخ وشيخ المعهد الحالي',
    specialty: 'الإدارة العامة والعلوم الشرعية',
    bio: 'شغل منصب وكيل المعهد لسنوات عديدة، وله خبرة تزيد عن 25 عاماً في التدريس والإدارة الأزهرية الحكيمة والمتابعة المستمرة لأولياء الأمور.',
    avatarColor: 'from-emerald-600 to-teal-700',
    initials: 'أ إ',
    createdAt: 1719999999001
  },
  {
    id: 'teacher_2',
    name: 'الأستاذ / محمود حسن علي',
    role: 'وكيل المعهد لشؤون الطلاب',
    specialty: 'تطوير التعليم والتسجيل',
    bio: 'المسؤول الأول عن شؤون القبول والتسجيل، رائد الأنشطة الاجتماعية وبناء الخطط التربوية المتطورة لجميع صفوف البنين بالمعهد.',
    avatarColor: 'from-amber-500 to-orange-600',
    initials: 'م ع',
    createdAt: 1719999999002
  },
  {
    id: 'teacher_3',
    name: 'فضيلة الشيخ / مصطفى عبد الرحمن',
    role: 'كبير معلمي العلوم الشرعية',
    specialty: 'الفقه الحنفي والحديث الشريف',
    bio: 'خريج جامعة الأزهر الشريف كلية الشريعة والقانون، يشرف على تربية الطلاب تربية دينية معتدلة ونشر الفكر الأزهري الوسطي السليم.',
    avatarColor: 'from-blue-500 to-indigo-600',
    initials: 'ش م',
    createdAt: 1719999999003
  },
  {
    id: 'teacher_4',
    name: 'الأستاذ / طارق العشري',
    role: 'معلم أول اللغة العربية',
    specialty: 'النحو والصرف والبلاغة الأدبية',
    bio: 'عاشق للغة الضاد ومحفظ للقرآن الكريم، يسعى دوماً لترسيخ قواعد النطق والخط العربي السليم لدى طلاب جميع المراحل التعليمية.',
    avatarColor: 'from-rose-500 to-red-600',
    initials: 'ط ع',
    createdAt: 1719999999004
  },
  {
    id: 'teacher_5',
    name: 'الأستاذ / هاني هلال',
    role: 'معلم أول الرياضيات والعلوم',
    specialty: 'الرياضيات الحديثة والفيزياء',
    bio: 'يستخدم أحدث وسائل التعليم النشط والذكاء الاصطناعي لتبسيط العلوم الرياضية وتطوير المهارات الحسابية للبنين بالمعهد.',
    avatarColor: 'from-cyan-500 to-sky-600',
    initials: 'هـ هـ',
    createdAt: 1719999999005
  },
  {
    id: 'teacher_6',
    name: 'المهندس / أحمد جمال',
    role: 'أخصائي التطوير التكنولوجي',
    specialty: 'الحاسب الآلي والمنصة الإلكترونية',
    bio: 'المسؤول عن تشغيل معمل الحاسب الآلي بالمعهد وإدارة السيرفر وتطوير بوابة الاستعلام الرقمية الموحدة لخدمة أولياء الأمور.',
    avatarColor: 'from-purple-500 to-fuchsia-600',
    initials: 'م أ',
    createdAt: 1719999999006
  }
];

export async function fetchTeachersFromDB(): Promise<Teacher[]> {
  const isLocal = isForcedLocalMode();
  if (!isLocal) {
    try {
      const q = query(collection(db, "teachers"));
      const querySnapshot = await getDocs(q);
      const list: Teacher[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Teacher);
      });
      if (list.length > 0) {
        return list.sort((a, b) => a.createdAt - b.createdAt);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "teachers");
    }
  }

  const localData = localStorage.getItem(LOCAL_STORAGE_KEYS.TEACHERS);
  if (!localData) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.TEACHERS, JSON.stringify(DEFAULT_TEACHERS));
    return DEFAULT_TEACHERS;
  }
  try {
    const records: Teacher[] = JSON.parse(localData);
    return records.sort((a, b) => a.createdAt - b.createdAt);
  } catch (e) {
    return DEFAULT_TEACHERS;
  }
}

export async function saveTeacherToDB(teacher: Teacher): Promise<string> {
  const isLocal = isForcedLocalMode();
  const id = teacher.id || `teacher_${Date.now()}`;
  const finalRecord = { ...teacher, id };

  if (!isLocal) {
    try {
      await setDoc(doc(db, "teachers", id), finalRecord);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `teachers/${id}`);
    }
  }

  // حفظ محلي أيضاً لضمان المزامنة
  const localData = localStorage.getItem(LOCAL_STORAGE_KEYS.TEACHERS);
  let records: Teacher[] = [];
  try {
    records = localData ? JSON.parse(localData) : [...DEFAULT_TEACHERS];
  } catch (e) {
    records = [...DEFAULT_TEACHERS];
  }
  const index = records.findIndex(r => r.id === id);
  if (index !== -1) {
    records[index] = finalRecord;
  } else {
    records.push(finalRecord);
  }
  localStorage.setItem(LOCAL_STORAGE_KEYS.TEACHERS, JSON.stringify(records));
  return id;
}

export async function deleteTeacherFromDB(teacherId: string): Promise<boolean> {
  const isLocal = isForcedLocalMode();
  if (!isLocal) {
    try {
      await deleteDoc(doc(db, "teachers", teacherId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `teachers/${teacherId}`);
    }
  }

  const localData = localStorage.getItem(LOCAL_STORAGE_KEYS.TEACHERS);
  let records: Teacher[] = [];
  try {
    records = localData ? JSON.parse(localData) : [...DEFAULT_TEACHERS];
  } catch (e) {
    records = [...DEFAULT_TEACHERS];
  }
  const filtered = records.filter(r => r.id !== teacherId);
  localStorage.setItem(LOCAL_STORAGE_KEYS.TEACHERS, JSON.stringify(filtered));
  return true;
}

// === إدارة الاستفسارات والطلبات المرسلة للأدمن ===

export async function fetchInquiriesFromDB(): Promise<Inquiry[]> {
  const isLocal = isForcedLocalMode();
  if (!isLocal) {
    try {
      const q = query(collection(db, "inquiries"));
      const querySnapshot = await getDocs(q);
      const list: Inquiry[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Inquiry);
      });
      return list.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "inquiries");
    }
  }

  const localData = localStorage.getItem(LOCAL_STORAGE_KEYS.INQUIRIES);
  if (!localData) return [];
  try {
    const records: Inquiry[] = JSON.parse(localData);
    return records.sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    return [];
  }
}

export async function saveInquiryToDB(inquiry: Omit<Inquiry, 'id'> & { id?: string }): Promise<string> {
  const isLocal = isForcedLocalMode();
  const id = inquiry.id || `inquiry_${Date.now()}`;
  const finalRecord = { ...inquiry, id };

  if (!isLocal) {
    try {
      await setDoc(doc(db, "inquiries", id), finalRecord);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `inquiries/${id}`);
    }
  }

  const localData = localStorage.getItem(LOCAL_STORAGE_KEYS.INQUIRIES);
  let records: Inquiry[] = [];
  try {
    records = localData ? JSON.parse(localData) : [];
  } catch (e) {
    records = [];
  }
  const index = records.findIndex(r => r.id === id);
  if (index !== -1) {
    records[index] = finalRecord;
  } else {
    records.push(finalRecord);
  }
  localStorage.setItem(LOCAL_STORAGE_KEYS.INQUIRIES, JSON.stringify(records));
  return id;
}

export async function updateInquiryStatusInDB(id: string, status: 'pending' | 'resolved'): Promise<void> {
  const isLocal = isForcedLocalMode();
  if (!isLocal) {
    try {
      await updateDoc(doc(db, "inquiries", id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `inquiries/${id}`);
    }
  }

  const localData = localStorage.getItem(LOCAL_STORAGE_KEYS.INQUIRIES);
  if (localData) {
    try {
      const records: Inquiry[] = JSON.parse(localData);
      const index = records.findIndex(r => r.id === id);
      if (index !== -1) {
        records[index].status = status;
        localStorage.setItem(LOCAL_STORAGE_KEYS.INQUIRIES, JSON.stringify(records));
      }
    } catch (e) {}
  }
}

export async function deleteInquiryFromDB(id: string): Promise<void> {
  const isLocal = isForcedLocalMode();
  if (!isLocal) {
    try {
      await deleteDoc(doc(db, "inquiries", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `inquiries/${id}`);
    }
  }

  const localData = localStorage.getItem(LOCAL_STORAGE_KEYS.INQUIRIES);
  if (localData) {
    try {
      const records: Inquiry[] = JSON.parse(localData);
      const filtered = records.filter(r => r.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEYS.INQUIRIES, JSON.stringify(filtered));
    } catch (e) {}
  }
}


