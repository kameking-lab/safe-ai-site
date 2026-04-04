"use client";

type SignageShellProps = {
  children: React.ReactNode;
};

export function SignageShell({ children }: SignageShellProps) {
  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-4 px-6 py-6 lg:px-8 lg:py-8">
        {children}
      </div>
    </div>
  );
}

