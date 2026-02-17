"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Check, X, Inbox, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import {
  RequestItem,
  RequestType,
  typeConfig,
} from "@/lib/types/request";

interface PendingStats {
  ot: number;
  leave: number;
  wfh: number;
  late: number;
  field_work: number;
  total: number;
}

interface PendingTabProps {
  requests: RequestItem[];
  stats: PendingStats;
  processingIds: Set<string>;
  loading: boolean;
  activeType: RequestType | "all";
  onTypeChange: (type: RequestType | "all") => void;
  onApprove: (request: RequestItem) => void;
  onReject: (request: RequestItem) => void;
  onRefresh: () => void;
}

export function PendingTab({
  requests,
  stats,
  processingIds,
  loading,
  activeType,
  onTypeChange,
  onApprove,
  onReject,
  onRefresh,
}: PendingTabProps) {
  return (
    <div className="space-y-4">
      {/* Type Filter Pills */}
      <div className="flex items-center gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
          <button
            onClick={() => onTypeChange("all")}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap transition-all ${
              activeType === "all"
                ? "bg-[#1d1d1f] text-white shadow-lg"
                : "bg-white text-[#1d1d1f] border border-[#e8e8ed] hover:border-[#1d1d1f]"
            }`}
          >
            ทั้งหมด
            {stats.total > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeType === "all" ? "bg-white/20" : "bg-[#ff3b30] text-white"
              }`}>
                {stats.total}
              </span>
            )}
          </button>

          {(Object.keys(typeConfig) as RequestType[]).map((type) => {
            const config = typeConfig[type];
            const count = stats[type];
            const Icon = config.icon;
            if (count === 0) return null;

            return (
              <button
                key={type}
                onClick={() => onTypeChange(type)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeType === type
                    ? `${config.bgColor} ${config.color} shadow-sm`
                    : "bg-white text-[#6e6e73] border border-[#e8e8ed] hover:border-[#d2d2d7]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {config.label}
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeType === type ? "bg-white/50" : "bg-[#f5f5f7]"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-xl text-[#86868b] hover:bg-[#f5f5f7] transition-colors flex-shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && requests.length === 0 && (
        <Card elevated className="!py-16">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#34c759]/10 rounded-full flex items-center justify-center">
              <Inbox className="w-8 h-8 text-[#34c759]" />
            </div>
            <h3 className="text-lg font-semibold text-[#1d1d1f] mb-1">
              ไม่มีคำขอรออนุมัติ
            </h3>
            <p className="text-sm text-[#86868b]">
              คุณจัดการคำขอทั้งหมดเรียบร้อยแล้ว
            </p>
          </div>
        </Card>
      )}

      {/* Request Cards */}
      {!loading && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((request) => {
            const config = typeConfig[request.type];
            const Icon = config.icon;
            const key = `${request.type}_${request.id}`;
            const isProcessing = processingIds.has(key);

            return (
              <Card
                key={key}
                elevated
                className="!p-0 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="flex items-stretch">
                  {/* Color strip */}
                  <div className={`w-1.5 ${config.bgColor}`} />

                  <div className="flex-1 p-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={request.employeeName} size="md" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-[15px] font-semibold text-[#1d1d1f] truncate">
                            {request.employeeName}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${config.bgColor} ${config.color}`}
                          >
                            <Icon className="w-3 h-3" />
                            {config.label}
                          </span>
                        </div>

                        <p className="text-[14px] font-medium text-[#1d1d1f]">
                          {request.title}
                        </p>
                        <p className="text-[13px] text-[#86868b]">
                          {request.subtitle}
                        </p>

                        {request.reason && (
                          <p className="text-[12px] text-[#6e6e73] mt-1.5 line-clamp-2 bg-[#f5f5f7] rounded-lg px-2.5 py-1.5">
                            {request.reason}
                          </p>
                        )}

                        <p className="text-[11px] text-[#86868b] mt-2">
                          {formatDistanceToNow(new Date(request.createdAt), {
                            addSuffix: true,
                            locale: th,
                          })}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 ml-2">
                        <button
                          onClick={() => onApprove(request)}
                          disabled={isProcessing}
                          className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#34c759] text-white hover:bg-[#30b350] active:scale-95 transition-all disabled:opacity-50"
                          title="อนุมัติ"
                        >
                          {isProcessing ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Check className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => onReject(request)}
                          disabled={isProcessing}
                          className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#ff3b30] text-white hover:bg-[#e0352b] active:scale-95 transition-all disabled:opacity-50"
                          title="ปฏิเสธ"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Floating Stats Footer */}
      {stats.total > 0 && !loading && (
        <div className="fixed bottom-20 left-0 right-0 md:bottom-6 md:left-auto md:right-6 px-4 md:px-0 z-10">
          <Card
            elevated
            className="!p-3 !rounded-2xl shadow-xl border border-[#e8e8ed] md:w-auto inline-flex items-center gap-4 mx-auto md:mx-0"
          >
            <span className="text-sm text-[#86868b]">รอดำเนินการ</span>
            <span className="text-lg font-bold text-[#1d1d1f]">{stats.total}</span>
            <div className="flex items-center gap-1">
              {stats.ot > 0 && <span className="w-2 h-2 rounded-full bg-[#ff9500]" title={`OT: ${stats.ot}`} />}
              {stats.leave > 0 && <span className="w-2 h-2 rounded-full bg-[#0071e3]" title={`ลา: ${stats.leave}`} />}
              {stats.wfh > 0 && <span className="w-2 h-2 rounded-full bg-[#af52de]" title={`WFH: ${stats.wfh}`} />}
              {stats.late > 0 && <span className="w-2 h-2 rounded-full bg-[#ff3b30]" title={`มาสาย: ${stats.late}`} />}
              {stats.field_work > 0 && <span className="w-2 h-2 rounded-full bg-[#34c759]" title={`งานนอกสถานที่: ${stats.field_work}`} />}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
