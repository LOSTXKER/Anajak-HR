# ระบบยกเลิกการอนุมัติ (Cancel System)

## 📋 ภาพรวม

ระบบยกเลิกการอนุมัติช่วยให้ Admin สามารถยกเลิกคำขอที่อนุมัติไปแล้วได้ โดยเก็บ audit trail ครบถ้วน

### ✅ คุณสมบัติ

- ✅ ยกเลิกคำขอที่อนุมัติแล้ว (OT, Leave, WFH, Late, Field Work)
- ✅ ระบุเหตุผลการยกเลิกได้
- ✅ เก็บประวัติใครยกเลิก เมื่อไร
- ✅ แสดง badge "ยกเลิกแล้ว" สีแดง
- ✅ ไม่ลบข้อมูลเดิม (Audit Trail)

---

## 🚀 การติดตั้ง

### 1. รัน Migration SQL

```bash
# ใน Supabase SQL Editor
# รันไฟล์: supabase/add-cancel-functionality.sql
```

สิ่งที่จะถูกเพิ่ม:
- เพิ่มสถานะ `cancelled` ให้ทุก request table
- เพิ่มฟิลด์: `cancelled_by`, `cancelled_at`, `cancel_reason`
- เพิ่ม indexes สำหรับ performance

### 2. ตรวจสอบว่า Migration สำเร็จ

```sql
-- ตรวจสอบว่ามี cancelled status
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'ot_requests' 
AND column_name IN ('cancelled_by', 'cancelled_at', 'cancel_reason');
```

---

## 💻 วิธีใช้งานใน Code

### Import Components

```typescript
import { CancelModal } from "@/components/ui/CancelModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { XCircle } from "lucide-react";
```

### State Management

```typescript
const [showCancelModal, setShowCancelModal] = useState(false);
const [selectedRequest, setSelectedRequest] = useState<any>(null);
```

### Function สำหรับยกเลิก

```typescript
const handleCancelRequest = async (requestId: string, type: "ot" | "leave" | "wfh" | "late") => {
  setSelectedRequest({ id: requestId, type });
  setShowCancelModal(true);
};

const confirmCancel = async (reason: string) => {
  if (!selectedRequest || !currentAdmin) return;

  const { type, id } = selectedRequest;
  const tableName = `${type}_requests`; // ot_requests, leave_requests, etc.

  const { error } = await supabase
    .from(tableName)
    .update({
      status: "cancelled",
      cancelled_by: currentAdmin.id,
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason,
    })
    .eq("id", id);

  if (error) {
    toast.error("เกิดข้อผิดพลาด", error.message);
    return;
  }

  toast.success("ยกเลิกสำเร็จ", "ยกเลิกการอนุมัติเรียบร้อยแล้ว");
  
  // Refresh data
  fetchRequests();
  
  setShowCancelModal(false);
  setSelectedRequest(null);
};
```

### UI - ปุ่มยกเลิก

```tsx
{/* แสดงปุ่มเฉพาะคำขอที่ approved */}
{request.status === "approved" && (
  <Button
    variant="danger"
    size="sm"
    onClick={() => handleCancelRequest(request.id, request.type)}
  >
    <XCircle className="w-4 h-4" />
    ยกเลิกการอนุมัติ
  </Button>
)}
```

### UI - Modal

```tsx
<CancelModal
  isOpen={showCancelModal}
  onClose={() => {
    setShowCancelModal(false);
    setSelectedRequest(null);
  }}
  onConfirm={confirmCancel}
  title="ยกเลิกการอนุมัติ"
  description={`คุณต้องการยกเลิกการอนุมัติ${selectedRequest?.type}หรือไม่?`}
  requestType={selectedRequest?.type}
/>
```

### UI - แสดงสถานะ

```tsx
{/* Badge Component */}
{request.status === "cancelled" && (
  <Badge variant="danger">
    <XCircle className="w-3 h-3" />
    ยกเลิกแล้ว
  </Badge>
)}

{/* แสดงข้อมูลการยกเลิก */}
{request.status === "cancelled" && request.cancel_reason && (
  <div className="mt-2 p-3 bg-[#ff3b30]/10 rounded-lg">
    <p className="text-[13px] text-[#ff3b30] font-medium">เหตุผลการยกเลิก:</p>
    <p className="text-[13px] text-[#86868b] mt-1">{request.cancel_reason}</p>
    {request.cancelled_at && (
      <p className="text-[12px] text-[#86868b] mt-1">
        ยกเลิกเมื่อ: {format(new Date(request.cancelled_at), "d MMM yyyy HH:mm", { locale: th })}
      </p>
    )}
  </div>
)}
```

---

## 📊 การแสดงผลใน Badge

### Badge Variants

```typescript
// ใช้ Badge component ที่มีอยู่แล้ว
<Badge variant="warning">รออนุมัติ</Badge>      // pending (สีเหลือง)
<Badge variant="success">อนุมัติแล้ว</Badge>    // approved (สีเขียว)
<Badge variant="danger">ไม่อนุมัติ</Badge>      // rejected (สีแดง)
<Badge variant="danger">ยกเลิกแล้ว</Badge>     // cancelled (สีแดงเข้ม)
<Badge variant="secondary">เสร็จสิ้น</Badge>   // completed (สีเทา)
```

### อัพเดท Badge Component (ถ้าจำเป็น)

```typescript
// components/ui/Badge.tsx
const getStatusColor = (status: string) => {
  switch (status) {
    case "pending": return "warning";
    case "approved": return "success";
    case "rejected": return "danger";
    case "cancelled": return "danger"; // เพิ่มบรรทัดนี้
    case "completed": return "secondary";
    default: return "secondary";
  }
};
```

---

## 🎯 ตัวอย่างการใช้งานแบบเต็ม

### หน้า Admin OT Approvals

```tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { CancelModal } from "@/components/ui/CancelModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { XCircle, CheckCircle } from "lucide-react";

export default function OTApprovalsPage() {
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();
  
  const [requests, setRequests] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filter, setFilter] = useState<"all" | "approved" | "cancelled">("all");

  // Fetch OT requests
  const fetchRequests = async () => {
    let query = supabase
      .from("ot_requests")
      .select("*, employee:employees!employee_id(id, name, email)")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data, error } = await query;
    if (!error) setRequests(data || []);
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  // Cancel handler
  const handleCancel = async (reason: string) => {
    if (!selectedRequest || !currentAdmin) return;

    const { error } = await supabase
      .from("ot_requests")
      .update({
        status: "cancelled",
        cancelled_by: currentAdmin.id,
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason,
      })
      .eq("id", selectedRequest.id);

    if (error) {
      toast.error("เกิดข้อผิดพลาด", error.message);
      return;
    }

    toast.success("ยกเลิกสำเร็จ", "ยกเลิกการอนุมัติ OT เรียบร้อยแล้ว");
    fetchRequests();
    setShowCancelModal(false);
    setSelectedRequest(null);
  };

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilter("all")}>ทั้งหมด</button>
        <button onClick={() => setFilter("approved")}>อนุมัติแล้ว</button>
        <button onClick={() => setFilter("cancelled")}>ยกเลิกแล้ว</button>
      </div>

      {/* Request List */}
      {requests.map((req) => (
        <div key={req.id} className="p-4 border rounded-lg mb-3">
          <div className="flex justify-between items-start">
            <div>
              <h3>{req.employee?.name}</h3>
              <p>{req.request_date}</p>
              <Badge variant={req.status === "cancelled" ? "danger" : "success"}>
                {req.status === "cancelled" ? "ยกเลิกแล้ว" : "อนุมัติแล้ว"}
              </Badge>
            </div>

            {req.status === "approved" && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setSelectedRequest(req);
                  setShowCancelModal(true);
                }}
              >
                <XCircle className="w-4 h-4" />
                ยกเลิก
              </Button>
            )}
          </div>

          {req.status === "cancelled" && req.cancel_reason && (
            <div className="mt-3 p-3 bg-red-50 rounded">
              <p className="text-sm text-red-600">เหตุผล: {req.cancel_reason}</p>
            </div>
          )}
        </div>
      ))}

      {/* Cancel Modal */}
      <CancelModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setSelectedRequest(null);
        }}
        onConfirm={handleCancel}
        title="ยกเลิกการอนุมัติ OT"
        requestType="OT"
      />
    </div>
  );
}
```

---

## 📝 Checklist การใช้งาน

### สำหรับ Admin

- [ ] รัน Migration SQL (`add-cancel-functionality.sql`)
- [ ] ตรวจสอบว่า database มี columns ที่จำเป็น
- [ ] Import `CancelModal` component
- [ ] เพิ่มปุ่ม "ยกเลิก" ในหน้าที่เหมาะสม
- [ ] เพิ่ม Badge แสดงสถานะ "ยกเลิกแล้ว"
- [ ] ทดสอบการยกเลิกและดูว่า audit trail บันทึกถูกต้อง

### สำหรับผู้ใช้

- ✅ ไม่ต้องทำอะไร - ระบบพร้อมใช้งานทันที
- ✅ จะได้รับแจ้งเตือนผ่าน LINE (ถ้าเปิดใช้งาน)

---

## 🔍 การตรวจสอบ Audit Trail

### Query ดูประวัติการยกเลิก

```sql
-- ดูคำขอที่ถูกยกเลิก
SELECT 
  r.id,
  e.name as employee_name,
  r.request_date,
  r.status,
  r.cancel_reason,
  r.cancelled_at,
  admin.name as cancelled_by_name
FROM ot_requests r
JOIN employees e ON e.id = r.employee_id
LEFT JOIN employees admin ON admin.id = r.cancelled_by
WHERE r.status = 'cancelled'
ORDER BY r.cancelled_at DESC;
```

### Query สรุปจำนวนการยกเลิก

```sql
-- สรุปจำนวนคำขอที่ยกเลิกแต่ละประเภท
SELECT 
  'OT' as type,
  COUNT(*) as cancelled_count
FROM ot_requests 
WHERE status = 'cancelled'
UNION ALL
SELECT 
  'Leave' as type,
  COUNT(*) as cancelled_count
FROM leave_requests 
WHERE status = 'cancelled'
UNION ALL
SELECT 
  'WFH' as type,
  COUNT(*) as cancelled_count
FROM wfh_requests 
WHERE status = 'cancelled';
```

---

## ⚠️ หมายเหตุสำคัญ

1. **ไม่สามารถยกเลิกคำขอที่ Completed แล้ว**: เพราะมีผลกับ payroll
2. **Audit Trail**: ข้อมูลทั้งหมดถูกเก็บไว้ ไม่ลบ
3. **Permissions**: เฉพาะ Admin และ Supervisor เท่านั้นที่ยกเลิกได้
4. **LINE Notification**: ต้องตั้งค่า LINE API ก่อน (optional)

---

## 📚 Related Files

- Migration: `supabase/add-cancel-functionality.sql`
- Component: `components/ui/CancelModal.tsx`
- Types: `lib/types/index.ts`
- Documentation: `docs/CANCEL_SYSTEM_USAGE.md`

---

สร้างโดย Anajak HR System Team 💙

