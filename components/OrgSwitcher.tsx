"use client";

import { useState, useRef, useEffect } from "react";
import { Building2, ChevronDown, Check } from "lucide-react";
import { useOrg, OrgOption } from "@/lib/hooks/use-org";

export function OrgSwitcher() {
  const { currentOrg, loading, switchOrg, organizations } = useOrg();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="h-8 w-24 bg-[#f5f5f7] rounded-lg animate-pulse" />
    );
  }

  const handleSelect = async (org: OrgOption) => {
    if (org.id === currentOrg.id) {
      setOpen(false);
      return;
    }
    setOpen(false);
    await switchOrg(org);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#1d1d1f] bg-[#f5f5f7] hover:bg-[#e8e8ed] rounded-lg transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Building2 className="w-3.5 h-3.5 text-[#86868b]" />
        <span>{currentOrg.name}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#86868b] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="เลือกองค์กร"
          className="absolute right-0 mt-1 w-44 bg-white border border-[#d2d2d7]/40 rounded-xl shadow-lg overflow-hidden z-50"
        >
          <div className="py-1">
            {organizations.map((org) => (
              <button
                key={org.id}
                role="option"
                aria-selected={org.id === currentOrg.id}
                onClick={() => handleSelect(org)}
                className="w-full flex items-center justify-between px-3 py-2 text-[13px] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
              >
                <span>{org.name}</span>
                {org.id === currentOrg.id && (
                  <Check className="w-3.5 h-3.5 text-[#0071e3]" />
                )}
              </button>
            ))}
          </div>

          {/* Phase B hint: Step 1 only — org isolation not yet active */}
          <div className="border-t border-[#d2d2d7]/30 px-3 py-2">
            <p className="text-[11px] text-[#86868b]">
              ข้อมูลแยกตาม org จะเริ่ม Sun 5/18
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
