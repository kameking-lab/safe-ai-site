"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./home-lp.module.css";

const steps = [
  ["作業", "作業内容・場所・条件を入力"],
  ["危険", "現場の危険を整理"],
  ["対策", "対策の候補を確認・編集"],
  ["確認・保存", "現場で確認し、用紙にまとめる"],
] as const;

export function HomeChihuahuaCompanion() {
  const [replay, setReplay] = useState(0);
  const [greeting, setGreeting] = useState(0);
  return <figure className={styles.companion} aria-label="KY用紙の画面イメージとチワワ">
    <div key={replay} className={styles.demoScene} data-ky-scene>
      <div className={styles.backSheet} aria-hidden="true" />
      <div className={styles.demoPaper}>
        <div className={styles.demoHeading}><span>KY用紙</span><span>画面イメージ</span></div>
        <p className={styles.demoIntro}>作業の前に、ひとつずつ。</p>
        <ol className={styles.demoSteps}>{steps.map(([label, copy], i) => <li key={label} className={styles.demoStep} style={{ animationDelay: `${i * .7}s` }}><span className={styles.stepNumber}>0{i + 1}</span><div><strong>{label}</strong><span>{copy}</span></div><span className={styles.stepLine} aria-hidden="true" /></li>)}</ol>
        <p className={styles.demoFoot}>候補は現場に合わせて確認・編集</p>
      </div>
      <div className={styles.mascotPosition}><div key={greeting} className={`${styles.mascotGreeting} ${greeting > 0 ? styles.greetingActive : ""}`} data-mascot-greeting><Image src="/mascot/mascot-tablet-dx.webp" alt="ヘルメットをかぶり、タブレットを持つチワワ" width={274} height={320} sizes="(min-width:1024px) 200px, 180px" className={styles.mascot} priority /><span className={styles.tabletLight} aria-hidden="true" /></div></div>
    </div>
    <figcaption className={styles.companionCaption}>現場の、ちいさな相棒。</figcaption>
    <div className={styles.demoControls}><button type="button" onClick={() => setReplay(v => v + 1)}>もう一度見る</button><button type="button" onClick={() => setGreeting(v => v + 1)}>チワワにあいさつ</button></div>
    <p role="status" aria-live="polite" className={styles.greetingResponse}>{greeting > 0 ? "今日も、一つずつ確認していこう。" : ""}</p>
  </figure>;
}
