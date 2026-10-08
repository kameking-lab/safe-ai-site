import Link from "next/link";

export function ProjectStoryContent() {
  const link = "inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#638332]";
  return (
    <article data-project-story className="bg-[#F4F1E8] px-5 py-14 text-[#172C25] lg:px-10 lg:py-24 forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]">
      <style>{`[data-project-story][data-project-story] h1{font-size:2rem;line-height:1.5;}@media(min-width:1024px){[data-project-story][data-project-story] h1{font-size:2.25rem;}}[data-project-story] [data-story-copy] p{font-size:1.125rem;line-height:1.9;}html.high-contrast [data-project-story],html.high-contrast [data-project-story] :where(div,p,h1){background:#fff!important;color:#000!important;}`}</style>
      <div className="mx-auto max-w-[680px]">
        <p className="text-sm tracking-[.12em]">この取り組みの背景</p>
        <h1 className="mt-4 font-bold">現場に向き合う時間を、つくる。</h1>
        <div data-story-copy className="mt-9 space-y-7">
          <p>安全AIポータルは、現場を支える人の書類づくりや調べ物を助けるためのサイトです。定型的な作業の負担を減らし、現場の確認や仲間との対話に使える時間を増やすことを目指しています。</p>
          <p>私は、死亡事故で同僚を失いました。この経験が、現場の安全に関わる取り組みを続ける背景にあります。</p>
          <p>安全の仕事には、知識と経験、現場ごとの条件を踏まえた判断が必要です。このサイトでは、AIを下書きや情報整理の補助として活用し、一次資料の確認や専門的な判断につなげることを大切にしています。</p>
          <p>防災や社会基盤を支える仕事に、誇りを持って向き合えるように。そのための道具を、少しずつ整えています。</p>
        </div>
        <nav aria-label="次に読む" className="mt-10 flex flex-wrap gap-x-7 gap-y-2 border-t border-[#C6AD70]/40 pt-6"><Link href="/#tools" className={link}>道具を使う</Link><Link href="/about/quality" className={link}>品質について</Link><Link href="/about/data-sources" className={link}>出典について</Link></nav>
      </div>
    </article>
  );
}
