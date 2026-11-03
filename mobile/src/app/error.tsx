'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="main"><h1>画面を表示できませんでした</h1><p>端末内に保存した情報は、削除するまで保持されます。</p><button onClick={reset}>再表示する</button></main>; }
