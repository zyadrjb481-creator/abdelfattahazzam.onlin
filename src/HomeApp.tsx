/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  fetchStudentsFromDB,
  isForcedLocalMode,
  setForcedLocalMode,
  testFirestoreConnection,
  fetchTeachersFromDB
} from './firebase';
import { Student, Teacher } from './types';
import StudentSearch from './components/StudentSearch';
import StudentProfile from './components/StudentProfile';

export default function HomeApp() {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // حالات التحميل
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initializePortal() {
      setIsLoading(true);
      
      // التحقق من اتصال قاعدة البيانات
      const isConnected = await testFirestoreConnection();

      const hasStoredPreference = localStorage.getItem('elazhar_force_local_mode') !== null;
      if (isConnected) {
        if (!hasStoredPreference) {
          setForcedLocalMode(false);
        }
      } else {
        setForcedLocalMode(true);
      }

      try {
        const studentList = await fetchStudentsFromDB();
        setStudents(studentList);
        
        const teacherList = await fetchTeachersFromDB();
        setTeachers(teacherList);
      } catch (err) {
        console.error("Failed to load portal data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    initializePortal();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans" dir="rtl">
      
      {/* الهيدر العلوي للبوابة العامة */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            
            {/* شعار المعهد الأزهري */}
            <div className="flex items-center gap-3">
              <span className="text-2xl md:text-3xl shrink-0" role="img" aria-label="Al-Azhar Emblem">
                🕌
              </span>
              <div className="text-right">
                <h1 className="text-sm md:text-base font-extrabold text-slate-850 flex items-center gap-1.5">
                  <span>معهد عبد الفتاح عزام بنين</span>
                  <span className="text-[10px] bg-emerald-50 text-azhar-green font-bold px-2 py-0.5 rounded-md border border-emerald-100/50">
                    البوابة العامة
                  </span>
                </h1>
                <p className="text-[10px] text-slate-500 font-medium">نظام الاستعلام الرقمي الفوري لأولياء الأمور والطلاب</p>
              </div>
            </div>

            {/* الأزرار والمعلومات الجانبية */}
            <div className="flex items-center gap-3">
              
            </div>
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-azhar-green animate-spin"></div>
              <span className="absolute inset-0 flex items-center justify-center text-xs">🕌</span>
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-xs font-bold text-slate-700">جاري تحميل البوابة الأزهريّة...</h3>
              <p className="text-[10px] text-slate-400">نظام الاستعلام الآمن لنتائج وبيانات الطلاب</p>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="h-full"
          >
            {selectedStudent ? (
              <div className="space-y-4">
                {/* زر العودة لقائمة الاستعلام */}
                <div className="flex justify-start">
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all"
                  >
                    <span>← العودة لمحرك البحث</span>
                  </button>
                </div>
                
                {/* عرض ملف الطالب التفصيلي */}
                <StudentProfile 
                  student={selectedStudent}
                  onClose={() => setSelectedStudent(null)}
                />
              </div>
            ) : (
              <StudentSearch 
                students={students}
                onViewProfile={(student) => setSelectedStudent(student)}
                teachers={teachers}
              />
            )}
          </motion.div>
        )}
      </main>

      {/* الفوتر العام */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-[11px] text-slate-400 font-semibold font-sans mt-auto">
        <p>جميع الحقوق محفوظة © معهد عبد الفتاح عزام بنين {new Date().getFullYear()}</p>
        <p className="mt-1 text-slate-350">منصة الاستعلام الإلكترونية الموحدة لخدمة الطلاب وأولياء الأمور</p>
      </footer>

    </div>
  );
}
