import Link from "next/link";

const ruleSections = [
  {
    title: "一、内容安全与政治规范",
    items: [
      "作品内容必须符合国家法律法规、社会公序良俗和未成年人保护要求。",
      "不得发布危害国家安全、损害国家荣誉、歪曲历史、煽动对立或含有不当政治表达的内容。",
      "不得发布违法违规、封建迷信、极端主义、邪教宣传等内容。",
    ],
  },
  {
    title: "二、禁止色情低俗与暴力惊悚",
    items: [
      "严禁发布任何色情、性暗示、擦边低俗、裸露不当、恋童暗示等内容。",
      "严禁发布血腥、残肢、虐待、恐怖惊吓、过度暴力或容易引发儿童不适的内容。",
      "不得使用低俗标题、挑逗性封面、擦边提示词吸引浏览。",
    ],
  },
  {
    title: "三、禁止危险模仿与不良诱导",
    items: [
      "不得展示危险实验、伤害自己或他人、鼓励冒险模仿、违规用火用电等内容。",
      "不得诱导沉迷、攀比、打赏、欺骗互动，或传播不适合儿童模仿的行为。",
      "不得借作品鼓励攻击、排斥、辱骂、霸凌、羞辱他人。",
    ],
  },
  {
    title: "四、尊重他人权益",
    items: [
      "不得冒用他人身份、盗用他人作品、抄袭他人创意或侵犯著作权、肖像权、隐私权。",
      "不得公开真实姓名、手机号、住址、学校、证件信息等个人隐私。",
      "涉及真实人物、品牌、机构时，不得编造事实或进行恶意攻击。",
    ],
  },
  {
    title: "五、标题、封面与提示词规范",
    items: [
      "标题、封面、简介、提示词和正文都应与作品内容一致，不得误导。",
      "避免使用夸张、猎奇、挑衅、引战、辱骂、暗示性词汇。",
      "上传前请检查文字、图片、配音和互动内容是否适合公开展示给儿童浏览。",
    ],
  },
  {
    title: "六、审核与处理说明",
    items: [
      "社区作品在展示前可能经过规则审核、智能审核和人工复核。",
      "不符合规范的作品可能被拒绝展示、下架、限制传播或要求修改后重新提交。",
      "多次严重违规的账号，平台有权限制投稿、限制互动或采取进一步处理措施。",
    ],
  },
];

export default function CommunityRulesPage() {
  return (
    <main className="min-h-screen bg-[#f7f8ff] px-5 py-8 text-[#17213f] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1120px]">
        <div className="rounded-[28px] border border-white/80 bg-white/82 p-6 shadow-[0_22px_70px_rgba(99,113,181,0.14)] backdrop-blur-2xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center rounded-full bg-[#f3efff] px-3 py-1 text-xs font-black text-[#8a6dff]">
                社区规范
              </div>
              <h1 className="mt-4 text-[34px] font-black tracking-[-0.05em] text-[#182140] sm:text-[42px]">
                社区创作规则详情
              </h1>
              <p className="mt-4 max-w-[52ch] text-[15px] leading-8 text-[#687394]">
                为了让成长社区保持安全、友好、适合儿童公开浏览，所有作品都需要遵守以下规则。上传作品前，请先认真阅读。
              </p>
            </div>
            <Link
              href="/community"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#dce3ff] bg-white px-5 text-sm font-black text-[#5f6a8d]"
            >
              返回成长社区
            </Link>
          </div>

          <div className="mt-8 grid gap-5">
            {ruleSections.map((section) => (
              <section
                key={section.title}
                className="rounded-[24px] border border-[#edf1ff] bg-[#fffefe] px-5 py-5 shadow-[0_10px_24px_rgba(113,128,189,0.08)]"
              >
                <h2 className="text-[22px] font-black tracking-[-0.04em] text-[#17213f]">
                  {section.title}
                </h2>
                <ul className="mt-4 space-y-3 text-[15px] leading-8 text-[#5e6a8c]">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#8a74ff]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
