import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-ink text-white md:items-center md:justify-center md:p-8">
      <header className="flex items-center justify-between px-6 pt-8 md:hidden">
        <Wordmark className="text-3xl" />
        <Link
          href="/welcome"
          className="rounded-full px-4 py-2 text-base font-semibold text-white/80 active:bg-white/10"
        >
          تخطي
        </Link>
      </header>

      <section className="mt-10 flex flex-1 flex-col justify-center rounded-t-[2rem] bg-background px-6 pb-10 pt-8 text-foreground md:mt-0 md:w-full md:max-w-md md:flex-none md:rounded-[2rem] md:p-10 md:shadow-2xl">
        <Wordmark className="mb-8 hidden text-4xl text-primary md:inline-flex" />
        <h1 className="mb-6 text-3xl font-extrabold leading-[1.3]">أهلًا بك</h1>
        <LoginForm />
        <Link
          href="/welcome"
          className="mt-6 hidden text-center font-semibold text-muted-foreground md:block"
        >
          تخطي
        </Link>
      </section>
    </main>
  );
}
