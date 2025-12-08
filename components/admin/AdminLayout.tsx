"use client";

import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-[#fbfbfd]">
      <Sidebar />

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Header */}
        {title && (
          <header className="sticky top-0 z-30 apple-glass border-b border-[#e8e8ed]/50 px-6 lg:px-8 py-6">
            <h1 className="text-[28px] font-semibold text-[#1d1d1f]">
              {title}
            </h1>
            {description && (
              <p className="text-[15px] text-[#86868b] mt-1">{description}</p>
            )}
          </header>
        )}

        {/* Page Content */}
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
