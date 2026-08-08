"use client";

type SignageShellProps = {
  children: React.ReactNode;
  clientReady?: boolean;
};

export function SignageShell({ children, clientReady }: SignageShellProps) {
  return (
    <main
      id="main-content"
      data-signage-client-ready={
        typeof clientReady === "boolean" ? String(clientReady) : undefined
      }
      className="flex min-h-screen w-full flex-col overflow-x-hidden bg-slate-900 text-slate-50 min-[1024px]:h-[100dvh] min-[1024px]:min-h-0 min-[1024px]:overflow-hidden [touch-action:manipulation]"
    >
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-2 px-3 py-3 sm:gap-3 sm:px-4 sm:py-3 lg:px-6 lg:py-4 min-[1024px]:h-full min-[1024px]:min-h-0">
        {children}
      </div>
    </main>
  );
}

