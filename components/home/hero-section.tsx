import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SearchForm } from "@/components/layout/search-form";

const STATS = [
  { label: "Khoá học", value: "350+" },
  { label: "Học viên", value: "45.000+" },
  { label: "Giảng viên", value: "80+" },
];

export function HeroSection() {
  return (
    <section className="border-border bg-muted/30 border-b">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:py-24">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Học kỹ năng mới, tiến xa hơn trong sự nghiệp
        </h1>
        <p className="text-muted-foreground max-w-xl text-lg text-balance">
          Hàng trăm khoá học chất lượng từ giảng viên giàu kinh nghiệm — học mọi lúc, mọi nơi, theo
          tốc độ của riêng bạn.
        </p>

        <SearchForm
          id="hero-course-search"
          className="max-w-xl"
          inputClassName="h-11"
          showSubmitButton
        />

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
            Bắt đầu miễn phí
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={<Link href="/courses" />}
          >
            Khám phá khoá học
          </Button>
        </div>

        <dl className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 pt-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-1.5">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="text-xl font-semibold">{stat.value}</dd>
              <span className="text-muted-foreground text-sm">{stat.label}</span>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
