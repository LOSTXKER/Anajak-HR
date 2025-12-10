/**
 * OTCard Component
 * =============================================
 * Reusable card for showing OT status
 */

"use client";

import { Clock, Play, Timer, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";

interface OTCardProps {
    // Active OT
    activeOT?: {
        id: string;
        actual_start_time: string;
        ot_type?: string;
        ot_rate?: number;
        reason?: string;
    } | null;
    otDuration?: string;

    // Pending OT
    pendingOT?: Array<{
        id: string;
        request_date: string;
        requested_start_time: string;
        requested_end_time: string;
        reason?: string;
    }>;

    // Style
    variant?: "default" | "compact" | "timer";
}

export function OTCard({
    activeOT,
    otDuration = "00:00:00",
    pendingOT = [],
    variant = "default",
}: OTCardProps) {
    const formatTime = (isoTime: string) => {
        const date = new Date(isoTime);
        return date.toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getOTTypeLabel = (type?: string) => {
        switch (type) {
            case "holiday":
                return "OT วันหยุดนักขัตฤกษ์";
            case "weekend":
                return "OT วันหยุดสุดสัปดาห์";
            case "workday":
                return "OT วันทำงานปกติ";
            default:
                return "OT";
        }
    };

    const getOTRateBadge = (rate?: number) => {
        if (!rate) return null;
        const rateText = `${rate}x`;
        const variant = rate >= 2 ? "success" : rate >= 1.5 ? "info" : "default";
        return <Badge variant={variant}>{rateText}</Badge>;
    };

    // Active OT Timer variant
    if (variant === "timer" && activeOT) {
        return (
            <Card className="p-5 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <Timer className="w-5 h-5 text-orange-600 animate-pulse" />
                        </div>
                        <div>
                            <div className="font-semibold text-orange-800">กำลังทำ OT</div>
                            <div className="text-xs text-orange-600">{getOTTypeLabel(activeOT.ot_type)}</div>
                        </div>
                    </div>
                    {getOTRateBadge(activeOT.ot_rate)}
                </div>

                <div className="text-center mb-4">
                    <div className="text-4xl font-bold text-orange-600 tracking-tight">
                        {otDuration}
                    </div>
                    <div className="text-sm text-orange-500 mt-1">
                        เริ่ม {formatTime(activeOT.actual_start_time)}
                    </div>
                </div>

                <Link href={`/ot/end/${activeOT.id}`}>
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        สิ้นสุด OT
                    </Button>
                </Link>
            </Card>
        );
    }

    // Default variant - shows pending OT
    if (pendingOT.length > 0) {
        const nextOT = pendingOT[0];

        return (
            <Card className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        OT ที่รออยู่
                    </h3>
                    <Badge variant="warning">{pendingOT.length} รายการ</Badge>
                </div>

                <div className="bg-white/60 rounded-lg p-3 mb-3">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">เวลาที่ขอ</span>
                        <span className="font-medium">
                            {formatTime(nextOT.requested_start_time)} - {formatTime(nextOT.requested_end_time)}
                        </span>
                    </div>
                    {nextOT.reason && (
                        <div className="text-xs text-gray-500 truncate">
                            {nextOT.reason}
                        </div>
                    )}
                </div>

                <Link href={`/ot/start/${nextOT.id}`}>
                    <Button className="w-full bg-[#0071e3] hover:bg-[#0077ed] text-white">
                        <Play className="w-4 h-4 mr-2" />
                        เริ่มทำ OT
                    </Button>
                </Link>
            </Card>
        );
    }

    // Compact variant
    if (variant === "compact") {
        return (
            <Card className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                            <div className="font-medium text-gray-500">ไม่มี OT</div>
                            <div className="text-xs text-gray-400">วันนี้ไม่มี OT ที่ต้องทำ</div>
                        </div>
                    </div>
                    <Link href="/ot/request">
                        <Button variant="secondary" size="sm">
                            ขอ OT
                        </Button>
                    </Link>
                </div>
            </Card>
        );
    }

    // No OT state
    return null;
}
