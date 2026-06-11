// モバイル向けアクセシビリティ案内バナー（app-shell.tsx）の表示制御。
//
// C-1（モバイル実速度の構造是正）: 以前はマウント後の localStorage 判定で
// バナーを「挿入」していたため、全ページで main#main-content が押し下げられる
// layout shift（CLS 0.06）が発生し、再ペイントで LCP も悪化していた。
// 現在はバナーを SSR HTML に常に含め、既読ユーザーには <head> の
// A11Y_HINT_INIT_SCRIPT が first paint 前に html 属性を立てて CSS で隠す。
// どちらの経路でもペイント後のレイアウト変化が起きない。

export const A11Y_HINT_DISMISSED_KEY = "a11y-hint-dismissed";

/** 既読時に <html> へ立てる属性。globals.css がこれを見てバナーを隠す。 */
export const A11Y_HINT_DISMISSED_ATTR = "data-a11y-hint-dismissed";

/**
 * <head> に inject する layout shift 抑止スクリプト本体。
 * THEME_INIT_SCRIPT と同じ作法で、hydration 前に判定を確定させる。
 */
export const A11Y_HINT_INIT_SCRIPT = `(function(){try{if(localStorage.getItem('${A11Y_HINT_DISMISSED_KEY}')==='true'){document.documentElement.setAttribute('${A11Y_HINT_DISMISSED_ATTR}','1');}}catch(e){}})();`;
