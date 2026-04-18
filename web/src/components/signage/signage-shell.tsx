"use client";

type SignageShellProps = {
  children: React.ReactNode;
};

export function SignageShell({ children }: SignageShellProps) {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-slate-900 text-slate-50 xl:h-[100dvh] xl:min-h-0 xl:overflow-hidden">
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-2 px-3 py-3 sm:gap-3 sm:px-4 sm:py-3 lg:px-6 lg:py-4 xl:h-full xl:min-h-0">
        {children}
      </div>
    </div>
  );
}

