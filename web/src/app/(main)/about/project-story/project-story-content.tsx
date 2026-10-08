import Link from "next/link";

export function ProjectStoryContent() {
  const link = "inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#638332]";
  return (
    <article data-project-story className="bg-[#F4F1E8] px-5 py-14 text-[#19251F] lg:px-10 lg:py-24 forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]">
      <div className="mx-auto max-w-[680px]">
        <p className="text-sm tracking-[.12em]">このサイトの原点</p>
        <h1 className="mt-4 text-3xl font-bold leading-relaxed lg:text-4xl">仲間を守りたい。<br />それが、出発点です。</h1>
        <div className="mt-9 space-y-7 text-lg leading-[1.9]">
          <p>私は、死亡事故で同僚を失いました。安全な計画を立てていれば、防げたかもしれない。あの時、現場に行けば、防げたかもしれない。</p>
          <p>「なぜ仕事で大けがをしたり、命を落としたりしなければならないのか。」文系を専攻した私が建設業に進んだ背景には、この疑問がありました。</p>
          <p>仲間を守りたい。その思いを出発点に、必要な知識を学び、専門家とも意見を交わして、現場をよくしていきたいと考えました。亡くなった同僚への思いも、この仕事を続ける理由です。</p>
          <p>忙しさや責任の重さで、仕事の楽しさも、心と体の健康も、誇りも失ってほしくありません。防災や社会基盤を支える現場の仕事は、簡単にAIに置き換えられるものではありません。</p>
          <p>だからこそ、その現場を支える人の負担を少しでも軽くしたい。書類や調べ物に追われる時間を減らし、仲間と向き合う時間をつくりたい。そのための道具を、このサイトに集めています。</p>
        </div>
        <nav aria-label="次に読む" className="mt-10 flex flex-wrap gap-x-7 gap-y-2 border-t border-[#B79A62]/40 pt-6"><Link href="/#tools" className={link}>道具を使う</Link><Link href="/about/quality" className={link}>品質について</Link><Link href="/about/data-sources" className={link}>出典について</Link></nav>
      </div>
    </article>
  );
}
