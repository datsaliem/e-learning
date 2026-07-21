"use client";

import * as React from "react";
import { toast } from "sonner";
import { LogOutIcon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { safeAction } from "@/lib/safe-action";

export function SignOutButton() {
  const [isPending, startTransition] = React.useTransition();

  function handleSignOut() {
    startTransition(async () => {
      const result = await safeAction(() => signOut());
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button variant="outline" disabled={isPending} onClick={handleSignOut}>
      {isPending ? <Loader2Icon className="animate-spin" /> : <LogOutIcon />}
      Đăng xuất
    </Button>
  );
}
