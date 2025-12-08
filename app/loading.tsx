export default function Loading() {
  return (
    <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-[15px] text-[#86868b]">กำลังโหลด...</p>
      </div>
    </div>
  );
}
