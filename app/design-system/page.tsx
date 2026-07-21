"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const colorTokens = [
  { name: "background", label: "Background" },
  { name: "foreground", label: "Foreground" },
  { name: "primary", label: "Primary" },
  { name: "secondary", label: "Secondary" },
  { name: "muted", label: "Muted" },
  { name: "success", label: "Success" },
  { name: "warning", label: "Warning" },
  { name: "destructive", label: "Destructive" },
] as const;

function ThemeToggle() {
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <Button variant="outline" onClick={() => setDark((v) => !v)}>
      {dark ? "Chế độ sáng" : "Chế độ tối"}
    </Button>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 py-12">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Design System</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Bộ token màu sắc và component dùng chung cho nền tảng E-Learning.
          </p>
        </div>
        <ThemeToggle />
      </div>

      <Section
        title="Màu sắc"
        description="CSS variables trong app/globals.css, tự động đổi giá trị theo class .dark trên thẻ html."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {colorTokens.map((token) => (
            <div key={token.name} className="flex flex-col gap-2">
              <div
                className="border-border h-16 w-full rounded-lg border"
                style={{ backgroundColor: `var(--${token.name})` }}
              />
              <div className="text-sm font-medium">{token.label}</div>
              <div className="text-muted-foreground font-mono text-xs">--{token.name}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Button" description="Các biến thể và kích thước.">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="success">Success</Button>
          <Button variant="warning">Warning</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="xs">Extra small</Button>
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Badge" description="Dùng cho trạng thái khoá học, bài kiểm tra...">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Đã hoàn thành</Badge>
          <Badge variant="warning">Sắp hết hạn</Badge>
          <Badge variant="destructive">Quá hạn</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </Section>

      <Section
        title="Form controls"
        description="Input, Select, Textarea đều hỗ trợ trạng thái lỗi qua aria-invalid."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ds-email">Email</Label>
            <Input id="ds-email" type="email" placeholder="ban@vidu.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ds-email-invalid">Email (lỗi)</Label>
            <Input id="ds-email-invalid" type="email" defaultValue="khong-hop-le" aria-invalid />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ds-level">Cấp độ khoá học</Label>
            <Select defaultValue="beginner">
              <SelectTrigger id="ds-level" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Cơ bản</SelectItem>
                <SelectItem value="intermediate">Trung cấp</SelectItem>
                <SelectItem value="advanced">Nâng cao</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ds-note">Ghi chú</Label>
            <Textarea id="ds-note" placeholder="Nhập nội dung..." />
          </div>
        </div>
      </Section>

      <Section title="Card">
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Nhập môn React</CardTitle>
            <CardDescription>12 bài học · 4 giờ</CardDescription>
            <CardAction>
              <Badge variant="success">Đang học</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Khoá học giúp bạn nắm vững kiến thức nền tảng về React và hệ sinh thái xung quanh.
            </p>
          </CardContent>
          <CardFooter>
            <Button size="sm">Tiếp tục học</Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="Dialog và Dropdown">
        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>Mở hộp thoại</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Xác nhận nộp bài</DialogTitle>
                <DialogDescription>
                  Bạn có chắc muốn nộp bài kiểm tra? Hành động này không thể hoàn tác.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline">Huỷ</Button>
                <Button>Nộp bài</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              Tuỳ chọn
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Khoá học</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Xem chi tiết</DropdownMenuItem>
                <DropdownMenuItem>Chia sẻ</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">Huỷ đăng ký</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Section>

      <Section title="Skeleton" description="Trạng thái loading cho danh sách/thẻ khoá học.">
        <div className="flex max-w-sm flex-col gap-3">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </Section>
    </div>
  );
}
