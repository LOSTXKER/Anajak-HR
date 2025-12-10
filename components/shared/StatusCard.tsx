/**
 * StatusCard Component
 * =============================================
 * Reusable card for showing attendance/work status
 */

"use client";

import { Clock, CheckCircle2, LogOut, Timer, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface StatusCardProps {
    // Status data
    isCheckedIn: boolean;
    isCheckedOut: boolean;
    clockInTime?: string | null;
    clockOutTime?: string | null;
    workDuration: string;
    workProgress: number;
    timeRemaining?: string | null;
    isOvertime?: boolean;
    isLate?: boolean;
    lateMinutes?: number;

    // Actions
    showActions?: boolean;
    onCheckIn?: () => void;
    onCheckOut?: () => void;

    // Style
    variant?: "default" | "compact";
}

export function StatusCard({
    isCheckedIn,
    isCheckedOut,
    clockInTime,
    clockOutTime,
    workDuration,
    workProgress,
    timeRemaining,
    isOvertime = false,
    isLate = false,
    lateMinutes = 0,
    showActions = true,
    onCheckIn,
    onCheckOut,
    variant = "default",
}: StatusCardProps) {
    const formatTime = (isoTime: string | null | undefined) => {
        if (!isoTime) return "--:--";
        const date = new Date(isoTime);
        return date.toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getStatusBadge = () => {
        if (isCheckedOut) {
            return <Badge variant="success">เลิกงานแล้ว</Badge>;
        }
        if (isCheckedIn) {
            return <Badge variant="info">กำลังทำงาน</Badge>;
        }
        return <Badge variant="warning">ยังไม่ได้เช็คอิน</Badge>;
    };

    if (variant === "compact") {
        return (
            <Card className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCheckedIn ? "bg-green-100" : "bg-gray-100"
                            }`}>
                            {isCheckedIn ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                                <Clock className="w-5 h-5 text-gray-400" />
                            )}
                        </div>
                        <div>
                            <div className="font-medium">{workDuration}</div>
                            <div className="text-xs text-gray-500">
                                {isCheckedIn ? `เข้างาน ${formatTime(clockInTime)}` : "ยังไม่เข้างาน"}
                            </div>
                        </div>
                    </div>
                    {getStatusBadge()}
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#0071e3]" />
                    สถานะวันนี้
                </h3>
                {getStatusBadge()}
            </div>

            {/* Work Timer */}
            <div className="text-center mb-4">
                <div className={`text-4xl font-bold tracking-tight ${isOvertime ? "text-orange-500" : "text-gray-900"
                    }`}>
                    {workDuration}
                </div>
                {timeRemaining && (
                    <div className={`text-sm mt-1 ${isOvertime ? "text-orange-500" : "text-gray-500"}`}>
                        {timeRemaining}
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ${isOvertime ? "bg-orange-500" : "bg-[#0071e3]"
                            }`}
                        style={{ width: `${Math.min(workProgress, 100)}%` }}
                    />
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>0 ชม.</span>
                    <span>8 ชม.</span>
                </div>
            </div>

            {/* Time Details */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">เข้างาน</div>
                    <div className="font-semibold text-gray-900">{formatTime(clockInTime)}</div>
                    {isLate && lateMinutes > 0 && (
                        <div className="text-xs text-red-500 mt-1 flex items-center justify-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            สาย {lateMinutes} นาที
                        </div>
                    )}
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">เลิกงาน</div>
                    <div className="font-semibold text-gray-900">{formatTime(clockOutTime)}</div>
                </div>
            </div>

            {/* Actions */}
            {showActions && (
                <div className="flex gap-2">
                    {!isCheckedIn && (
                        <Link href="/checkin" className="flex-1">
                            <Button className="w-full bg-[#0071e3] hover:bg-[#0077ed] text-white">
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                เช็คอิน
                            </Button>
                        </Link>
                    )}
                    {isCheckedIn && !isCheckedOut && (
                        <Link href="/checkout" className="flex-1">
                            <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white">
                                <LogOut className="w-4 h-4 mr-2" />
                                เช็คเอาท์
                            </Button>
                        </Link>
                    )}
                </div>
            )}
        </Card>
    );
}
