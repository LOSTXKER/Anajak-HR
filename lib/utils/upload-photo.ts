import { supabase } from "@/lib/supabase/client";

/**
 * แปลง base64 data URL เป็น Blob
 */
function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * อัปโหลดรูปถ่ายการเข้า-ออกงานไปที่ Supabase Storage
 * @param dataURL - base64 data URL ของรูปภาพ
 * @param employeeId - ID ของพนักงาน
 * @param type - ประเภท 'checkin' หรือ 'checkout'
 * @returns URL ของรูปภาพที่อัปโหลดแล้ว หรือ null ถ้าล้มเหลว
 */
export async function uploadAttendancePhoto(
  dataURL: string,
  employeeId: string,
  type: "checkin" | "checkout"
): Promise<string | null> {
  try {
    if (!dataURL || !dataURL.startsWith("data:image")) {
      console.error("Invalid data URL");
      return null;
    }

    // แปลง data URL เป็น Blob
    const blob = dataURLtoBlob(dataURL);

    // สร้างชื่อไฟล์: employeeId/YYYY-MM-DD_HH-mm-ss_type.jpg
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-mm-ss
    const fileName = `${employeeId}/${dateStr}_${timeStr}_${type}.jpg`;

    // อัปโหลดไปที่ Supabase Storage
    const { data, error } = await supabase.storage
      .from("attendance-photos")
      .upload(fileName, blob, {
        contentType: "image/jpeg",
        upsert: false, // ไม่ให้เขียนทับไฟล์เก่า
      });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    // ดึง public URL
    const { data: urlData } = supabase.storage
      .from("attendance-photos")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Error uploading photo:", error);
    return null;
  }
}

/**
 * ลบรูปถ่ายการเข้า-ออกงานจาก Supabase Storage
 * @param photoUrl - URL ของรูปภาพ
 * @returns true ถ้าลบสำเร็จ, false ถ้าล้มเหลว
 */
export async function deleteAttendancePhoto(photoUrl: string): Promise<boolean> {
  try {
    if (!photoUrl || !photoUrl.includes("attendance-photos")) {
      return false;
    }

    // แยก path ออกจาก URL
    const urlObj = new URL(photoUrl);
    const pathParts = urlObj.pathname.split("/attendance-photos/");
    if (pathParts.length < 2) {
      return false;
    }
    const filePath = pathParts[1];

    // ลบไฟล์
    const { error } = await supabase.storage
      .from("attendance-photos")
      .remove([filePath]);

    if (error) {
      console.error("Delete error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting photo:", error);
    return false;
  }
}

