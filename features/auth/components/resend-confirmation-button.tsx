"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { resendConfirmationEmail } from "@/features/auth/actions";
import { safeAction } from "@/lib/safe-action";

export function ResendConfirmationButton({ email }: { email: string }) {
  const [isPending, startTransition] = React.useTransition();

  function handleResend() {
    startTransition(async () => {
      const result = await safeAction(() => resendConfirmationEmail(email));
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã gửi lại email xác nhận.");
      }
    });
  }

  return (
    <Button variant="outline" onClick={handleResend} disabled={isPending}>
      {isPending && <Loader2Icon className="animate-spin" />}
      Gửi lại email xác nhận
    </Button>
  );
}
