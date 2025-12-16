"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { BottomNav } from "@/components/BottomNav";
import { Lock, Shield, Eye, EyeOff, Database, Trash2 } from "lucide-react";

function PrivacySettingsContent() {
  return (
    <div className="min-h-screen bg-[#fbfbfd] pb-20 pt-safe">
      <main className="max-w-[600px] mx-auto px-4 pt-6 pb-4">
        {/* Page Title */}
        <h1 className="text-[32px] font-bold text-[#1d1d1f] mb-6">ความเป็นส่วนตัว</h1>

        {/* Privacy Info */}
        <Card elevated className="mb-6 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-[#5856d6]/10 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#5856d6]" />
            </div>
            <div>
              <h2 className="text-[20px] font-bold text-[#1d1d1f]">
                ข้อมูลของคุณปลอดภัย
              </h2>
              <p className="text-[14px] text-[#86868b] mt-1">
                เราใช้การเข้ารหัสระดับสูงเพื่อปกป้องข้อมูลของคุณ
              </p>
            </div>
          </div>
        </Card>

        {/* Privacy Settings */}
        <div className="space-y-3">
          <Card elevated className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
                <Lock className="w-6 h-6 text-[#0071e3]" />
              </div>
              <div className="flex-1">
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                  การเข้ารหัสข้อมูล
                </h3>
                <p className="text-[14px] text-[#86868b] mt-1">
                  ข้อมูลทั้งหมดถูกเข้ารหัสด้วย SSL/TLS
                </p>
              </div>
            </div>
          </Card>

          <Card elevated className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#34c759]/10 rounded-xl flex items-center justify-center">
                <Eye className="w-6 h-6 text-[#34c759]" />
              </div>
              <div className="flex-1">
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                  การเข้าถึงข้อมูล
                </h3>
                <p className="text-[14px] text-[#86868b] mt-1">
                  เฉพาะคุณและผู้ดูแลระบบเท่านั้นที่เห็นข้อมูลของคุณ
                </p>
              </div>
            </div>
          </Card>

          <Card elevated className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
                <Database className="w-6 h-6 text-[#ff9500]" />
              </div>
              <div className="flex-1">
                <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                  การจัดเก็บข้อมูล
                </h3>
                <p className="text-[14px] text-[#86868b] mt-1">
                  ข้อมูลถูกเก็บบน Server ที่ปลอดภัย
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Contact Admin */}
        <div className="mt-8 p-4 bg-[#f5f5f7] rounded-xl">
          <p className="text-[13px] text-[#86868b] text-center">
            หากมีข้อสงสัยเกี่ยวกับความเป็นส่วนตัว<br />
            กรุณาติดต่อผู้ดูแลระบบ
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

export default function PrivacySettingsPage() {
  return (
    <ProtectedRoute>
      <PrivacySettingsContent />
    </ProtectedRoute>
  );
}

