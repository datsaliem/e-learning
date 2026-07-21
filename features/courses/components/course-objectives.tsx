import { CheckCircle2Icon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CourseObjectives({ objectives }: { objectives: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bạn sẽ học được gì</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3 sm:grid-cols-2">
          {objectives.map((objective) => (
            <li key={objective} className="flex items-start gap-2 text-sm">
              <CheckCircle2Icon
                className="text-success mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <span>{objective}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
