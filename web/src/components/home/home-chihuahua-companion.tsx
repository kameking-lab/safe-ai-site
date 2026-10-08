"use client";

import Image from "next/image";
import { useState } from "react";
import { homeLpClasses as styles } from "./home-lp-classes";

export function HomeChihuahuaCompanion() {
  const [greeting, setGreeting] = useState(0);
  return <figure className={styles.companion} aria-label="法令の確認を案内するチワワ">
    <div key={greeting} className={`${styles.mascotGreeting} ${greeting > 0 ? styles.greetingActive : ""}`} data-mascot-greeting>
      <Image src="/mascot/mascot-law-reading.webp" alt="ヘルメットをかぶり、法令の本を持つチワワ" width={240} height={295} sizes="160px" className={styles.mascot} priority />
    </div>
    <div><figcaption className={styles.companionCaption}>いっしょに、根拠を確かめよう。</figcaption>
      <div className={styles.demoControls}><button type="button" onClick={() => setGreeting(v => v + 1)}>チワワにあいさつ</button></div>
      <p role="status" aria-live="polite" className={styles.greetingResponse}>{greeting > 0 ? "今日も、一つずつ確認していこう。" : ""}</p>
    </div>
  </figure>;
}
