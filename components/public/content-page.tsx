import { AlertTriangleIcon, ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicPageContent } from "@/lib/public-page-content";

export function ContentPage({ content }: { content: PublicPageContent }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:py-14">
      <header className="max-w-3xl">
        <p className="text-primary text-sm font-medium">{content.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{content.title}</h1>
        <p className="text-muted-foreground mt-3 text-base sm:text-lg">{content.description}</p>
      </header>

      {content.notice && (
        <div
          role="note"
          className="border-warning/30 bg-warning/10 text-foreground flex gap-3 rounded-xl border p-4 text-sm"
        >
          <AlertTriangleIcon className="text-warning mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>{content.notice}</p>
        </div>
      )}

      <div className="grid gap-4">
        {content.sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.items && (
                <ul className="text-muted-foreground list-disc space-y-2 pl-5">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href="/" />}
        className="self-start"
      >
        <ArrowLeftIcon aria-hidden="true" />
        Về trang chủ
      </Button>
    </div>
  );
}
