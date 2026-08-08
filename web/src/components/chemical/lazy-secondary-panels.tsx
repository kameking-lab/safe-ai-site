"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ComponentType } from "react";

function LoadingPanel() {
  return (
    <p
      role="status"
      className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"
    >
      補助ツールを読み込んでいます。
    </p>
  );
}

function LoadErrorPanel() {
  return (
    <p
      role="alert"
      className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800"
    >
      補助ツールを読み込めませんでした。通信状態を確認して項目を開き直してください。
    </p>
  );
}

const SdsUploadPanel = dynamic(
  () =>
    import("@/components/chemical/sds-upload-panel")
      .then((module) => ({ default: module.SdsUploadPanel }))
      .catch(() => ({ default: LoadErrorPanel })),
  { ssr: false, loading: LoadingPanel },
);
const MixtureRaPanel = dynamic(
  () =>
    import("@/components/chemical/mixture-ra-panel")
      .then((module) => ({ default: module.MixtureRaPanel }))
      .catch(() => ({ default: LoadErrorPanel })),
  { ssr: false, loading: LoadingPanel },
);
const SavedRaList = dynamic(
  () =>
    import("@/components/chemical/chemical-ra-save")
      .then((module) => ({ default: module.SavedRaList }))
      .catch(() => ({ default: LoadErrorPanel })),
  { ssr: false, loading: LoadingPanel },
);
const ChemicalRaExtras = dynamic(
  () =>
    import("@/components/chemical-ra-extras")
      .then((module) => ({ default: module.ChemicalRaExtras }))
      .catch(() => ({ default: LoadErrorPanel })),
  { ssr: false, loading: LoadingPanel },
);

function OnDetailsOpen({ Panel }: { Panel: ComponentType }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    const details = rootRef.current?.closest("details");
    if (!details) return;
    const update = () => {
      if (details.open) setHasOpened(true);
    };

    update();
    details.addEventListener("toggle", update);
    return () => details.removeEventListener("toggle", update);
  }, []);

  return (
    <div ref={rootRef}>
      {hasOpened ? (
        <Panel />
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          この補助ツールは項目を開いた時に読み込みます。
        </p>
      )}
    </div>
  );
}

export function LazySdsUploadPanel() {
  return <OnDetailsOpen Panel={SdsUploadPanel} />;
}

export function LazyMixtureRaPanel() {
  return <OnDetailsOpen Panel={MixtureRaPanel} />;
}

export function LazySavedRaList() {
  return <OnDetailsOpen Panel={SavedRaList} />;
}

export function LazyChemicalRaExtras() {
  return <OnDetailsOpen Panel={ChemicalRaExtras} />;
}
