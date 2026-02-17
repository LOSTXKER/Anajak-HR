"use client";

import { Button } from "@/components/ui/Button";
import { Bell } from "lucide-react";
import Link from "next/link";

export function PushSettings() {
  return (
    <div className="mt-8">
      <Link href="/admin/settings/push-test" className="block w-full">
        <Button
          fullWidth
          variant="secondary"
          size="lg"
          icon={<Bell className="w-5 h-5" />}
        >
          ทดสอบ Push Notifications
        </Button>
      </Link>
    </div>
  );
}
