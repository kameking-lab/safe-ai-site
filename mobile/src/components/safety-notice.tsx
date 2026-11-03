export function SafetyNotice(){
  return <aside aria-label="緊急時・健康と安全の案内" className="border-b border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 print:hidden">
    <details><summary className="cursor-pointer font-bold">緊急時は作業を止め、安全な場所から119番へ</summary>
      <p>意識がない・呼吸困難・重いけが等はAIの回答を待たず、救急・消防 <a href="tel:119" className="underline">119番に電話</a>。事件・差し迫った危険は <a href="tel:110" className="underline">110番</a>、現場責任者にも連絡してください。二次災害を避け、危険区域へ入らないでください。</p>
      <p>このアプリは診断・治療や安全を保証するものではありません。健康・医療上の判断は医師へ、作業の判断は責任者・専門家と公式資料で確認してください。圏外では通信できる場所の電話・周囲の人へ助けを求めてください。</p>
    </details>
  </aside>;
}
