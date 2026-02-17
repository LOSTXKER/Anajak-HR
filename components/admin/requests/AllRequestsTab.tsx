"use client";

import { useState } from "react";
import { Search, RefreshCw, ChevronDown, Eye, Check, X, Ban } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import {
  RequestItem,
  RequestType,
  RequestStatus,
  RequestStats,
  typeConfig,
  statusConfig,
} from "@/lib/types/request";

interface AllRequestsTabProps {
  requests: RequestItem[];
  stats: RequestStats;
  loading: boolean;
  processing: boolean;
  dateRange: { start: string; end: string };
  activeType: RequestType | "all";
  activeStatus: RequestStatus;
  searchTerm: string;
  onTypeChange: (type: RequestType | "all") => void;
  onStatusChange: (status: RequestStatus) => void;
  onSearchChange: (term: string) => void;
  onDateRangeChange: (range: { start: string; end: string }) => void;
  onRefresh: () => void;
  onViewDetail: (request: RequestItem) => void;
  onApprove: (request: RequestItem) => void;
  onReject: (request: RequestItem) => void;
  onCancel: (request: RequestItem) => void;
  onEdit: (request: RequestItem) => void;
}

export function AllRequestsTab({
  requests,
  stats,
  loading,
  processing,
  dateRange,
  activeType,
  activeStatus,
  searchTerm,
  onTypeChange,
  onStatusChange,
  onSearchChange,
  onDateRangeChange,
  onRefresh,
  onViewDetail,
  onApprove,
  onReject,
  onCancel,
  onEdit,
}: AllRequestsTabProps) {
  return (
    <div className="space-y-4">
      {/* Type Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => onTypeChange("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
            activeType === "all"
              ? "bg-[#1d1d1f] text-white"
              : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
          }`}
        >
          ทั้งหมด
          <Badge variant="default" className="ml-1">
            {stats.ot + stats.leave + stats.wfh + stats.late + stats.field_work}
          </Badge>
        </button>
        {(Object.keys(typeConfig) as RequestType[]).map((type) => {
          const config = typeConfig[type];
          const Icon = config.icon;
          return (
            <button
              key={type}
              onClick={() => onTypeChange(type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                activeType === type
                  ? `${config.bgColor} ${config.color}`
                  : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {config.label}
              <Badge variant="default" className="ml-1">
                {stats[type]}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
          <input
            type="text"
            placeholder="ค้นหาชื่อพนักงาน..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#f5f5f7] border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={activeStatus}
            onChange={(e) => onStatusChange(e.target.value as RequestStatus)}
            className="appearance-none w-full sm:w-auto pl-4 pr-10 py-2.5 bg-[#f5f5f7] border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3] cursor-pointer"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="pending">รออนุมัติ ({stats.pending})</option>
            <option value="approved">อนุมัติแล้ว ({stats.approved})</option>
            {(activeType === "ot" || activeType === "all") && stats.completed > 0 && (
              <option value="completed">เสร็จสิ้น ({stats.completed})</option>
            )}
            <option value="rejected">ปฏิเสธ ({stats.rejected})</option>
            <option value="cancelled">ยกเลิก ({stats.cancelled})</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b] pointer-events-none" />
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2.5 bg-[#f5f5f7] border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
          <span className="text-[#86868b]">-</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2.5 bg-[#f5f5f7] border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
        </div>

        <Button variant="secondary" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Status Summary Pills */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(statusConfig) as string[]).map((status) => {
          const config = statusConfig[status];
          const count = (stats as any)[status];
          if (typeof count !== "number") return null;
          if (status === "completed" && activeType !== "ot" && activeType !== "all") return null;
          return (
            <button
              key={status}
              onClick={() => onStatusChange(activeStatus === status ? "all" : (status as RequestStatus))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeStatus === status
                  ? `${config.bgColor} ${config.color} ring-2 ring-offset-1`
                  : `${config.bgColor} ${config.color} opacity-60 hover:opacity-100`
              }`}
            >
              {config.label}: {count}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && requests.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-[#86868b]">
            <p className="text-lg font-medium">ไม่พบข้อมูล</p>
            <p className="text-sm mt-1">ลองเปลี่ยนเงื่อนไขการค้นหา</p>
          </div>
        </Card>
      )}

      {/* Request List */}
      {!loading && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((request) => {
            const typeInfo = typeConfig[request.type];
            const statusInfo = statusConfig[request.status] || statusConfig.pending;
            const Icon = typeInfo.icon;
            const isPending = request.status === "pending";
            const canCancel = request.status === "pending" || request.status === "approved";

            return (
              <Card key={`${request.type}-${request.id}`} className="p-4 hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <Avatar name={request.employeeName} size="md" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <h3 className="font-semibold text-[#1d1d1f] truncate">
                          {request.employeeName}
                        </h3>
                        <p className="text-xs text-[#86868b]">{request.employeeEmail}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${typeInfo.bgColor}`}>
                          <Icon className={`w-3 h-3 ${typeInfo.color}`} />
                          <span className={`text-xs font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                        </div>
                        <Badge className={`${statusInfo.bgColor} ${statusInfo.color}`}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-sm font-medium text-[#1d1d1f]">{request.title}</p>
                    <p className="text-xs text-[#86868b]">{request.subtitle}</p>

                    {request.reason && (
                      <p className="text-xs text-[#86868b] mt-1 line-clamp-1">
                        เหตุผล: {request.reason}
                      </p>
                    )}

                    {request.status === "cancelled" && request.cancelReason && (
                      <p className="text-xs text-[#ff3b30] mt-1">
                        เหตุผลยกเลิก: {request.cancelReason}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="text" size="sm" onClick={() => onViewDetail(request)}>
                      <Eye className="w-4 h-4" />
                    </Button>

                    {isPending && (
                      <>
                        <Button
                          variant="text" size="sm"
                          onClick={() => onApprove(request)}
                          disabled={processing}
                          className="text-[#34c759] hover:bg-[#34c759]/10"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="text" size="sm"
                          onClick={() => onReject(request)}
                          disabled={processing}
                          className="text-[#ff3b30] hover:bg-[#ff3b30]/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    )}

                    {isPending && (
                      <Button variant="text" size="sm" onClick={() => onEdit(request)}>
                        <span className="text-xs">แก้ไข</span>
                      </Button>
                    )}

                    {canCancel && (
                      <Button
                        variant="text" size="sm"
                        onClick={() => onCancel(request)}
                        disabled={processing}
                        className="text-[#86868b] hover:bg-[#86868b]/10"
                      >
                        <Ban className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
