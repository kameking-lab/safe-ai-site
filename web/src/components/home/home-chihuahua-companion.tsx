"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { homeLpClasses as styles } from "./home-lp-classes";

const ASSETS = "/mascot/anzen-wanko-v1";
const STATES = {
  idle: { label: "いつもの姿", frames: 6, seconds: 2.4 },
  waving: { label: "あいさつ", frames: 4, seconds: 1.6 },
  activework: { label: "いっしょに集中", frames: 6, seconds: 2.4 },
  review: { label: "首をかしげる", frames: 6, seconds: 2.4 },
} as const;
type Pose = keyof typeof STATES;

function subscribeMotion(callback: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const reducedMotion = () => typeof window.matchMedia !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

export function HomeChihuahuaCompanion() {
  const root = useRef<HTMLElement>(null);
  const restore = useRef<HTMLButtonElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [hidden, setHidden] = useState(false);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const [pose, setPose] = useState<Pose>("idle");
  const [loaded, setLoaded] = useState("");
  const [failed, setFailed] = useState("");
  const reduce = useSyncExternalStore(subscribeMotion, reducedMotion, () => true);
  const visible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState === "visible", () => false);
  const src = `${ASSETS}/${pose}.webp`;
  const animate = !hidden && !paused && !reduce && inView && visible && failed !== src;
  const ready = animate && loaded === src;

  useEffect(() => {
    if (!root.current || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  function hide() {
    setHidden(true);
    requestAnimationFrame(() => restore.current?.focus());
  }
  function show() {
    setHidden(false);
    requestAnimationFrame(() => (reduce ? root.current?.querySelector("select") : toggle.current)?.focus());
  }

  return <figure ref={root} className={styles.companion} aria-label="安全わんこ" data-pet-companion>
    {hidden ? <div className={styles.demoControls}>
      <button ref={restore} type="button" onClick={show}>安全わんこを再表示</button>
    </div> : <>
      <div data-pet-viewport role="img" aria-label="緑のヘルメットをかぶった安全わんこ">
        {/* Exact local WebP derivatives; sprite geometry must bypass image resizing. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${ASSETS}/static.webp`} alt="" width={192} height={208} decoding="async" data-pet-static style={{ visibility: ready ? "hidden" : "visible" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {animate && <img key={src} src={src} alt="" aria-hidden="true" width={192 * STATES[pose].frames} height={208}
          data-pet-strip data-pet-playing={ready ? "true" : "false"}
          onLoad={() => setLoaded(src)} onError={() => setFailed(src)}
          style={{ "--pet-frames": STATES[pose].frames, "--pet-duration": `${STATES[pose].seconds}s`, visibility: ready ? "visible" : "hidden" } as CSSProperties} />}
      </div>
      <div data-pet-copy>
        <figcaption className={styles.companionCaption}>安全わんこと、ひとつずつ確認しよう。</figcaption>
        <div className={styles.demoControls}>
          <button ref={toggle} type="button" disabled={reduce} aria-pressed={paused || reduce} onClick={() => setPaused(value => !value)}>
            {reduce ? "端末の設定で動きを停止中" : paused ? "わんこの動きを再開" : "わんこの動きを停止"}
          </button>
          <button type="button" onClick={hide}>安全わんこを非表示</button>
          <label data-pet-select>しぐさ
            <select aria-label="わんこのしぐさ" value={pose} onChange={event => setPose(event.target.value as Pose)}>
              {Object.entries(STATES).map(([value, state]) => <option key={value} value={value}>{state.label}</option>)}
            </select>
          </label>
        </div>
        {failed === src && <p role="status">動きを読み込めなかったため、静止画で表示しています。</p>}
      </div>
    </>}
  </figure>;
}
