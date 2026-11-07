// One slim line on the app home only. The AI input still stops and points to 119 on emergency words.
export function SafetyNotice(){
  return <aside aria-label="緊急時の連絡" className="border-b border-amber-300 bg-amber-50 px-4 py-1 text-sm text-amber-950 print:hidden">
    緊急時はAIを待たず <a href="tel:119" className="inline-flex min-h-9 items-center font-bold underline">119番に電話</a>・<a href="tel:110" className="inline-flex min-h-9 items-center underline">110番</a>
  </aside>;
}
