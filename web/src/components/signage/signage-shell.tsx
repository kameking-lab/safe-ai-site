"use client";

type SignageShellProps = {
  children: React.ReactNode;
};

export function SignageShell({ children }: SignageShellProps) {
  return (
    <div className="flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-slate-900 text-slate-50">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1920px] flex-col gap-2 px-3 py-3 sm:gap-3 sm:px-4 sm:py-3 lg:px-6 lg:py-4">
        {children}
      </div>
    </div>
  );
}

