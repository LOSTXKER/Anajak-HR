/**
 * คำนวณระยะทางระหว่างสองจุดพิกัด GPS ด้วย Haversine formula
 * @param lat1 - Latitude จุดที่ 1
 * @param lng1 - Longitude จุดที่ 1
 * @param lat2 - Latitude จุดที่ 2
 * @param lng2 - Longitude จุดที่ 2
 * @returns ระยะทางเป็นเมตร
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // รัศมีของโลกเป็นเมตร
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance); // ปัดเศษเป็นเมตร
}

/**
 * แปลง degrees เป็น radians
 */
function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * ตรวจสอบว่าตำแหน่งปัจจุบันอยู่ในรัศมีที่กำหนดหรือไม่
 * @param currentLat - Latitude ปัจจุบัน
 * @param currentLng - Longitude ปัจจุบัน
 * @param targetLat - Latitude เป้าหมาย (สาขา)
 * @param targetLng - Longitude เป้าหมาย (สาขา)
 * @param radiusMeters - รัศมีที่อนุญาต (เมตร)
 * @returns { inRadius: boolean, distance: number }
 */
export function isWithinRadius(
  currentLat: number,
  currentLng: number,
  targetLat: number,
  targetLng: number,
  radiusMeters: number
): { inRadius: boolean; distance: number } {
  const distance = calculateDistance(currentLat, currentLng, targetLat, targetLng);
  return {
    inRadius: distance <= radiusMeters,
    distance,
  };
}

/**
 * Format ระยะทางให้อ่านง่าย
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} เมตร`;
  }
  return `${(meters / 1000).toFixed(1)} กม.`;
}

