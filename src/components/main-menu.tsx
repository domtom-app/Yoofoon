"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Home, Landmark, Lightbulb, LogOut, Menu, Settings, User, X } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Wordmark } from "@/components/wordmark";

export function MainMenu({
  phone,
  signedIn,
  admin,
  avatarUrl,
}: {
  phone: string | null;
  signedIn: boolean;
  admin: boolean;
  avatarUrl: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="القائمة"
            className="size-11 rounded-full"
          />
        }
      >
        <Menu className="size-6" />
      </SheetTrigger>

      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[85%] max-w-sm gap-0 rounded-s-[2rem] p-0"
      >
        <SheetTitle className="sr-only">القائمة</SheetTitle>

        <div className="flex h-20 items-center justify-between px-5">
          <Wordmark className="text-2xl text-primary" />
          <SheetClose
            render={
              <Button
                variant="secondary"
                size="icon"
                aria-label="إغلاق"
                className="size-11 rounded-full"
              />
            }
          >
            <X className="size-5" />
          </SheetClose>
        </div>

        <div className="mx-5 border-t" />

        <div className="flex flex-1 flex-col gap-3 p-5">
          {signedIn && (
            <Button
              render={<Link href="/profile" />}
              nativeButton={false}
              variant="secondary"
              onClick={() => setOpen(false)}
              className="h-14 w-full justify-start gap-3 rounded-2xl text-base font-semibold tabular-nums"
            >
              <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="" fill sizes="36px" className="object-cover" />
                ) : (
                  <User className="size-5 text-primary" />
                )}
              </span>
              {phone ? <span dir="ltr">{phone}</span> : <span>حسابي</span>}
            </Button>
          )}
          {[
            { href: "/", label: "الرئيسية", Icon: Home },
            { href: "/parliament", label: "تصويت البرلمان", Icon: Landmark },
            { href: "/tips", label: "فيد واستفيد", Icon: Lightbulb },
          ].map(({ href, label, Icon }) => (
            <Button
              key={href}
              render={<Link href={href} />}
              nativeButton={false}
              variant="secondary"
              onClick={() => setOpen(false)}
              className="h-14 w-full justify-start gap-3 rounded-2xl text-base font-bold"
            >
              <Icon className="size-5 text-primary" />
              {label}
            </Button>
          ))}
          {admin && (
            <Button
              render={<Link href="/admin" />}
              nativeButton={false}
              variant="secondary"
              onClick={() => setOpen(false)}
              className="h-14 w-full justify-start gap-3 rounded-2xl text-base font-bold"
            >
              <Settings className="size-5 text-primary" />
              الإدارة
            </Button>
          )}
        </div>

        <div className="p-5">
          {signedIn ? (
            <form action={signOut} onSubmit={() => setOpen(false)}>
              <Button
                type="submit"
                variant="secondary"
                className="h-14 w-full justify-start gap-3 rounded-2xl text-base font-bold text-destructive"
              >
                <LogOut className="size-5" />
                خروج
              </Button>
            </form>
          ) : (
            <Button
              render={<Link href="/login" />}
              nativeButton={false}
              className="h-14 w-full rounded-2xl text-base font-bold"
            >
              دخول
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
