/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Inquiry } from '../types';
import { fetchInquiriesFromDB, updateInquiryStatusInDB, deleteInquiryFromDB } from '../firebase';
import { 
  Phone, 
  CheckCircle, 
  Trash2, 
  Clock, 
  Search, 
  MessageSquare, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle2, 
  HelpCircle 
} from 'lucide-react';

export default function InquiriesManager() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'resolved'>('pending');

  // تحميل الاستفسارات من قاعدة البيانات
  const loadInquiries = async () => {
    setIsLoading(true);
    try {
      const data = await fetchInquiriesFromDB();
      setInquiries(data);
    } catch (error) {
      console.error("Error loading inquiries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInquiries();
  }, []);

  // تحديث حالة الطلب (تم التواصل / قيد الانتظار)
  const handleToggleStatus = async (id: string, currentStatus: 'pending' | 'resolved') => {
    const newStatus = currentStatus === 'pending' ? 'resolved' : 'pending';
    try {
      await updateInquiryStatusInDB(id, newStatus);
      // تحديث الحالة محلياً للسرعة
      setInquiries(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    } catch (error) {
      console.error("Error updating inquiry status:", error);
    }
  };

  // حذف الاستفسار نهائياً
  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الاستفسار نهائياً؟")) return;
    try {
      await deleteInquiryFromDB(id);
      setInquiries(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error("Error deleting inquiry:", error);
    }
  };

  // تنسيق التاريخ بصيغة مقروءة وجميلة
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // تصفية الاستفسارات بناءً على التبويب المختار ومربع البحث
  const filteredInquiries = inquiries.filter(item => {
    // فلترة التبويب
    if (activeTab === 'pending' && item.status !== 'pending') return false;
    if (activeTab === 'resolved' && item.status !== 'resolved') return false;

    // فلترة البحث
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const questionMatch = item.question?.toLowerCase().includes(query);
      const phoneMatch = item.phone?.includes(query);
      return questionMatch || phoneMatch;
    }

    return true;
  });

  const pendingCount = inquiries.filter(i => i.status === 'pending').length;

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* هيدر الصفحة */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-850 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-emerald-600" />
            <span>إستفسارات وطلبات التواصل للشات بوت</span>
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            متابعة وإدارة الأسئلة وطلبات أولياء الأمور والزوار الواردة عبر المساعد الافتراضي.
          </p>
        </div>

        <button
          onClick={loadInquiries}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>تحديث الطلبات</span>
        </button>
      </div>

      {/* شريط الإحصائيات الفلترة والتبويبات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* تبويبات التصفية */}
        <div className="bg-white p-1.5 rounded-xl border border-slate-150 flex items-center gap-1 md:col-span-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'pending' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>قيد الانتظار</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
              activeTab === 'pending' ? 'bg-white text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {pendingCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('resolved')}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'resolved' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>تم التواصل والحل</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
              activeTab === 'resolved' ? 'bg-white text-emerald-700' : 'bg-slate-100 text-slate-700'
            }`}>
              {inquiries.filter(i => i.status === 'resolved').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'all' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>الكل ({inquiries.length})</span>
          </button>
        </div>

        {/* مربع البحث التفاعلي */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث بالهاتف أو نص السؤال..."
            className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none text-xs font-bold transition-all bg-white shadow-xs"
          />
          <Search className="absolute right-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
        </div>

      </div>

      {/* عرض الاستفسارات والطلبات */}
      {isLoading && inquiries.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center justify-center text-slate-400 space-y-3">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-emerald-700 border-t-transparent rounded-full mb-1"></div>
          <p className="text-xs font-black">جاري جلب استفسارات الشات بوت...</p>
        </div>
      ) : filteredInquiries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInquiries.map((item) => (
            <div 
              key={item.id} 
              className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                item.status === 'resolved' 
                  ? 'border-slate-100 bg-slate-50/20 opacity-80' 
                  : 'border-emerald-600/10 hover:border-emerald-600/30 shadow-xs hover:shadow-sm'
              }`}
            >
              
              {/* ترويسة كارت الاستفسار */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-start gap-4">
                  {/* شارة الحالة */}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                    item.status === 'resolved' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : 'bg-rose-50 text-rose-700 border-rose-100'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'resolved' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
                    {item.status === 'resolved' ? 'تم التواصل' : 'قيد الانتظار'}
                  </span>

                  {/* وقت الاستفسار */}
                  <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(item.createdAt)}
                  </span>
                </div>

                {/* نص الاستفسار والطلب */}
                <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-150 relative">
                  <div className="absolute top-2.5 left-2.5 text-xs text-slate-250 font-serif">❝</div>
                  <p className="text-xs text-slate-700 font-bold leading-relaxed whitespace-pre-wrap pl-6">
                    {item.question}
                  </p>
                </div>
              </div>

              {/* بيانات التواصل والتحكم بالطلب */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap justify-between items-center gap-3">
                {/* رقم الهاتف للتواصل */}
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4" />
                  </span>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold block">رقم الموبايل للمستعلم</span>
                    <a 
                      href={`tel:${item.phone}`} 
                      className="text-xs font-black text-slate-800 hover:text-emerald-600 transition-colors font-mono"
                    >
                      {item.phone}
                    </a>
                  </div>
                </div>

                {/* أزرار الإجراءات */}
                <div className="flex items-center gap-2">
                  {/* زر تبديل الحالة لتم التواصل */}
                  <button
                    onClick={() => handleToggleStatus(item.id!, item.status)}
                    title={item.status === 'resolved' ? 'إعادة التعيين لقيد الانتظار' : 'تعليم كمقروء ومستجاب'}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      item.status === 'resolved'
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-100'
                    }`}
                  >
                    {item.status === 'resolved' ? (
                      <HelpCircle className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </button>

                  {/* زر حذف الطلب */}
                  <button
                    onClick={() => handleDelete(item.id!)}
                    title="حذف الطلب نهائياً"
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-16 rounded-2xl border border-slate-100 shadow-xs text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center mb-1 text-2xl">
            💬
          </div>
          <h3 className="text-sm font-black text-slate-700">لا توجد طلبات تواصل أو إستفسارات حالياً</h3>
          <p className="text-[11px] text-slate-400 font-semibold max-w-sm leading-relaxed">
            {activeTab === 'pending' 
              ? 'ممتاز! لقد تمت الاستجابة والتواصل مع جميع المستعلميّن الحاليين في المعهد بنجاح.'
              : 'لم يتم استلام أي استفسارات مطابقة لخيارات الفلترة أو كلمات البحث الحالية.'}
          </p>
        </div>
      )}

    </div>
  );
}
