import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { footerLinkGroups, socialLinks } from "@/lib/nav-config";

export function SiteFooter() {
  return (
    <footer className="border-border bg-muted/30 border-t">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-3 lg:grid-cols-[2fr_repeat(3,1fr)]">
        <div className="col-span-2 flex flex-col gap-3 sm:col-span-3 lg:col-span-1">
          <Logo />
          <p className="text-muted-foreground max-w-xs text-sm">
            Nền tảng học trực tuyến giúp bạn tiếp cận kiến thức và kỹ năng mới mọi lúc, mọi nơi.
          </p>
          <div className="flex items-center gap-3 pt-1">
            {socialLinks.map((social) => (
              <Link
                key={social.href}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 items-center justify-center rounded-full transition-colors"
              >
                {social.icon && <social.icon className="size-4" aria-hidden="true" />}
              </Link>
            ))}
          </div>
        </div>

        {footerLinkGroups.map((group) => (
          <div key={group.title} className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{group.title}</h3>
            <ul className="flex flex-col gap-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-border border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-4 py-4 text-sm sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} E-Learning. Bảo lưu mọi quyền.</p>
          <p>Được xây dựng với Next.js &amp; shadcn/ui.</p>
        </div>
      </div>
    </footer>
  );
}
