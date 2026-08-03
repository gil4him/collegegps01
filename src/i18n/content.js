// Localized milestone content, keyed by milestone id — the stored plan keeps
// English (canonical); display localizes by id and falls back to the stored
// text for unknown ids. Proper nouns stay English: PSAT, SAT, ACT, AP/IB,
// FAFSA, National Merit, EA/ED, GPA, 529. Year-bearing items are functions.
// Machine-authored, pending owner review.

const L10N = {
  ko: {
    "g9-rigor": { title: "핵심 과목은 도전적으로 고르고 공부 습관을 다지기", why: "대학은 성적표를 맥락과 함께 읽어요 — 지금 고르는 과목이 나중의 상한선을 정합니다." },
    "g9-explore": { title: "활동 2–3개를 해보며 진짜 좋아하는 것 찾기", why: "나중엔 넓이보다 깊이가 이깁니다. 무엇이 맞는지는 지금 솔직하게 시도해봐야 알 수 있어요." },
    "g9-gpa": { title: "GPA를 일찍부터 지키기 — 나중에 올리기 가장 어려운 숫자예요", why: "9학년 성적도 4년 내내 GPA에 남아요. 지금 지키는 게 나중에 복구하는 것보다 훨씬 쉽습니다." },
    "g9-summer": { title: "여름엔 좋아하는 프로젝트·일·프로그램에 시간 쓰기", why: "알찬 여름 하나가 이야기의 첫 줄이 됩니다." },
    "g10-psat": { title: "연습 삼아 PSAT 보고 기준 점수 만들기", why: "부담 없는 PSAT로 출발점을 확인하고, 어디에 준비가 필요한지 알 수 있어요." },
    "g10-spike": { title: "활동을 늘리기보다 1–2개를 더 깊게", why: "입학 사정관은 긴 목록이 아니라 꾸준함을 봅니다." },
    "g10-ap": { title: "카운슬러와 내년 AP/IB/Honors 과목 계획하기", why: "내년의 난이도는 이번 봄에 정해져요 — 과목 선택이 조용한 지원 전략입니다." },
    "g10-summer": { title: "관심사와 이어진 리더십이나 여름 프로그램 맡기", why: "10학년 여름은 리더십 스토리의 출발점이에요." },
    "g11-psat": { title: "PSAT/NMSQT 응시 — National Merit 자격이 걸려 있어요", why: "이번엔 진짜예요 — National Merit 자격은 실제 장학금으로 이어질 수 있습니다." },
    "g11-test": { title: "이번 봄 SAT 또는 ACT 응시, 필요하면 재시험 계획", why: "봄에 보면 지원 전 가을 재시험 여유가 생깁니다." },
    "g11-recs": { title: "추천서를 써줄 선생님 1–2분과 관계 쌓기", why: "좋은 추천서는 나를 아는 선생님에게서 나와요 — 일주일이 아니라 한 학기가 걸립니다." },
    "g11-list": { title: "균형 잡힌 대학 목록 만들기 (도전/적정/안정)", why: "균형 잡힌 목록은 합격 확률과 비용 모두를 지키는 최고의 안전장치예요." },
    "g11-summer": { title: "대학 방문·조사하고 메인 에세이 초안 쓰기", why: "여름에 쓴 에세이 초안이 10월에 급히 쓴 것보다 낫습니다." },
    "g12-fafsa": { title: "FAFSA 제출 — 10월 1일에 열려요", why: "많은 대학의 지원금은 선착순이에요 — 일찍 내면 실제 돈이 달라질 수 있습니다." },
    "g12-essays": { title: "에세이 마무리하고 추천서는 일찍 요청하기", why: "10월의 내가 9월의 나에게 고마워할 거예요." },
    "g12-deadlines": { title: "모든 지원 마감일 추적하기 (EA/ED와 정시)", why: "EA/ED 날짜는 금방 옵니다 — 트래커 하나가 값비싼 실수를 막아요." },
    "g12-submit": { title: "남은 지원서 제출하고 합격 조건 비교하기", why: "결정 전에 지원금 제안서를 나란히 비교하세요 — 생각보다 자주 협상이 됩니다." },
    "fin-money-checkpoint": { title: "머니 체크포인트: 학자금 저축의 보관 방식 점검", why: "저축을 어디에 두는지(529냐 자녀 명의 계좌냐)에 따라 지원금 계산이 달라져요 — 대학이 계산하는 해가 시작되기 전에 살펴볼 가치가 있습니다." },
    "fin-base-year": { title: (y) => `FAFSA 기준 연도 시작 (${y} 과세연도)`, why: (y) => `${y}년 1월 1일부터의 소득을 FAFSA가 계산해요. 큰 돈 움직임은 이 기간을 염두에 두고 계획하세요.` },
  },
  es: {
    "g9-rigor": { title: "Elegir materias exigentes y construir buenos hábitos de estudio", why: "Las universidades leen tu historial en contexto — las materias que eliges ahora fijan el techo de después." },
    "g9-explore": { title: "Probar 2–3 actividades y encontrar lo que de verdad te importa", why: "Después, la profundidad vence a la variedad; encontrar lo tuyo empieza con intentos honestos ahora." },
    "g9-gpa": { title: "Proteger el GPA desde temprano — es el número más difícil de subir", why: "Las calificaciones de 9.º cuentan en el GPA los cuatro años — protegerlo ahora es mucho más fácil que repararlo." },
    "g9-summer": { title: "Usar el verano en un proyecto, trabajo o programa que disfrutes", why: "Un verano con sustancia se vuelve la primera línea de tu historia." },
    "g10-psat": { title: "Tomar el PSAT de práctica para tener una base", why: "Un PSAT sin presión da un punto de partida y muestra dónde conviene prepararse." },
    "g10-spike": { title: "Profundizar en 1–2 actividades en vez de sumar más", why: "Los comités de admisión buscan compromiso, no una lista larga." },
    "g10-ap": { title: "Planear con tu consejero las materias AP/IB/Honors del próximo año", why: "El rigor del próximo año se decide esta primavera — elegir materias es la jugada silenciosa." },
    "g10-summer": { title: "Tomar liderazgo o un programa de verano ligado a tus intereses", why: "El verano de 10.º es la plataforma de las historias de liderazgo." },
    "g11-psat": { title: "Tomar el PSAT/NMSQT — califica para National Merit", why: "Este sí cuenta — calificar a National Merit puede significar becas reales." },
    "g11-test": { title: "Tomar el SAT o ACT esta primavera; planear repetirlo si hace falta", why: "Una fecha en primavera deja espacio para repetir en otoño antes de las solicitudes." },
    "g11-recs": { title: "Construir relación con 1–2 maestros para las cartas de recomendación", why: "Las mejores cartas vienen de maestros que te conocen — eso toma un semestre, no una semana." },
    "g11-list": { title: "Armar una lista balanceada de universidades (reto / adecuada / segura)", why: "Una lista balanceada es la mejor protección para las probabilidades y el costo." },
    "g11-summer": { title: "Visitar o investigar universidades y hacer el borrador del ensayo principal", why: "Los ensayos escritos en verano ganan a los ensayos apurados de octubre." },
    "g12-fafsa": { title: "Presentar la FAFSA — abre el 1 de octubre", why: "En muchas universidades la ayuda es por orden de llegada — presentarla temprano puede valer dinero real." },
    "g12-essays": { title: "Terminar los ensayos y pedir las cartas de recomendación temprano", why: "El tú de octubre le agradecerá al tú de septiembre." },
    "g12-deadlines": { title: "Registrar cada fecha límite de solicitud (EA/ED y regular)", why: "Las fechas EA/ED llegan rápido — un solo registro evita el error costoso." },
    "g12-submit": { title: "Enviar las solicitudes restantes y comparar tus ofertas", why: "Las cartas de ayuda se pueden comparar — y a veces apelar — antes de decidir." },
    "fin-money-checkpoint": { title: "Punto de control de dinero: revisar cómo están guardados los ahorros", why: "Dónde están los ahorros (529 vs. cuentas a nombre del estudiante) cambia el cálculo de ayuda — vale la pena revisarlo antes de que empiece el año que las universidades cuentan." },
    "fin-base-year": { title: (y) => `Empieza el año base de la FAFSA (año fiscal ${y})`, why: (y) => `Desde el 1 de enero, el ingreso de ${y} es lo que contará la FAFSA. Planea los movimientos financieros grandes con esa ventana en mente.` },
  },
  zh: {
    "g9-rigor": { title: "选择有挑战性的核心课程，养成扎实的学习习惯", why: "大学会结合背景看成绩单 — 现在选的课程决定了以后的上限。" },
    "g9-explore": { title: "尝试 2–3 项活动，找到真正在乎的事", why: "以后深度胜过广度；找到适合自己的，从现在诚实地尝试开始。" },
    "g9-gpa": { title: "尽早守住 GPA — 它是最难拉回来的数字", why: "9 年级成绩会计入 GPA 整整四年 — 现在守住比以后补救容易得多。" },
    "g9-summer": { title: "把暑假用在喜欢的项目、打工或课程上", why: "一个充实的暑假会成为你故事的第一行。" },
    "g10-psat": { title: "参加 PSAT 练手，拿到基准分", why: "无压力的 PSAT 能给出起点，也能看出哪里值得准备。" },
    "g10-spike": { title: "在 1–2 项活动上深入，而不是继续加项", why: "招生官看的是投入程度，不是长长的清单。" },
    "g10-ap": { title: "和升学顾问一起规划明年的 AP/IB/荣誉课程", why: "明年的课程强度这个春天就定了 — 选课是安静的申请策略。" },
    "g10-summer": { title: "承担领导角色或参加与兴趣相关的暑期项目", why: "10 年级的暑假是领导力故事的起点。" },
    "g11-psat": { title: "参加 PSAT/NMSQT — 关系到 National Merit 资格", why: "这次是真的 — National Merit 资格可能意味着实实在在的奖学金。" },
    "g11-test": { title: "今年春天考 SAT 或 ACT，必要时计划重考", why: "春天考试，秋天还有申请前重考的余地。" },
    "g11-recs": { title: "与 1–2 位老师建立关系，为推荐信做准备", why: "最好的推荐信来自了解你的老师 — 那需要一个学期，不是一个星期。" },
    "g11-list": { title: "开始一份均衡的大学清单（冲刺/匹配/保底）", why: "均衡的清单是对录取概率和费用最好的保护。" },
    "g11-summer": { title: "走访或调研大学，写出主文书初稿", why: "暑假写好的文书胜过十月赶出来的文书。" },
    "g12-fafsa": { title: "提交 FAFSA — 10 月 1 日开放", why: "很多学校的资助先到先得 — 早提交可能就是真金白银。" },
    "g12-essays": { title: "完成文书，尽早请老师写推荐信", why: "十月的你会感谢九月的你。" },
    "g12-deadlines": { title: "记录每一个申请截止日（EA/ED 和常规）", why: "EA/ED 的日期来得很快 — 一份清单能避免代价高昂的疏漏。" },
    "g12-submit": { title: "提交剩余申请，并比较录取与资助方案", why: "决定前把资助方案放在一起比较 — 而且比想象中更常可以申诉。" },
    "fin-money-checkpoint": { title: "资金检查点：看看大学储蓄放在哪里", why: "储蓄放在哪（529 还是学生名下账户）会改变资助计算 — 在大学开始计算的那一年之前值得看一眼。" },
    "fin-base-year": { title: (y) => `FAFSA 基准年开始（${y} 纳税年度）`, why: (y) => `从 1 月 1 日起，${y} 年的收入就是 FAFSA 计算的对象。大额资金变动请把这个窗口考虑进去。` },
  },
  ja: {
    "g9-rigor": { title: "挑戦的な主要科目を選び、学習習慣をつくる", why: "大学は成績表を文脈込みで読みます — いま選ぶ科目が後の上限を決めます。" },
    "g9-explore": { title: "2〜3の活動を試して、本当に好きなことを見つける", why: "後々は広さより深さが勝ちます。合うものを見つけるには、いま正直に試すことです。" },
    "g9-gpa": { title: "GPA を早くから守る — 後から上げるのが最も難しい数字", why: "9年生の成績も4年間ずっと GPA に残ります — いま守るほうが、後で立て直すよりずっと簡単です。" },
    "g9-summer": { title: "夏は好きなプロジェクト・仕事・プログラムに使う", why: "中身のある夏が、ストーリーの最初の一行になります。" },
    "g10-psat": { title: "練習として PSAT を受け、基準点をつくる", why: "気負いのない PSAT で現在地が分かり、どこを対策すべきかが見えます。" },
    "g10-spike": { title: "活動を増やすより、1〜2つを深める", why: "審査官が見るのは長いリストではなく、打ち込みの深さです。" },
    "g10-ap": { title: "カウンセラーと来年の AP/IB/Honors 科目を計画する", why: "来年の難度はこの春に決まります — 科目選びは静かな出願戦略です。" },
    "g10-summer": { title: "興味につながるリーダー役や夏期プログラムに挑戦", why: "10年生の夏はリーダーシップ・ストーリーの出発点です。" },
    "g11-psat": { title: "PSAT/NMSQT を受験 — National Merit の資格がかかっています", why: "今回は本番です — National Merit の資格は実際の奨学金につながり得ます。" },
    "g11-test": { title: "この春に SAT か ACT を受験、必要なら再受験を計画", why: "春に受ければ、出願前の秋に再受験する余裕が生まれます。" },
    "g11-recs": { title: "推薦状のため先生1〜2人と関係を築く", why: "良い推薦状はあなたを知る先生から生まれます — 1週間ではなく1学期かかります。" },
    "g11-list": { title: "バランスの取れた志望校リストを作る（挑戦/適正/安全）", why: "バランスの取れたリストは、合格確率と費用の両方を守る最良の備えです。" },
    "g11-summer": { title: "大学を見学・調査し、メインエッセイの下書きを書く", why: "夏に書いたエッセイは、10月に慌てて書いたものに勝ります。" },
    "g12-fafsa": { title: "FAFSA を提出 — 10月1日に開始", why: "多くの大学で支援は早い者勝ちです — 早めの提出が実際のお金の差になります。" },
    "g12-essays": { title: "エッセイを仕上げ、推薦状は早めに依頼する", why: "10月のあなたが、9月のあなたに感謝します。" },
    "g12-deadlines": { title: "すべての出願締切を管理する（EA/ED と一般）", why: "EA/ED の期日はすぐ来ます — 一つの管理表が高くつくミスを防ぎます。" },
    "g12-submit": { title: "残りの出願を済ませ、オファーを比較する", why: "決める前に支援内容を並べて比較を — 思っている以上に交渉できることがあります。" },
    "fin-money-checkpoint": { title: "マネー・チェックポイント: 学資貯蓄の置き場所を確認", why: "貯蓄の置き場所（529か本人名義口座か）で支援の計算が変わります — 大学が数える年が始まる前に一度確認を。" },
    "fin-base-year": { title: (y) => `FAFSA 基準年の開始（${y} 課税年度）`, why: (y) => `1月1日からの ${y} 年の収入が FAFSA の計算対象になります。大きなお金の動きはこの期間を念頭に計画してください。` },
  },
};

export function localizeMilestone(m, locale) {
  if (locale === "en") return m;
  const d = L10N[locale]?.[m.id];
  if (!d) return m;
  const year = m.date ? m.date.slice(0, 4) : "";
  return {
    ...m,
    title: typeof d.title === "function" ? d.title(year) : d.title,
    why: typeof d.why === "function" ? d.why(year) : d.why,
  };
}

export function localizePlan(plan, locale) {
  if (!plan || locale === "en") return plan;
  return { ...plan, milestones: plan.milestones.map((m) => localizeMilestone(m, locale)) };
}

// Display labels for the stored-in-English band values.
const BAND_LABELS = {
  ko: {
    "Under $15k": "1.5만 달러 미만", "$15–30k": "1.5만–3만 달러", "$30–50k": "3만–5만 달러", "$50–80k": "5만–8만 달러", "$80k+": "8만 달러 이상", "Not sure yet": "아직 모르겠어요",
    "Under $50k": "5만 달러 미만", "$50–75k": "5만–7.5만 달러", "$75–110k": "7.5만–11만 달러", "$110–150k": "11만–15만 달러", "$150–200k": "15만–20만 달러", "$200k+": "20만 달러 이상",
    "None yet": "아직 없어요", "Under $10k": "1만 달러 미만", "$10–50k": "1만–5만 달러", "$50k+": "5만 달러 이상",
  },
  es: {
    "Under $15k": "Menos de $15 mil", "$15–30k": "$15–30 mil", "$30–50k": "$30–50 mil", "$50–80k": "$50–80 mil", "$80k+": "Más de $80 mil", "Not sure yet": "Aún no sé",
    "Under $50k": "Menos de $50 mil", "$50–75k": "$50–75 mil", "$75–110k": "$75–110 mil", "$110–150k": "$110–150 mil", "$150–200k": "$150–200 mil", "$200k+": "Más de $200 mil",
    "None yet": "Todavía nada", "Under $10k": "Menos de $10 mil", "$10–50k": "$10–50 mil", "$50k+": "Más de $50 mil",
  },
  zh: {
    "Under $15k": "低于 $15k", "$15–30k": "$15–30k", "$30–50k": "$30–50k", "$50–80k": "$50–80k", "$80k+": "$80k 以上", "Not sure yet": "还不确定",
    "Under $50k": "低于 $50k", "$50–75k": "$50–75k", "$75–110k": "$75–110k", "$110–150k": "$110–150k", "$150–200k": "$150–200k", "$200k+": "$200k 以上",
    "None yet": "还没有", "Under $10k": "低于 $10k", "$10–50k": "$10–50k", "$50k+": "$50k 以上",
  },
  ja: {
    "Under $15k": "$15k 未満", "$15–30k": "$15–30k", "$30–50k": "$30–50k", "$50–80k": "$50–80k", "$80k+": "$80k 以上", "Not sure yet": "まだ分からない",
    "Under $50k": "$50k 未満", "$50–75k": "$50–75k", "$75–110k": "$75–110k", "$110–150k": "$110–150k", "$150–200k": "$150–200k", "$200k+": "$200k 以上",
    "None yet": "まだない", "Under $10k": "$10k 未満", "$10–50k": "$10–50k", "$50k+": "$50k 以上",
  },
};

export function bandLabel(value, locale) {
  return BAND_LABELS[locale]?.[value] ?? value;
}
