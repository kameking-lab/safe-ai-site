"use client";

import { useState, useRef, useCallback } from "react";
import { BookMarked, Search, ExternalLink } from "lucide-react";
import Link from "next/link";

import { PageJsonLd } from "@/components/page-json-ld";
// Metadata cannot be exported from client component – define it in a separate layout or use a wrapper.
// For now, the page itself handles SEO via next/head alternative approach.

type Term = {
  term: string;
  reading: string;
  definition: string;
  relatedPages?: Array<{ href: string; label: string }>;
};

const TERMS: Term[] = [
  { term: "KY活動", reading: "けーわいかつどう", definition: "危険予知活動の略。作業前に作業者全員でその作業に潜む危険を話し合い、対策を講じる安全活動。TBM（ツールボックスミーティング）と組み合わせて実施することが多い。", relatedPages: [{ href: "/ky", label: "KY用紙" }, { href: "/e-learning", label: "Eラーニング" }] },
  { term: "KYT", reading: "けーわいてぃー", definition: "危険予知トレーニングの略。イラストや写真を使って、潜む危険を発見・指摘する訓練。4ラウンド法（現状把握→本質追究→対策樹立→目標設定）が代表的手法。", relatedPages: [{ href: "/ky", label: "KY用紙" }] },
  { term: "安全衛生委員会", reading: "あんぜんえいせいいいんかい", definition: "常時50人以上の労働者を使用する事業場で設置義務がある委員会。安全委員会と衛生委員会を統合したもので、月1回以上開催が義務。議事録は3年間保存。", relatedPages: [{ href: "/laws", label: "法改正" }, { href: "/chatbot", label: "法令チャット" }] },
  { term: "安全管理者", reading: "あんぜんかんりしゃ", definition: "安衛法第11条に基づき、製造業・建設業等の常時50人以上の事業場で選任義務がある者。作業場の安全に関する技術的事項を管理する。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }] },
  { term: "安全施工サイクル", reading: "あんぜんせこうさいくる", definition: "建設工事の着工から竣工まで、工事の各段階で繰り返す安全衛生活動のサイクル。朝礼・TBM・KY・終了時確認などの日常サイクルと、月例・工期ごとのサイクルがある。", relatedPages: [{ href: "/ky", label: "KY用紙" }] },
  { term: "安全データシート", reading: "あんぜんでーたしーと", definition: "SDS（Safety Data Sheet）。化学物質の危険有害性情報、取扱方法、緊急時対処等を記載した文書。GHS対応のSDS提供がメーカーに義務付けられている。", relatedPages: [{ href: "/chemical-ra", label: "化学物質RA" }, { href: "/laws", label: "法改正" }] },
  { term: "安全パトロール", reading: "あんぜんぱとろーる", definition: "管理者・安全管理者等が現場を巡視し、不安全状態・不安全行動を発見・是正する活動。定期実施と記録が求められる。", relatedPages: [] },
  { term: "石綿", reading: "いしわた（アスベスト）", definition: "アスベストとも呼ぶ天然の繊維状鉱物。吸入により中皮腫・肺がんを引き起こす。2006年以降、製造・使用等が原則禁止。解体作業時の事前調査義務がある。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }, { href: "/laws", label: "法改正" }] },
  { term: "異常時措置", reading: "いじょうじそち", definition: "機械・設備・作業環境に異常が生じた場合に講ずべき対応手順。あらかじめ手順を定め、労働者に周知することが事業者に求められる。", relatedPages: [] },
  { term: "インターロック", reading: "いんたーろっく", definition: "機械の安全装置の一種。扉や安全柵を開けると機械が自動停止する仕組み。労働安全衛生規則で設置が義務付けられている場合がある。", relatedPages: [] },
  { term: "衛生管理者", reading: "えいせいかんりしゃ", definition: "安衛法第12条に基づき、常時50人以上の全業種の事業場で選任義務がある者。衛生に関する技術的事項を管理し、週1回以上の作業場巡視が義務。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }, { href: "/exam-quiz", label: "過去問" }] },
  { term: "エックス線作業主任者", reading: "えっくすせんさぎょうしゅにんしゃ", definition: "エックス線装置を用いた作業の際に選任義務がある作業主任者。都道府県労働局長登録の講習修了者から選任する。", relatedPages: [{ href: "/exam-quiz", label: "過去問" }] },
  { term: "大型特殊自動車", reading: "おおがたとくしゅじどうしゃ", definition: "ブルドーザー・ショベルカー等の特殊な構造を持つ大型車両の総称。公道走行には大型特殊自動車免許が必要。作業には別途資格が必要な場合がある。", relatedPages: [] },
  { term: "架設通路", reading: "かせつつうろ", definition: "建設工事現場に設置する仮設の通路。安衛則第552条に基づき、幅・勾配・手すり等の基準が定められている。", relatedPages: [{ href: "/laws", label: "法改正" }] },
  { term: "火気管理", reading: "かきかんり", definition: "溶接・溶断・喫煙等、火を扱う作業や使用箇所の管理。引火性物質の近辺での火気禁止、消火器の配備等が求められる。", relatedPages: [] },
  { term: "型枠支保工", reading: "かたわくしほこう", definition: "コンクリートを流し込む型枠を支える仮設構造物。型枠支保工の設計・組み立て・解体には作業主任者の選任が義務付けられている。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }] },
  { term: "化学物質リスクアセスメント", reading: "かがくぶっしつりすくあせすめんと", definition: "化学物質の危険性・有害性を特定し、リスクを見積もり、対策を検討・実施・見直しする一連のプロセス。GHS分類に基づくSDSを活用して実施する。", relatedPages: [{ href: "/chemical-ra", label: "化学物質RA" }, { href: "/laws", label: "法改正" }] },
  { term: "感電防止", reading: "かんでんぼうし", definition: "電気作業における感電災害を防ぐ措置。電路の停電・アース・絶縁保護具の使用・停電作業手順の整備等が含まれる。", relatedPages: [] },
  { term: "管理区域", reading: "かんりくいき", definition: "電離放射線障害防止規則に基づく放射線管理区域。外部放射線による実効線量が3月間につき1.3mSvを超えるおそれがある区域を指定し、立入りを管理する。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }] },
  { term: "危険予知", reading: "きけんよち", definition: "作業や職場に潜む危険・有害要因を事前に予測し、対策を立てる活動。KY・KYTの基本概念。4R法などのフレームワークが用いられる。", relatedPages: [{ href: "/ky", label: "KY用紙" }] },
  { term: "技能講習", reading: "ぎのうこうしゅう", definition: "労働安全衛生法に基づき都道府県労働局長が登録した機関が実施する講習。玉掛け・フォークリフト等の危険業務に就くために修了が必要。", relatedPages: [{ href: "/e-learning", label: "Eラーニング" }, { href: "/chatbot", label: "法令チャット" }] },
  { term: "局所排気装置", reading: "きょくしょはいきそうち", definition: "有害物質の発散源に近い場所に設けたフード・ダクト・排風機からなる換気装置。有機溶剤・特定化学物質等の作業場への設置が義務付けられている。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }] },
  { term: "クレーン", reading: "くれーん", definition: "荷物を動力を用いてつり上げ、水平に運搬する機械。つり上げ荷重0.5t以上は労働安全衛生法の規制対象。運転には資格が必要。", relatedPages: [{ href: "/exam-quiz", label: "過去問" }, { href: "/chatbot", label: "法令チャット" }] },
  { term: "ゲートウェイ確認", reading: "げーとうぇいかくにん", definition: "工事や作業の節目（フェーズ移行時）に安全確認を行うマネジメント手法。各ゲートの通過条件として安全評価項目を設定する。", relatedPages: [] },
  { term: "GHS", reading: "じーえいちえす", definition: "化学品の分類および表示に関する世界調和システム（Globally Harmonized System）。絵表示（ピクトグラム）・シグナルワード・危険有害性情報の統一的表示を規定。", relatedPages: [{ href: "/chemical-ra", label: "化学物質RA" }] },
  { term: "健康診断", reading: "けんこうしんだん", definition: "安衛法第66条に基づく事業者の実施義務。一般健康診断（年1回）と特殊健康診断（有害業務従事者対象）がある。結果に基づく事後措置が求められる。", relatedPages: [{ href: "/laws", label: "法改正" }, { href: "/chatbot", label: "法令チャット" }] },
  { term: "工事安全計画", reading: "こうじあんぜんけいかく", definition: "建設工事着手前に作成する安全衛生管理計画書。工種ごとのリスクアセスメント結果・安全対策・安全施工サイクル等をまとめる。", relatedPages: [] },
  { term: "酸素欠乏", reading: "さんそけつぼう", definition: "空気中の酸素濃度が18%未満の状態。マンホール・タンク内等で発生しやすく、急性の場合は即死の危険がある。作業前の測定と換気が義務。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }] },
  { term: "産業医", reading: "さんぎょうい", definition: "常時50人以上の事業場で選任義務がある医師。月1回以上の作業場巡視（書類提供により2か月に1回可）、健康診断結果への意見提出、ストレスチェック等を担う。", relatedPages: [{ href: "/laws", label: "法改正" }, { href: "/chatbot", label: "法令チャット" }] },
  { term: "作業環境測定", reading: "さぎょうかんきょうそくてい", definition: "安衛法第65条に基づき、有害物質を取り扱う作業場で定期的に実施する濃度測定。結果をA・B・C管理区分に評価し、改善措置を講じる。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }, { href: "/exam-quiz", label: "過去問" }] },
  { term: "作業主任者", reading: "さぎょうしゅにんしゃ", definition: "特定の危険・有害作業において技能講習修了者から選任される者。作業の指揮、設備の点検、保護具の使用状況監視等が職務。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }, { href: "/exam-quiz", label: "過去問" }] },
  { term: "作業手順書", reading: "さぎょうてじゅんしょ", definition: "各作業の実施手順を定めた文書。危険ポイント・安全上の注意・使用工具・保護具等を記載する。新入者・未経験者への教育にも使用される。", relatedPages: [] },
  { term: "酸素欠乏危険作業主任者", reading: "さんそけつぼうきけんさぎょうしゅにんしゃ", definition: "酸素欠乏症等防止規則に基づく作業主任者。技能講習修了者から選任し、酸素・硫化水素濃度の測定、換気管理、保護具使用状況の監視が職務。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }] },
  { term: "じん肺", reading: "じんはい", definition: "粉じんを長期吸入することで肺に生じる線維増殖性変化を主体とする疾病。珪肺・炭鉱夫肺等が含まれる。じん肺法に基づく健康診断・管理区分制度がある。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }] },
  { term: "ストレスチェック", reading: "すとれすちぇっく", definition: "安衛法第66条の10に基づき、常時50人以上の事業場で年1回実施義務がある制度。労働者のストレス状態を把握し、メンタルヘルス不調の一次予防を目的とする。", relatedPages: [{ href: "/laws", label: "法改正" }] },
  { term: "足場", reading: "あしば", definition: "高所作業のために設置する仮設の作業床・手すり等の構造物。安衛則第563条等により、高さ2m以上の箇所での設置基準、組立・解体時の特別教育等が定められている。", relatedPages: [{ href: "/laws", label: "法改正" }, { href: "/chatbot", label: "法令チャット" }] },
  { term: "特定化学物質", reading: "とくていかがくぶっしつ", definition: "特定化学物質障害予防規則（特化則）が適用される化学物質。第1類（製造許可）・第2類・第3類に分類される。局所排気装置の設置や作業主任者の選任が義務。", relatedPages: [{ href: "/chemical-ra", label: "化学物質RA" }, { href: "/chatbot", label: "法令チャット" }] },
  { term: "特定元方事業者", reading: "とくていもとかたじぎょうしゃ", definition: "建設業・造船業において、同一場所で元方事業者として複数の下請を使用する者。協議組織の設置・作業間連絡調整・巡視等の義務がある（安衛法第30条）。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }] },
  { term: "特殊健康診断", reading: "とくしゅけんこうしんだん", definition: "有機溶剤・特定化学物質・鉛・放射線等の有害業務従事者に対して実施する健康診断。業務ごとに項目・頻度が法令で規定されている。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }] },
  { term: "特別教育", reading: "とくべつきょういく", definition: "安衛法第59条第3項に基づき、特定の危険・有害業務に就く労働者に対して事業者が実施する教育。科目・時間は安衛則に規定。記録は3年間保存が義務。", relatedPages: [{ href: "/e-learning", label: "Eラーニング" }, { href: "/chatbot", label: "法令チャット" }] },
  { term: "電離放射線", reading: "でんりほうしゃせん", definition: "アルファ線・ベータ線・ガンマ線・エックス線・中性子線等、原子を電離させるエネルギーを持つ放射線の総称。電離則により管理区域の設定・被ばく限度等が規定。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }, { href: "/exam-quiz", label: "過去問" }] },
  { term: "転倒防止", reading: "てんとうぼうし", definition: "転倒は労働災害の発生件数で最多の類型。床の整理整頓・滑り止め・段差解消・適切な照明・適切な靴の着用等の対策が求められる。", relatedPages: [] },
  { term: "墜落制止用器具", reading: "ついらくせいしようき", definition: "高所作業時の墜落を制止する保護具。ハーネス型（フルハーネス）と胴ベルト型があり、6.75m以上（建設業等）の高所ではフルハーネス型の使用が義務。", relatedPages: [{ href: "/laws", label: "法改正" }, { href: "/chatbot", label: "法令チャット" }] },
  { term: "熱中症", reading: "ねっちゅうしょう", definition: "高温環境での労働により発症する健康障害。熱中症予防のためのWBGT（暑さ指数）管理・休憩・水分補給・健康観察が求められる。夏季の重点管理事項。", relatedPages: [{ href: "/laws", label: "法改正" }] },
  { term: "農薬管理", reading: "のうやくかんり", definition: "農作業における農薬の保管・取扱い・廃棄の管理。農薬取締法・農林水産省ガイドラインに加え、農業用労働安全の観点からも重要。", relatedPages: [] },
  { term: "爆発・火災防止", reading: "ばくはつかさいぼうし", definition: "可燃性ガス・引火性液体・可燃性粉じん等に起因する爆発・火災を防ぐ措置。危険物の適切な管理・換気・着火源の除去等が基本対策。", relatedPages: [] },
  { term: "ハインリッヒの法則", reading: "はいんりっひのほうそく", definition: "1件の重大災害の背景には29件の軽微な事故があり、さらに300件のヒヤリハットがあるという経験則。安全管理の基本理念として広く用いられる。", relatedPages: [] },
  { term: "ヒヤリハット", reading: "ひやりはっと", definition: "事故には至らなかったが、ヒヤッとしたりハッとしたりした出来事。報告・分析することで重大事故防止につなげる。KYTの素材にもなる。", relatedPages: [{ href: "/ky", label: "KY用紙" }] },
  { term: "フォークリフト", reading: "ふぉーくりふと", definition: "荷物を積載したパレットを持ち上げて運搬する産業車両。最大荷重1t以上は技能講習、1t未満は特別教育が必要。車両系荷役運搬機械等に分類。", relatedPages: [{ href: "/e-learning", label: "Eラーニング" }] },
  { term: "不安全行動", reading: "ふあんぜんこうどう", definition: "労働災害の原因の1つで、労働者が安全でない行動をとること。安全ルール違反・保護具未着用・危険な姿勢等が含まれる。安全教育・習慣化により低減を図る。", relatedPages: [] },
  { term: "不安全状態", reading: "ふあんぜんじょうたい", definition: "労働災害の原因の1つで、設備・環境が安全でない状態。欠陥のある機械・乱雑な職場・不良な照明等が含まれる。設備改善や整理整頓により解消する。", relatedPages: [] },
  { term: "粉じん", reading: "ふんじん", definition: "空気中に浮遊する固体の微粒子。長期吸入でじん肺・COPD等を引き起こす。粉じん則により作業環境測定・防じんマスク着用・局所排気等が義務付けられる。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }] },
  { term: "防音保護具", reading: "ぼうおんほごぐ", definition: "騒音の激しい作業場での耳の保護具。耳栓・耳覆い（イヤーマフ）が代表的。騒音障害防止のためのガイドラインにより、85dB以上の環境での使用が推奨される。", relatedPages: [] },
  { term: "保護具", reading: "ほごぐ", definition: "労働者の身体を有害因子から保護するための用具の総称。保護帽・墜落制止用器具・呼吸用保護具・防音保護具・防振手袋・耐熱保護衣等が含まれる。適切な選択と管理が重要。", relatedPages: [{ href: "/e-learning", label: "Eラーニング" }] },
  { term: "保護帽", reading: "ほごぼう", definition: "ヘルメットとも呼ぶ頭部保護具。飛来・落下物・墜落時の頭部保護を目的とする。製造業・建設業等で着用義務がある。規格（JIS T8133等）に適合するものを使用。", relatedPages: [] },
  { term: "ボイラー", reading: "ぼいらー", definition: "水・熱媒体を加熱して蒸気または温水を発生させる装置。規模によりボイラー及び圧力容器安全規則（ボイラー則）の規制を受け、取扱者の資格が必要。", relatedPages: [{ href: "/exam-quiz", label: "過去問" }, { href: "/chatbot", label: "法令チャット" }] },
  { term: "マトリクス評価", reading: "まとりくすひょうか", definition: "リスクアセスメントにおけるリスク評価手法。発生の可能性（頻度）と重篤性（被害の大きさ）の組み合わせでリスクレベルを決定するマトリクス表を用いる。", relatedPages: [{ href: "/chemical-ra", label: "化学物質RA" }, { href: "/risk", label: "気象リスク" }] },
  { term: "メンタルヘルス", reading: "めんたるへるす", definition: "精神的健康のこと。職場のメンタルヘルス対策では、4つのケア（セルフケア・ラインケア・事業場内資源ケア・事業場外資源ケア）の推進が求められる。", relatedPages: [{ href: "/laws", label: "法改正" }] },
  { term: "元方事業者", reading: "もとかたじぎょうしゃ", definition: "同一の場所で複数の事業者が混在して作業を行う場合の元請事業者。下請け事業者に対する安全衛生管理の統括義務がある。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }] },
  { term: "有機溶剤", reading: "ゆうきようざい", definition: "他の物質を溶かす性質を持つ有機化合物の総称。トルエン・キシレン・アセトン等。蒸気を吸入することで健康障害を引き起こす。有機溶剤中毒予防規則（有機則）の規制を受ける。", relatedPages: [{ href: "/chemical-ra", label: "化学物質RA" }, { href: "/chatbot", label: "法令チャット" }] },
  { term: "溶接・溶断", reading: "ようせつようだん", definition: "金属を溶かして接合・切断する作業。アーク溶接・ガス溶接・プラズマ切断等がある。溶接ヒュームによる健康障害防止、火花による火災防止が重要課題。", relatedPages: [{ href: "/laws", label: "法改正" }] },
  { term: "労働安全衛生法", reading: "ろうどうあんぜんえいせいほう", definition: "昭和47年制定の基本法。事業者の安全衛生措置義務・安全管理体制・健康保持増進等を定める。通称「安衛法」。労働安全衛生規則（安衛則）等の省令とセットで運用される。", relatedPages: [{ href: "/laws", label: "法改正" }, { href: "/chatbot", label: "法令チャット" }, { href: "/law-search", label: "法令検索" }] },
  { term: "労働安全コンサルタント", reading: "ろうどうあんぜんこんさるたんと", definition: "安衛法に基づく国家資格。事業場の安全診断・安全教育等を行う専門家。試験科目は産業安全一般と産業安全関係法令。", relatedPages: [{ href: "/exam-quiz", label: "過去問" }] },
  { term: "労働衛生コンサルタント", reading: "ろうどうえいせいこんさるたんと", definition: "安衛法に基づく国家資格。事業場の衛生診断・衛生教育等を行う専門家。試験科目は労働衛生一般と労働衛生関係法令。", relatedPages: [{ href: "/exam-quiz", label: "過去問" }] },
  { term: "リスクアセスメント", reading: "りすくあせすめんと", definition: "危険性・有害性の特定→リスクの見積もり→リスクの評価→リスク低減措置の決定・実施というプロセス。2006年から努力義務、化学物質等は義務化されている。", relatedPages: [{ href: "/chemical-ra", label: "化学物質RA" }, { href: "/risk-prediction", label: "リスク予測" }] },
  { term: "玉掛け", reading: "たまがけ", definition: "クレーン等で荷物をつり上げる際に、ワイヤーロープ等を用いて荷物を掛ける作業。最大荷重1t以上のクレーン使用時は技能講習修了が必要。", relatedPages: [{ href: "/e-learning", label: "Eラーニング" }, { href: "/chatbot", label: "法令チャット" }] },
  { term: "TBM", reading: "てぃーびーえむ", definition: "ツールボックスミーティングの略。作業開始前に作業グループのメンバーが短時間（5〜10分）で行うミーティング。その日の作業内容・危険ポイント・対策を確認する。", relatedPages: [{ href: "/ky", label: "KY用紙" }] },
  { term: "MSDS/SDS", reading: "えむえすでぃーえす/えすでぃーえす", definition: "Material Safety Data Sheet → Safety Data Sheet。化学物質の安全情報を記載した文書。GHS対応で「SDS」に統一。16項目の記載が義務付けられている。", relatedPages: [{ href: "/chemical-ra", label: "化学物質RA" }] },
  { term: "WBGT", reading: "だぶりゅーびーじーてぃー", definition: "湿球黒球温度（Wet Bulb Globe Temperature）。熱中症リスクを評価するための暑さ指数。気温・湿度・輻射熱を考慮して算出し、28℃以上で厳重警戒、31℃以上で危険とされる。", relatedPages: [{ href: "/laws", label: "法改正" }] },
  { term: "PDCA", reading: "ぴーでぃーしーえー", definition: "Plan（計画）→Do（実施）→Check（評価）→Act（改善）のサイクル。安全衛生管理においてOSHMS（労働安全衛生マネジメントシステム）の基本的枠組みとして活用される。", relatedPages: [] },
  { term: "OSHMS", reading: "おーえすえいちえむえす", definition: "労働安全衛生マネジメントシステム（Occupational Safety and Health Management System）。PDCAサイクルにより継続的に安全衛生水準を向上させる体系的管理手法。ISO 45001が国際規格。", relatedPages: [] },
  { term: "ISO 45001", reading: "あいえすおー45001", definition: "労働安全衛生マネジメントシステムの国際規格（2018年制定）。OHSAS 18001を後継し、働き方改革・サプライチェーン管理等の要求事項を盛り込んでいる。", relatedPages: [] },
  { term: "5S", reading: "ごえす", definition: "整理・整頓・清掃・清潔・躾（しつけ）の頭文字。職場環境の維持改善の基本活動。不安全状態の排除・作業効率向上・品質管理にも効果的。", relatedPages: [] },
  { term: "安衛則", reading: "あんえいそく", definition: "労働安全衛生規則の略称。安衛法の詳細な規定を定める厚生労働省令。機械安全・電気・墜落・崩壊等の基準、健康管理、安全衛生教育等が規定されている。", relatedPages: [{ href: "/law-search", label: "法令検索" }, { href: "/chatbot", label: "法令チャット" }] },
  { term: "圧力容器", reading: "あつりょくようき", definition: "内部の圧力が大気圧と異なる液体・気体を収容する密封容器。ボイラー則の規制対象で、検査・取扱資格等が義務付けられている。定期自主検査が必要。", relatedPages: [{ href: "/exam-quiz", label: "過去問" }] },
  { term: "高圧ガス", reading: "こうあつがす", definition: "圧縮ガス・液化ガス等、高圧の状態にあるガスの総称。高圧ガス保安法の規制を受けるが、労働安全の観点からも充填設備・容器の管理・移送が重要。", relatedPages: [] },
  { term: "騒音性難聴", reading: "そうおんせいなんちょう", definition: "強烈な騒音に長期間さらされることで生じる職業性難聴。不可逆的で治療不可能。騒音障害防止のためのガイドラインに基づく聴力保護が必要。", relatedPages: [] },
  { term: "振動障害", reading: "しんどうしょうがい", definition: "チェーンソー・グラインダー等の振動工具の長期使用で生じる末梢循環障害・神経障害。白蝋病（レイノー現象）が代表的症状。振動工具の使用時間管理が重要。", relatedPages: [] },
  { term: "腰痛予防", reading: "こしつうよぼう", definition: "職場における腰痛予防対策指針（厚労省）に基づく対策。重量物取扱い・不自然な姿勢・長時間立ち作業等が腰痛の原因。リスクアセスメントと作業改善が基本。", relatedPages: [{ href: "/laws", label: "法改正" }] },
  { term: "粉じん則", reading: "ふんじんそく", definition: "粉じん障害防止規則の略称。粉じん作業における局所排気装置の設置・作業環境測定・防じんマスク着用・特別教育等を規定する省令。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }] },
  { term: "酸欠則", reading: "さんけつそく", definition: "酸素欠乏症等防止規則の略称。酸素欠乏危険場所での作業環境測定・換気・保護具・作業主任者選任・特別教育等を規定する省令。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }] },
  { term: "有機則", reading: "ゆうきそく", definition: "有機溶剤中毒予防規則の略称。有機溶剤を取り扱う作業場での局所排気装置・作業環境測定・健康診断・保護具・掲示等を規定する省令。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }, { href: "/law-search", label: "法令検索" }] },
  { term: "特化則", reading: "とっかそく", definition: "特定化学物質障害予防規則の略称。特定化学物質（第1類〜第3類）を取り扱う際の設備・作業環境測定・健康診断・保護具等を規定する省令。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }, { href: "/chemical-ra", label: "化学物質RA" }] },
  { term: "電離則", reading: "でんりそく", definition: "電離放射線障害防止規則の略称。放射線業務に伴う管理区域・被ばく限度・個人線量計・健康診断・特別教育等を規定する省令。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }] },
  { term: "石綿則", reading: "いしわたそく", definition: "石綿障害予防規則の略称。石綿等の解体・改修作業における事前調査・届出・作業主任者・保護具・健康診断等を規定する省令。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }] },
  { term: "元方安全衛生管理者", reading: "もとかたあんぜんえいせいかんりしゃ", definition: "特定元方事業者が選任する安全衛生管理の担当者。下請業者との連絡調整・協議組織の運営・作業場の巡視等を担う。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }] },
  { term: "安全衛生教育", reading: "あんぜんえいせいきょういく", definition: "安衛法第59条に基づく事業者の教育義務。雇入れ時・作業内容変更時・特別教育・職長教育等がある。記録の保存が求められる。", relatedPages: [{ href: "/e-learning", label: "Eラーニング" }] },
  { term: "職長", reading: "しょくちょう", definition: "製造業・建設業等の作業現場で、作業者を直接指揮する監督者。安衛法第60条に基づき、一定の業種では職長教育（安全衛生責任者教育を含む場合あり）が義務。", relatedPages: [{ href: "/e-learning", label: "Eラーニング" }] },
  { term: "安全衛生責任者", reading: "あんぜんえいせいせきにんしゃ", definition: "下請け事業者が選任する安全衛生管理の担当者。元方事業者の統括安全衛生管理者との連絡・作業員への周知等が職務。職長教育と合わせて実施することが多い。", relatedPages: [{ href: "/chatbot", label: "法令チャット" }] },
  { term: "過重労働", reading: "かじゅうろうどう", definition: "長時間労働や身体的・精神的負荷の高い業務。過労死・過労自殺の原因として社会問題化。残業時間の管理・産業医面談・労働時間の適正化が求められる。", relatedPages: [{ href: "/laws", label: "法改正" }] },
  { term: "化学物質自律管理", reading: "かがくぶっしつじりつかんり", definition: "2023年以降の化学物質管理の新体制。国が個別に規制する方式から、事業者が自らリスクアセスメントを実施して管理する方式への転換。危険性・有害性情報の伝達が前提。", relatedPages: [{ href: "/laws", label: "法改正" }, { href: "/chemical-ra", label: "化学物質RA" }] },
  { term: "墜落防止", reading: "ついらくぼうし", definition: "高所からの墜落による労働災害を防ぐ措置。手すり・親綱・墜落防止ネットの設置、フルハーネス型等の要求性能墜落制止用器具の使用が主な対策。", relatedPages: [{ href: "/laws", label: "法改正" }] },
  { term: "感染症対策", reading: "かんせんしょうたいさく", definition: "職場における感染症（インフルエンザ・新型コロナウイルス等）の拡大防止措置。手洗い・マスク・換気・就業制限・ワクチン接種推進等が含まれる。", relatedPages: [] },
  { term: "建設業法", reading: "けんせつぎょうほう", definition: "建設工事の適正な施工を確保する法律。主任技術者・監理技術者の配置義務、一括下請け禁止、施工体制台帳の整備等を定める。安全管理とも密接に関連。", relatedPages: [{ href: "/laws", label: "法改正" }] },
  { term: "消防法", reading: "しょうぼうほう", definition: "火災の予防・警戒・鎮圧に関する法律。職場では危険物の貯蔵・取扱い、消防設備の設置・維持、防火管理者の選任等が義務付けられている。", relatedPages: [{ href: "/laws", label: "法改正" }] },
  { term: "産業廃棄物管理", reading: "さんぎょうはいきぶつかんり", definition: "事業活動で生じた廃棄物の適正処理。廃棄物処理法に基づく分別・保管・マニフェスト管理・許可業者への委託が義務。石綿・水銀等の特別管理産業廃棄物に注意。", relatedPages: [] },
  { term: "通路・避難路", reading: "つうろひなんろ", definition: "作業場の通路は幅80cm以上の確保・標識設置が必要（安衛則第542条等）。避難路・非常口の確保と表示、定期的な避難訓練の実施が求められる。", relatedPages: [] },
  { term: "ロックアウト・タグアウト", reading: "ろっくあうとたぐあうと", definition: "LOTO（Lockout/Tagout）。機械整備・清掃時の予期しない起動・エネルギー放出を防ぐための手順。動力源を遮断・施錠し、警告タグを取り付ける安全確保手順。", relatedPages: [] },
];

const KANA_ROWS = ["あ", "か", "さ", "た", "な", "は", "ま", "や", "ら", "わ"];

const KANA_RANGE: Record<string, string[]> = {
  あ: ["あ", "い", "う", "え", "お"],
  か: ["か", "き", "く", "け", "こ", "が", "ぎ", "ぐ", "げ", "ご"],
  さ: ["さ", "し", "す", "せ", "そ", "ざ", "じ", "ず", "ぜ", "ぞ"],
  た: ["た", "ち", "つ", "て", "と", "だ", "ぢ", "づ", "で", "ど"],
  な: ["な", "に", "ぬ", "ね", "の"],
  は: ["は", "ひ", "ふ", "へ", "ほ", "ば", "び", "ぶ", "べ", "ぼ", "ぱ", "ぴ", "ぷ", "ぺ", "ぽ"],
  ま: ["ま", "み", "む", "め", "も"],
  や: ["や", "ゆ", "よ"],
  ら: ["ら", "り", "る", "れ", "ろ"],
  わ: ["わ", "を", "ん"],
};

function getRow(reading: string): string {
  const first = reading[0];
  if (!first) return "わ";
  for (const [row, chars] of Object.entries(KANA_RANGE)) {
    if (chars.includes(first)) return row;
  }
  return "わ";
}

export default function GlossaryPage() {
  const [search, setSearch] = useState("");
  const [activeRow, setActiveRow] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const filtered = TERMS.filter((t) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return t.term.includes(q) || t.reading.includes(q) || t.definition.includes(q);
  });

  const grouped = KANA_ROWS.map((row) => ({
    row,
    terms: filtered
      .filter((t) => getRow(t.reading) === row)
      .sort((a, b) => a.reading.localeCompare(b.reading)),
  })).filter((g) => g.terms.length > 0);

  const scrollToRow = useCallback((row: string) => {
    setActiveRow(row);
    const el = sectionRefs.current[row];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name="労働安全用語集" description="労働安全衛生に関する専門用語をわかりやすく解説。条文・通達・現場用語を一覧から検索。" path="/glossary" />
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <BookMarked className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">安全用語辞書</h1>
            <p className="text-sm text-slate-500">労働安全衛生の主要用語 全{TERMS.length}語 を五十音順で収録</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="用語・読み・説明を検索..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-indigo-400 focus:outline-none"
        />
      </div>

      {/* Kana index */}
      {!search && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {KANA_ROWS.map((row) => {
            const hasTerms = grouped.some((g) => g.row === row);
            return (
              <button
                key={row}
                type="button"
                disabled={!hasTerms}
                onClick={() => scrollToRow(row)}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                  activeRow === row
                    ? "bg-indigo-600 text-white"
                    : hasTerms
                    ? "bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                    : "cursor-not-allowed bg-slate-50 text-slate-300"
                }`}
              >
                {row}行
              </button>
            );
          })}
        </div>
      )}

      {/* Term count */}
      <p className="mb-4 text-xs text-slate-500">
        {filtered.length}件表示
      </p>

      {/* Term list */}
      <div className="space-y-8">
        {grouped.map(({ row, terms }) => (
          <section
            key={row}
            ref={(el) => { sectionRefs.current[row] = el; }}
          >
            {!search && (
              <h2 className="mb-3 border-b border-indigo-100 pb-1 text-lg font-bold text-indigo-700">
                {row}行
              </h2>
            )}
            <div className="space-y-3">
              {terms.map((t) => (
                <div
                  key={t.term}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-base font-bold text-slate-900">{t.term}</h3>
                    <span className="text-xs text-slate-400">（{t.reading}）</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{t.definition}</p>
                  {t.relatedPages && t.relatedPages.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {t.relatedPages.map((p) => (
                        <Link
                          key={p.href}
                          href={p.href}
                          className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs text-indigo-700 hover:bg-indigo-100 transition"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {p.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        {grouped.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            「{search}」に一致する用語が見つかりませんでした。
          </div>
        )}
      </div>
    </div>
  );
}
