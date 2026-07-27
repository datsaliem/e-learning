import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SearchCheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { certificateCodeSchema } from "@/features/certificates/schemas";

export const metadata: Metadata = {
  title: "Xác minh chứng chỉ",
  description: "Kiểm tra tính hợp lệ của chứng chỉ E-Learning bằng mã xác thực.",
  alternates: {
    canonical: "/certificates/verify",
  },
};

export default async function VerifyCertificatePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  const query = await searchParams;
  const submittedCode = typeof query.code === "string" ? query.code : "";
  const parsedCode = submittedCode ? certificateCodeSchema.safeParse(submittedCode) : null;

  if (parsedCode?.success) {
    redirect(`/certificates/verify/${encodeURIComponent(parsedCode.data)}`);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <div className="bg-primary/10 text-primary mx-auto mb-3 flex size-12 items-center justify-center rounded-full">
            <SearchCheckIcon className="size-6" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">Xác minh chứng chỉ</CardTitle>
          <CardDescription>
            Nhập mã in trên chứng chỉ để kiểm tra thông tin và trạng thái hợp lệ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action="/certificates/verify"
            method="get"
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="flex-1">
              <label htmlFor="certificate-code" className="sr-only">
                Mã chứng chỉ
              </label>
              <Input
                id="certificate-code"
                name="code"
                defaultValue={submittedCode}
                placeholder="EL-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-describedby={
                  parsedCode?.success === false
                    ? "certificate-code-help certificate-code-error"
                    : "certificate-code-help"
                }
                aria-invalid={parsedCode?.success === false || undefined}
                required
              />
              <p id="certificate-code-help" className="text-muted-foreground mt-1.5 text-xs">
                Mã không phân biệt chữ hoa và chữ thường.
              </p>
              {parsedCode?.success === false && (
                <p
                  id="certificate-code-error"
                  className="text-destructive mt-1 text-xs"
                  role="alert"
                >
                  {parsedCode.error.issues[0]?.message}
                </p>
              )}
            </div>
            <Button type="submit" className="sm:self-start">
              Kiểm tra
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
