import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CourseRequirements({ requirements }: { requirements: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Yêu cầu đầu vào</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="text-muted-foreground flex flex-col gap-2 text-sm">
          {requirements.map((requirement) => (
            <li key={requirement} className="flex items-start gap-2">
              <span
                className="bg-muted-foreground mt-1.5 size-1 shrink-0 rounded-full"
                aria-hidden="true"
              />
              <span>{requirement}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
