// Counselor-note locale packs — the product's voice in en/ko/es/zh/ja.
// Same tone contract in every language: a private counselor who already did
// the thinking; warm, direct, plain; never alarmist. Deterministic template
// functions; proper nouns (FAFSA, National Merit…) stay English.
// Non-English prose machine-authored, pending owner review.

const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function dEN(iso) { const d = new Date(iso + "T12:00:00Z"); return `${MONTHS_EN[d.getUTCMonth()]} ${d.getUTCDate()}`; }
function dKO(iso) { const d = new Date(iso + "T12:00:00Z"); return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`; }
function dES(iso) { const d = new Date(iso + "T12:00:00Z"); const m = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]; return `${d.getUTCDate()} de ${m[d.getUTCMonth()]}`; }
function dZH(iso) { const d = new Date(iso + "T12:00:00Z"); return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`; }

const ORDINAL_EN = { 9: "ninth", 10: "tenth", 11: "eleventh", 12: "twelfth" };

export const NOTE_PACKS = {
  en: {
    date: dEN,
    flavor: {
      9: "Ninth grade is about habits and honest exploration more than achievements — colleges won't see most of this year, but everything later builds on it.",
      10: "Tenth grade is the quiet-but-important year: depth starts to beat breadth, and the first real signals — course rigor, a practice test — take shape.",
      11: "Junior year is the one colleges read most closely. Grades, testing, and the story all come into focus now, which is exactly why a calm plan matters.",
      12: "Senior fall is execution season — deadlines, essays, and money paperwork. The thinking is mostly done; what wins now is follow-through.",
    },
    semester: { fall: "in the fall semester", spring: "in the spring semester", summer: "in the summer stretch" },
    p1OnTrack: (name, grade, sem, flavor) =>
      `${name} is in ${ORDINAL_EN[grade]} grade, ${sem}, and from everything you've shared things are on track — nothing has been missed, and nothing here is urgent. ${flavor}`,
    p1Needs: (name, grade, sem, n, flavor) =>
      `${name} is in ${ORDINAL_EN[grade]} grade, ${sem}. ${n === 1 ? "One thing has" : `${n} things have`} come due recently — nothing that can't be recovered, and catching up this week costs far less than it will later. ${flavor}`,
    p2Next: (title, whenStr, why) => {
      const t = /^[A-Z]{2}/.test(title) ? title : title.charAt(0).toLowerCase() + title.slice(1);
      return `The next turn: ${t}, ${whenStr}. ${why}`;
    },
    whenBy: (dateStr) => `by ${dateStr}`,
    whenCatchup: "as the first catch-up",
    p2TestingDone: (name) => ` With testing behind ${name}, attention shifts fully to the story and the paperwork — a genuinely lighter load.`,
    p2None: (name) => `${name}'s road is fully mapped and there's no action needed right now — a rare and pleasant place to be.`,
    p3BaseFuture: (name, y) => `One quiet money note: starting January 1, ${y}, that year's household income is what the FAFSA will count when ${name} applies. Most families hear this too late to plan around it — you now have it on the calendar, with time to think.`,
    p3BaseCounting: (name) => `One quiet money note: this is the income year the FAFSA will count for ${name}. Nothing needs to happen today — just keep it in mind before any large financial moves, and the road will surface the next money stop when it's near.`,
    p3Fafsa: (dateStr) => `On money: the FAFSA opens ${dateStr}, and at many schools aid is first-come. Filing in the first weeks is one of the few easy wins left this year.`,
    p3Default: (name) => `Money stops are built into ${name}'s road right alongside the academic ones — when one gets close, it will surface here first, with time to act on it.`,
  },

  ko: {
    date: dKO,
    flavor: {
      9: "9학년은 성과보다 습관과 솔직한 탐색의 해예요. 대학이 올해를 직접 보진 않지만, 이후의 모든 것이 여기서 시작됩니다.",
      10: "10학년은 조용하지만 중요한 해예요. 넓이보다 깊이가 중요해지고, 과목 난이도나 연습 시험 같은 첫 신호들이 모양을 갖춥니다.",
      11: "11학년은 대학이 가장 자세히 보는 해예요. 성적, 시험, 스토리가 모두 또렷해지는 지금이야말로 차분한 계획이 힘을 발휘합니다.",
      12: "12학년 가을은 실행의 계절이에요 — 마감, 에세이, 학자금 서류. 고민은 거의 끝났고, 이제는 꾸준한 실행이 이깁니다.",
    },
    semester: { fall: "가을 학기", spring: "봄 학기", summer: "여름 방학" },
    p1OnTrack: (name, grade, sem, flavor) =>
      `${name}은(는) 지금 ${grade}학년 ${sem}이에요. 알려주신 내용으로 보면 모든 것이 순조롭습니다 — 놓친 것도 없고, 급한 것도 없어요. ${flavor}`,
    p1Needs: (name, grade, sem, n, flavor) =>
      `${name}은(는) 지금 ${grade}학년 ${sem}이에요. 최근 ${n}건의 할 일이 기한을 지났지만, 되돌릴 수 없는 건 하나도 없어요. 이번 주에 따라잡는 것이 나중보다 훨씬 쉽습니다. ${flavor}`,
    p2Next: (title, whenStr, why) => `다음 할 일: ${title} — ${whenStr}. ${why}`,
    whenBy: (dateStr) => `${dateStr}까지`,
    whenCatchup: "가장 먼저 따라잡을 일이에요",
    p2TestingDone: (name) => ` 시험이 끝난 ${name}은(는) 이제 스토리와 서류에만 집중하면 돼요 — 확실히 가벼워진 짐입니다.`,
    p2None: (name) => `${name}의 로드맵은 모두 준비되어 있고 지금 당장 할 일은 없어요 — 드물고 기분 좋은 상태네요.`,
    p3BaseFuture: (name, y) => `조용한 돈 이야기 하나: ${y}년 1월 1일부터 그 해의 가구 소득이 ${name}의 FAFSA 계산 기준이 됩니다. 대부분의 가정은 이 사실을 너무 늦게 알아요 — 이제 달력에 있으니, 생각할 시간이 충분합니다.`,
    p3BaseCounting: (name) => `조용한 돈 이야기 하나: 올해가 바로 ${name}의 FAFSA가 계산하는 소득 연도예요. 오늘 당장 할 일은 없어요 — 큰 돈을 움직이기 전에 기억만 해두시면, 다음 머니 스톱이 가까워질 때 여기서 먼저 알려드릴게요.`,
    p3Fafsa: (dateStr) => `돈 이야기: FAFSA가 ${dateStr}에 열려요. 많은 대학의 지원금은 선착순입니다. 첫 몇 주 안에 제출하는 것이 올해 남은 가장 쉬운 승리 중 하나예요.`,
    p3Default: (name) => `${name}의 로드맵에는 학업과 나란히 돈에 관한 정거장도 들어 있어요 — 가까워지면 여기서 먼저, 움직일 시간과 함께 알려드립니다.`,
  },

  es: {
    date: dES,
    flavor: {
      9: "Noveno grado se trata de hábitos y exploración honesta más que de logros — las universidades no verán la mayor parte de este año, pero todo lo que sigue se construye sobre él.",
      10: "Décimo es el año callado pero importante: la profundidad empieza a ganarle a la variedad, y aparecen las primeras señales reales — el rigor de las materias, un examen de práctica.",
      11: "Tercero de prepa (11.º) es el año que las universidades leen con más cuidado. Calificaciones, exámenes y la historia toman forma ahora — justo por eso importa un plan tranquilo.",
      12: "El otoño de 12.º es temporada de ejecución — fechas límite, ensayos y papeleo de dinero. Lo pensado ya está; ahora gana la constancia.",
    },
    semester: { fall: "en el semestre de otoño", spring: "en el semestre de primavera", summer: "en el verano" },
    p1OnTrack: (name, grade, sem, flavor) =>
      `${name} está en grado ${grade}, ${sem}, y con todo lo que has compartido las cosas van bien — no se ha perdido nada y nada aquí es urgente. ${flavor}`,
    p1Needs: (name, grade, sem, n, flavor) =>
      `${name} está en grado ${grade}, ${sem}. ${n === 1 ? "Una cosa venció" : `${n} cosas vencieron`} hace poco — nada que no se pueda recuperar, y ponerse al día esta semana cuesta mucho menos que después. ${flavor}`,
    p2Next: (title, whenStr, why) => {
      const t = /^[A-Z]{2}/.test(title) ? title : title.charAt(0).toLowerCase() + title.slice(1);
      return `El siguiente paso: ${t}, ${whenStr}. ${why}`;
    },
    whenBy: (dateStr) => `antes del ${dateStr}`,
    whenCatchup: "como primer pendiente",
    p2TestingDone: (name) => ` Con los exámenes ya resueltos, ${name} puede concentrarse por completo en la historia y el papeleo — una carga genuinamente más ligera.`,
    p2None: (name) => `El camino de ${name} está completamente trazado y no hay nada que hacer ahora mismo — un lugar raro y agradable.`,
    p3BaseFuture: (name, y) => `Una nota tranquila sobre dinero: a partir del 1 de enero de ${y}, el ingreso de ese año es lo que la FAFSA contará cuando ${name} aplique. La mayoría de las familias se entera demasiado tarde — tú ya lo tienes en el calendario, con tiempo para pensar.`,
    p3BaseCounting: (name) => `Una nota tranquila sobre dinero: este es el año de ingresos que la FAFSA contará para ${name}. No hay que hacer nada hoy — solo tenlo presente antes de movimientos financieros grandes; el camino avisará cuando se acerque la siguiente parada de dinero.`,
    p3Fafsa: (dateStr) => `Sobre dinero: la FAFSA abre el ${dateStr}, y en muchas universidades la ayuda es por orden de llegada. Presentarla en las primeras semanas es una de las pocas victorias fáciles que quedan este año.`,
    p3Default: (name) => `Las paradas de dinero están integradas en el camino de ${name} junto a las académicas — cuando una se acerque, aparecerá aquí primero, con tiempo para actuar.`,
  },

  zh: {
    date: dZH,
    flavor: {
      9: "9 年级重在习惯和真诚的探索，而不是成绩单 — 大学不会直接看到这一年，但之后的一切都建立在它之上。",
      10: "10 年级安静却重要：深度开始胜过广度，第一批真正的信号 — 课程强度、一次练习考试 — 正在成形。",
      11: "11 年级是大学看得最仔细的一年。成绩、考试和个人故事都在此刻清晰起来 — 正因如此，一份从容的计划最有价值。",
      12: "12 年级的秋天是执行的季节 — 截止日、文书、资金材料。该想的都想好了，现在拼的是坚持落实。",
    },
    semester: { fall: "秋季学期", spring: "春季学期", summer: "暑期" },
    p1OnTrack: (name, grade, sem, flavor) =>
      `${name}现在读 ${grade} 年级（${sem}）。就你提供的信息看，一切进展顺利 — 没有错过什么，也没有急事。${flavor}`,
    p1Needs: (name, grade, sem, n, flavor) =>
      `${name}现在读 ${grade} 年级（${sem}）。最近有 ${n} 件事到期了 — 都还来得及补，这周补上要比以后省力得多。${flavor}`,
    p2Next: (title, whenStr, why) => `下一步：${title}，${whenStr}。${why}`,
    whenBy: (dateStr) => `${dateStr}前完成`,
    whenCatchup: "作为第一件要补的事",
    p2TestingDone: (name) => `考试已经结束，${name}可以把注意力完全放在故事和材料上 — 担子实实在在轻了。`,
    p2None: (name) => `${name}的路线已经完整规划好，眼下无需行动 — 这是难得又舒心的状态。`,
    p3BaseFuture: (name, y) => `一条安静的资金提示：从 ${y} 年 1 月 1 日起，那一年的家庭收入就是 ${name} 申请时 FAFSA 的计算基准。大多数家庭知道得太晚 — 你现在已把它放进了日历，还有时间从容考虑。`,
    p3BaseCounting: (name) => `一条安静的资金提示：今年正是 FAFSA 为 ${name} 计算的收入年度。今天不需要做什么 — 只要在大额资金变动前记得这一点，下一个资金节点临近时这里会先提醒你。`,
    p3Fafsa: (dateStr) => `关于钱：FAFSA 将于 ${dateStr}开放，很多学校的资助先到先得。头几周内提交，是今年剩下的少数轻松取胜之一。`,
    p3Default: (name) => `${name}的路线图里，资金节点和学业节点排在一起 — 临近时会先在这里出现，留足行动时间。`,
  },

  ja: {
    date: dZH, // 月/日 formatting is shared with Chinese (10月1日)
    flavor: {
      9: "9年生は成果よりも、習慣づくりと素直な探索の年です。大学がこの1年を直接見ることはほぼありませんが、この先のすべてがここから積み上がります。",
      10: "10年生は静かながら大事な年。広さより深さが効き始め、科目の難度や練習テストといった最初のシグナルが形になります。",
      11: "11年生は大学が最も注意深く見る年です。成績・試験・ストーリーがいま焦点を結ぶからこそ、落ち着いた計画が生きてきます。",
      12: "12年生の秋は実行の季節 — 締切、エッセイ、お金の書類。考えることはほぼ終わり、あとはやり切るだけです。",
    },
    semester: { fall: "秋学期", spring: "春学期", summer: "夏休み" },
    p1OnTrack: (name, grade, sem, flavor) =>
      `${name}さんはいま${grade}年生（${sem}）です。伺った内容から見て、すべて順調です — 見落としはなく、急ぎのこともありません。${flavor}`,
    p1Needs: (name, grade, sem, n, flavor) =>
      `${name}さんはいま${grade}年生（${sem}）です。最近 ${n} 件が期日を過ぎましたが、取り戻せないものは一つもありません。今週のうちに追いつくのが、後になるよりずっと楽です。${flavor}`,
    p2Next: (title, whenStr, why) => `次の一手：${title}（${whenStr}）。${why}`,
    whenBy: (dateStr) => `${dateStr}まで`,
    whenCatchup: "最初に追いつくところから",
    p2TestingDone: (name) => `試験が終わった${name}さんは、これからストーリーと書類に専念できます — 荷物は確かに軽くなりました。`,
    p2None: (name) => `${name}さんのロードマップは整っていて、いますぐの行動は不要です — めったにない、心地よい状態です。`,
    p3BaseFuture: (name, y) => `お金の静かなメモをひとつ：${y}年1月1日からのその年の世帯収入が、${name}さんの出願時に FAFSA が数える基準になります。多くの家庭は知るのが遅すぎます — あなたはもうカレンダーに載せてあり、考える時間があります。`,
    p3BaseCounting: (name) => `お金の静かなメモをひとつ：今年がまさに、${name}さんの FAFSA が数える収入年です。今日やることはありません — 大きなお金を動かす前に思い出すだけで十分。次のマネーストップが近づいたら、ここで先にお知らせします。`,
    p3Fafsa: (dateStr) => `お金について：FAFSA は${dateStr}に開きます。多くの大学で支援は早い者勝ちです。最初の数週間で提出することが、今年残された数少ない確実な一勝です。`,
    p3Default: (name) => `${name}さんのロードマップには、学業と並んでお金の停留所も組み込まれています — 近づいたら、動ける時間を残してここで先にお知らせします。`,
  },
};
