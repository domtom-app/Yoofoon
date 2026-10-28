export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-2xl font-bold">لا يوجد اتصال بالإنترنت</h1>
      <p className="text-muted-foreground">
        تأكد من اتصالك ثم حاول مرة أخرى.
      </p>
    </main>
  );
}
