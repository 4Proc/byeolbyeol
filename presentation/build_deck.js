const pptxgen = require("pptxgenjs");
const React = require("react");
const RDS = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");
const { applyTheme } = require("/root/.claude/skills/synced/ca13e787-3554-4cca-b373-05a3e3d48e8f_055cc6c2-0173-4037-8dd6-c641d2b63d7a/pptx/scripts/apply_theme.js");

const OUT = process.argv[2] || "deck.pptx";

// ---------- Theme ----------
const HEX = {
  ink: "1C2330", navy: "14284B", white: "FFFFFF", tint: "EEF3F8",
  blue: "1F4E79", teal: "0E7C86", orange: "D9772B", slate: "5B6B80",
  line: "C9D5E2", green: "2E8B57",
};
const THEME = {
  name: "Naval Admin AI",
  headFontFace: "맑은 고딕",
  bodyFontFace: "맑은 고딕",
  colors: {
    dk1: HEX.ink, lt1: HEX.white, dk2: HEX.navy, lt2: HEX.tint,
    accent1: HEX.blue, accent2: HEX.teal, accent3: HEX.orange,
    accent4: HEX.slate, accent5: HEX.line, accent6: HEX.green,
    hlink: HEX.blue, folHlink: HEX.slate,
  },
};

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.title = "AI를 활용한 함정 행정지원 업무 효율화 방안에 관한 연구";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;
const S = pres.shapes;

// ---------- Icons ----------
const iconCache = {};
async function icon(name, hex) {
  const key = name + hex;
  if (iconCache[key]) return iconCache[key];
  const Comp = fa[name];
  if (!Comp) throw new Error("icon missing " + name);
  const svg = RDS.renderToStaticMarkup(React.createElement(Comp, { color: "#" + hex, size: 256 }));
  const buf = await sharp(Buffer.from(svg)).resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return (iconCache[key] = "image/png;base64," + buf.toString("base64"));
}

// ---------- Layouts ----------
pres.defineSlideMaster({
  title: "TITLE",
  background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 2.05, w: 7.6, h: 1.9, fontSize: 36, bold: true, color: C.background1, valign: "top", align: "left", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "subtitle", type: "body", x: 0.8, y: 4.05, w: 7.6, h: 0.8, fontSize: 18, color: C.background2, valign: "top", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "event", type: "body", x: 0.8, y: 1.2, w: 7.6, h: 0.5, fontSize: 16, bold: true, color: C.accent5, valign: "top", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "author", type: "body", x: 0.8, y: 5.75, w: 7.6, h: 0.9, fontSize: 16, color: C.background1, valign: "top", margin: 0 }, text: "" } },
  ],
});

pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: C.background1 },
  margin: [0.5, 0.6, 0.6, 0.6],
  objects: [
    { placeholder: { options: { name: "kicker", type: "body", x: 0.6, y: 0.32, w: 9, h: 0.36, fontSize: 14, bold: true, color: C.accent2, margin: 0, valign: "middle" }, text: "" } },
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.7, w: 12.13, h: 0.7, fontSize: 30, bold: true, color: C.text2, margin: 0, valign: "middle", align: "left" }, text: "" } },
    { text: { text: "AI를 활용한 함정 행정지원 업무 효율화 방안에 관한 연구", options: { x: 0.6, y: 7.02, w: 9, h: 0.3, fontSize: 10, color: C.accent4, margin: 0 } } },
  ],
  slideNumber: { x: 12.23, y: 7.02, w: 0.5, h: 0.3, fontSize: 10, color: C.accent4, align: "right" },
});

// ---------- helpers ----------
let objId = 0;
const nm = (p) => `${p}-${++objId}`;
function T(slide, text, o) {
  slide.addText(text, Object.assign({ isTextBox: true, margin: 0, color: C.text1, fontSize: 14, valign: "top", objectName: nm("txt") }, o));
}
function box(slide, o) {
  slide.addShape(o.shape || S.ROUNDED_RECTANGLE, Object.assign({ rectRadius: 0.08, objectName: nm("box") }, o, { shape: undefined }));
}
async function iconCircle(slide, name, x, y, d, bg, fgHex) {
  slide.addShape(S.OVAL, { x, y, w: d, h: d, fill: { color: bg }, line: { color: bg, width: 0 }, objectName: nm("iconbg") });
  const pad = d * 0.24;
  slide.addImage({ data: await icon(name, fgHex), x: x + pad, y: y + pad, w: d - 2 * pad, h: d - 2 * pad, altText: name, objectName: nm("icon") });
}
function arrowRight(slide, x, y, w, h, color) {
  slide.addShape(S.RIGHT_ARROW, { x, y, w, h, fill: { color: color || C.accent4 }, line: { color: color || C.accent4, width: 0 }, objectName: nm("arrow") });
}
function arrowDown(slide, x, y, w, h, color) {
  slide.addShape(S.DOWN_ARROW, { x, y, w, h, fill: { color: color || C.accent4 }, line: { color: color || C.accent4, width: 0 }, objectName: nm("arrow") });
}
const bullets = (items, o = {}) => items.map((t, i) => ({ text: t, options: Object.assign({ bullet: { indent: 14 }, breakLine: i < items.length - 1, paraSpaceAfter: 3 }, o) }));

(async () => {
  // =====================================================================
  // 1. 표지
  // =====================================================================
  pres.addSection({ title: "표지" });
  {
    const s = pres.addSlide({ masterName: "TITLE", sectionTitle: "표지" });
    s.addText("[학술대회명]", { placeholder: "event" });
    s.addText("AI를 활용한 함정 행정지원\n업무 효율화 방안에 관한 연구", { placeholder: "title" });
    s.addText("함정 승조원의 반복 행정업무 경감을 위한\nAI 기반 행정지원 기능 설계", { placeholder: "subtitle" });
    s.addText("[발표자]  |  [소속]\n[발표일]", { placeholder: "author" });

    // Right visual: AI hub + 4 functions
    const cx = 10.75, cy = 3.6;
    s.addShape(S.OVAL, { x: cx - 1.05, y: cy - 1.05, w: 2.1, h: 2.1, fill: { color: C.accent1 }, line: { color: C.accent5, width: 1.5 }, objectName: "cover-hub" });
    s.addImage({ data: await icon("FaShip", HEX.white), x: cx - 0.5, y: cy - 0.72, w: 1.0, h: 1.0, altText: "함정", objectName: "cover-ship" });
    T(s, "행정지원 AI", { x: cx - 1.0, y: cy + 0.35, w: 2.0, h: 0.4, align: "center", fontSize: 14, bold: true, color: C.background1 });
    const fns = [
      ["FaCalendarAlt", "당직표", -1.75, -2.35],
      ["FaBook", "항해일지", 0.55, -2.35],
      ["FaUmbrellaBeach", "휴가계획", -1.75, 1.45],
      ["FaShareAlt", "결재·공유", 0.55, 1.45],
    ];
    for (const [ic, label, dx, dy] of fns) {
      box(s, { x: cx + dx, y: cy + dy, w: 1.2 + 0.0, h: 0.9, fill: { color: C.background1 }, line: { color: C.background1, width: 0 } });
      s.addImage({ data: await icon(ic, HEX.navy), x: cx + dx + 0.45, y: cy + dy + 0.1, w: 0.3, h: 0.3, altText: label, objectName: nm("icon") });
      T(s, label, { x: cx + dx, y: cy + dy + 0.47, w: 1.2, h: 0.35, align: "center", fontSize: 12, bold: true, color: C.text2 });
    }
    s.addNotes("안녕하십니까. 'AI를 활용한 함정 행정지원 업무 효율화 방안에 관한 연구'를 발표할 [발표자]입니다. 본 연구는 함정 승조원이 본연의 임무와 함께 수행하는 당직표 작성, 항해일지 기록, 휴가 관리 같은 반복 행정업무를 AI로 지원하는 기능을 설계한 연구입니다. 개요, 기존 방식의 한계와 연구 목적, 제안 내용, 결론 및 향후 계획 순으로 말씀드리겠습니다.");
  }

  // =====================================================================
  // 2. 개요 - 연구 배경
  // =====================================================================
  pres.addSection({ title: "개요" });
  {
    const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "개요" });
    s.addText("01  개요", { placeholder: "kicker" });
    s.addText("연구 배경: 한정된 인원이 임무와 행정을 함께 수행", { placeholder: "title" });

    T(s, "함정 승조원의 업무 구조", { x: 0.6, y: 1.6, w: 7, h: 0.4, fontSize: 16, bold: true, color: C.text2 });
    // card A
    const cards = [
      { x: 0.6, title: "본연의 임무", items: [["FaCrosshairs", "작전"], ["FaTools", "정비"], ["FaRunning", "훈련"]], bg: C.accent1, fg: HEX.white },
      { x: 4.3, title: "반복 행정업무", items: [["FaCalendarAlt", "당직표"], ["FaBook", "항해일지"], ["FaUmbrellaBeach", "휴가 관리"]], bg: C.accent3, fg: HEX.white },
    ];
    for (const c of cards) {
      box(s, { x: c.x, y: 2.1, w: 3.3, h: 1.55, fill: { color: C.background2 }, line: { color: C.accent5, width: 1 } });
      T(s, c.title, { x: c.x + 0.2, y: 2.2, w: 2.9, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
      for (let i = 0; i < 3; i++) {
        const ix = c.x + 0.2 + i * 1.0;
        await iconCircle(s, c.items[i][0], ix + 0.2, 2.6, 0.5, c.bg, c.fg);
        T(s, c.items[i][1], { x: ix - 0.1, y: 3.15, w: 1.1, h: 0.35, fontSize: 12, align: "center", color: C.text1 });
      }
    }
    T(s, "+", { x: 3.9, y: 2.55, w: 0.4, h: 0.6, fontSize: 28, bold: true, align: "center", valign: "middle", color: C.accent4 });
    arrowDown(s, 3.85, 3.75, 0.5, 0.35, C.accent4);

    box(s, { x: 0.6, y: 4.2, w: 7.0, h: 1.75, fill: { color: C.text2 }, line: { color: C.text2, width: 0 } });
    T(s, "한정된 인원으로 운용되는 함정의 특성", { x: 0.85, y: 4.32, w: 6.5, h: 0.38, fontSize: 15, bold: true, color: C.background1 });
    const effects = [["FaHourglassHalf", "업무 부담 가중"], ["FaHeartbeat", "직무 스트레스 증가"], ["FaClock", "작전임무 준비\n시간 확보 어려움"]];
    for (let i = 0; i < 3; i++) {
      const ex = 0.85 + i * 2.25;
      await iconCircle(s, effects[i][0], ex, 4.92, 0.6, C.background1, HEX.navy);
      T(s, effects[i][1], { x: ex + 0.7, y: 4.85, w: 1.5, h: 0.75, fontSize: 13, bold: true, valign: "middle", color: C.background1 });
    }
    T(s, "반복 행정업무가 본연의 임무 수행 여건을 잠식", { x: 0.6, y: 6.15, w: 7.0, h: 0.4, fontSize: 15, bold: true, italic: true, color: C.accent3 });

    // right panel
    box(s, { x: 8.0, y: 1.6, w: 4.73, h: 5.05, fill: { color: C.background2 }, line: { color: C.accent5, width: 1 } });
    await iconCircle(s, "FaRobot", 8.25, 1.82, 0.55, C.accent2, HEX.white);
    T(s, "국방 분야 AI 도입 흐름", { x: 8.95, y: 1.85, w: 3.6, h: 0.5, fontSize: 16, bold: true, valign: "middle", color: C.text2 });
    T(s, bullets([
      "행정·인사 등 국방운영 분야를 중심으로 생성형 AI 적용 추진",
      "반복적이고 정형화된 업무가 우선 적용 대상",
    ]), { x: 8.25, y: 2.6, w: 4.25, h: 1.2, fontSize: 14 });
    s.addShape(S.LINE, { x: 8.25, y: 3.95, w: 4.25, h: 0, line: { color: C.accent5, width: 1 }, objectName: "divider" });
    await iconCircle(s, "FaLightbulb", 8.25, 4.2, 0.55, C.accent3, HEX.white);
    T(s, "착안점", { x: 8.95, y: 4.22, w: 3.5, h: 0.5, fontSize: 16, bold: true, valign: "middle", color: C.text2 });
    T(s, "함정 행정업무도 근무 규정, 인원 현황, 항해 자료 같은 정형 데이터를 기반으로 하므로 AI로 효율화할 수 있음", { x: 8.25, y: 4.95, w: 4.25, h: 1.4, fontSize: 15 });

    s.addNotes("함정 승조원은 작전, 정비, 훈련이라는 본연의 임무와 함께 당직표 작성, 항해일지 기록, 휴가 관리 같은 반복 행정업무를 병행합니다. 함정은 한정된 인원으로 운용되기 때문에 이러한 행정업무가 업무 부담과 직무 스트레스를 키우고, 작전임무를 준비할 시간을 확보하기 어렵게 만듭니다. 한편 국방 분야에서는 행정, 인사 등 국방운영 분야를 중심으로 생성형 AI 적용이 추진되고 있습니다. 함정 행정업무 역시 규정과 정형 데이터에 기반하고 있어 AI 적용 대상으로 적합하다는 점이 본 연구의 착안점입니다.");
  }

  // =====================================================================
  // 3. 기존 방식의 한계
  // =====================================================================
  pres.addSection({ title: "기존 시스템의 한계 및 연구 목적" });
  {
    const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "기존 시스템의 한계 및 연구 목적" });
    s.addText("02  기존 시스템의 한계", { placeholder: "kicker" });
    s.addText("기존 행정업무 방식의 한계", { placeholder: "title" });

    const hdr = (t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.text2 }, fontSize: 14, valign: "middle" } });
    const c1 = (t) => ({ text: t, options: { bold: true, color: C.text2, fill: { color: C.background2 }, fontSize: 15, valign: "middle" } });
    const cl = (items) => ({ text: bullets(items), options: { fontSize: 13, color: C.text1, valign: "middle" } });
    const rows = [
      [hdr("업무"), hdr("현행 처리 방식"), hdr("한계")],
      [c1("당직표 작성"), cl(["담당자가 인원 현황과 근무 규정을 대조하며 수기·엑셀로 작성", "휴가·교육 등 열외 발생 시 재작성"]), cl(["개인별 당직 횟수 편차로 형평성 시비", "연속 근무 등 휴식 보장 기준 누락 가능", "변경 때마다 전면 재작업"])],
      [c1("항해일지 기록"), cl(["항해 계기·관측 값을 시각별로 옮겨 기록", "작성자마다 표현과 서식이 다름"]), cl(["옮겨 적는 과정의 오기·누락", "당직 중 작성으로 업무 집중도 저하", "기록 품질의 작성자 의존"])],
      [c1("휴가 관리"), cl(["개인 희망을 수합해 부대 일정과 수작업으로 조율", "개별 서면 결재·공지"]), cl(["출항·훈련 일정과 휴가 중복", "최소 잔류 인원 미확보 위험", "결재·공유 지연"])],
    ];
    s.addTable(rows, { x: 0.6, y: 1.6, w: 12.13, colW: [2.0, 5.0, 5.13], rowH: [0.45, 1.05, 1.05, 1.05], border: { type: "solid", pt: 1, color: HEX.line }, margin: [0.06, 0.12, 0.06, 0.12], objectName: "limits-table" });

    T(s, "공통 한계", { x: 0.6, y: 5.55, w: 1.6, h: 0.9, fontSize: 16, bold: true, valign: "middle", color: C.text2 });
    const common = [["FaUserCog", "담당자 숙련도에 의존", "속인적 업무, 인수인계 부담"], ["FaRedo", "반복 작업에 시간 소모", "매주·매 항해 같은 작업 반복"], ["FaExclamationTriangle", "오류의 사후 발견", "검증 절차 부재로 재작업"]];
    for (let i = 0; i < 3; i++) {
      const x = 2.25 + i * 3.53;
      box(s, { x, y: 5.5, w: 3.33, h: 1.0, fill: { color: C.background2 }, line: { color: C.accent5, width: 1 } });
      await iconCircle(s, common[i][0], x + 0.15, 5.7, 0.6, C.accent3, HEX.white);
      T(s, common[i][1], { x: x + 0.9, y: 5.62, w: 2.35, h: 0.38, fontSize: 14, bold: true, color: C.text2 });
      T(s, common[i][2], { x: x + 0.9, y: 6.0, w: 2.35, h: 0.38, fontSize: 12, color: C.accent4 });
    }
    s.addNotes("현재 함정의 행정업무는 대부분 담당자가 수기나 엑셀로 처리합니다. 당직표는 인원 현황과 근무 규정을 일일이 대조해 작성하기 때문에 개인별 당직 횟수 편차로 형평성 시비가 생기거나, 휴식 보장 기준을 놓칠 수 있고, 열외가 생길 때마다 다시 작성해야 합니다. 항해일지는 계기 값을 옮겨 적는 과정에서 오기와 누락이 생기고 작성자마다 품질이 다릅니다. 휴가 관리는 부대 일정과 개인 희망을 수작업으로 조율하다 보니 일정이 겹치거나 결재와 공유가 늦어집니다. 정리하면 담당자 숙련도에 의존하고, 같은 작업을 반복하며, 오류를 사후에야 발견한다는 공통 한계가 있습니다.");
  }

  // =====================================================================
  // 4. 연구 목적
  // =====================================================================
  {
    const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "기존 시스템의 한계 및 연구 목적" });
    s.addText("02  연구 목적", { placeholder: "kicker" });
    s.addText("연구 목적: 정형화된 행정 데이터를 AI로 처리", { placeholder: "title" });

    T(s, "함정 행정 데이터의 특성과 AI 적용 방식", { x: 0.6, y: 1.6, w: 7.4, h: 0.4, fontSize: 16, bold: true, color: C.text2 });
    const hdr = (t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.text2 }, fontSize: 14, valign: "middle" } });
    const c1 = (t) => ({ text: t, options: { bold: true, color: C.text2, fill: { color: C.background2 }, fontSize: 14, valign: "middle" } });
    const c = (t) => ({ text: t, options: { fontSize: 13, color: C.text1, valign: "middle" } });
    s.addTable([
      [hdr("데이터"), hdr("특성"), hdr("AI 적용 방식")],
      [c1("근무 규정"), c("명문화된 규칙\n(휴식시간, 연속근무 기준)"), c("제약조건으로 변환해\n당직 자동 배정")],
      [c1("인원 현황"), c("정형 명부\n(직별, 자격, 열외 사항)"), c("배정 대상과\n가용 인원 산출")],
      [c1("항해 자료"), c("시각별 수치\n(위치, 침로, 속력, 기상)"), c("표준 서식 문장으로\n자동 작성")],
      [c1("부대 일정·\n개인 희망"), c("날짜 기반 정형 정보"), c("일정 충돌 검사와\n휴가계획안 생성")],
    ], { x: 0.6, y: 2.1, w: 7.4, colW: [1.7, 2.9, 2.8], rowH: [0.45, 0.8, 0.8, 0.8, 0.8], border: { type: "solid", pt: 1, color: HEX.line }, margin: [0.05, 0.12, 0.05, 0.12], objectName: "data-table" });

    box(s, { x: 0.6, y: 5.95, w: 7.4, h: 0.65, fill: { color: C.background2 }, line: { color: C.accent2, width: 1 } });
    s.addImage({ data: await icon("FaCheckCircle", HEX.teal), x: 0.8, y: 6.1, w: 0.35, h: 0.35, altText: "적합", objectName: "fit-icon" });
    T(s, "규칙이 명확해 AI 결과를 검증하기 쉬움 → 행정업무는 AI 적용에 적합", { x: 1.3, y: 5.95, w: 6.6, h: 0.65, fontSize: 14, bold: true, valign: "middle", color: C.accent2 });

    // right: purpose
    box(s, { x: 8.4, y: 1.6, w: 4.33, h: 2.0, fill: { color: C.text2 }, line: { color: C.text2, width: 0 } });
    await iconCircle(s, "FaBullseye", 8.62, 1.8, 0.5, C.accent3, HEX.white);
    T(s, "연구 목적", { x: 9.25, y: 1.8, w: 3.2, h: 0.5, fontSize: 16, bold: true, valign: "middle", color: C.background1 });
    T(s, "승조원의 반복 행정업무 부담을 줄이는 AI 기반 함정 행정지원 기능을 설계하고 기대효과를 제시", { x: 8.62, y: 2.45, w: 3.9, h: 1.05, fontSize: 15, color: C.background1 });

    T(s, "연구 내용", { x: 8.4, y: 3.85, w: 4.33, h: 0.4, fontSize: 16, bold: true, color: C.text2 });
    const items = [
      ["4대 기능 설계", "당직표, 항해일지, 휴가계획·결재, 공유"],
      ["담당자 중심 처리 절차", "입력 → AI 초안 → 검토·수정 → 결재·공유"],
      ["보안을 고려한 도입 방향", "보안 환경에 맞는 운용 방식과 단계적 도입"],
    ];
    for (let i = 0; i < 3; i++) {
      const y = 4.35 + i * 0.8;
      s.addShape(S.OVAL, { x: 8.4, y: y + 0.08, w: 0.45, h: 0.45, fill: { color: C.accent2 }, line: { color: C.accent2, width: 0 }, objectName: nm("num") });
      T(s, String(i + 1), { x: 8.4, y: y + 0.08, w: 0.45, h: 0.45, align: "center", valign: "middle", fontSize: 14, bold: true, color: C.background1 });
      T(s, items[i][0], { x: 9.0, y, w: 3.73, h: 0.33, fontSize: 14, bold: true, color: C.text2 });
      T(s, items[i][1], { x: 9.0, y: y + 0.33, w: 3.73, h: 0.33, fontSize: 12, color: C.accent4 });
    }
    s.addNotes("함정 행정업무에 쓰이는 데이터를 보면 근무 규정은 명문화된 규칙이고, 인원 현황은 정형화된 명부이며, 항해 자료는 시각별 수치 데이터입니다. 부대 일정과 개인 희망도 날짜 기반의 정형 정보입니다. 이처럼 규칙이 명확한 데이터는 AI 결과를 검증하기도 쉬워 AI 적용에 적합합니다. 따라서 본 연구는 승조원의 반복 행정업무 부담을 줄이는 AI 기반 함정 행정지원 기능을 설계하고 기대효과를 제시하는 것을 목적으로 합니다. 구체적으로 네 가지 기능 설계, 담당자 중심의 처리 절차, 보안 환경을 고려한 도입 방향을 다룹니다.");
  }

  // =====================================================================
  // 5. 제안 1 - 구성과 처리 흐름
  // =====================================================================
  pres.addSection({ title: "제안내용" });
  {
    const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "제안내용" });
    s.addText("03  제안내용 ① 시스템 구성", { placeholder: "kicker" });
    s.addText("함정 행정지원 AI의 구성과 처리 흐름", { placeholder: "title" });

    const top = 1.6;
    // input column
    T(s, "입력 데이터", { x: 0.6, y: top, w: 2.3, h: 0.35, fontSize: 14, bold: true, color: C.text2, align: "center" });
    const inputs = ["인원 현황", "근무 규정", "항해 자료", "부대 일정", "개인 희망"];
    inputs.forEach((t, i) => {
      box(s, { x: 0.6, y: top + 0.45 + i * 0.52, w: 2.3, h: 0.42, fill: { color: C.background2 }, line: { color: C.accent5, width: 1 } });
      T(s, t, { x: 0.6, y: top + 0.45 + i * 0.52, w: 2.3, h: 0.42, fontSize: 13, align: "center", valign: "middle" });
    });
    arrowRight(s, 2.98, 2.95, 0.32, 0.4);

    // AI box
    box(s, { x: 3.38, y: top, w: 4.7, h: 3.0, fill: { color: C.background2 }, line: { color: C.text2, width: 1.5 } });
    s.addImage({ data: await icon("FaServer", HEX.navy), x: 3.55, y: top + 0.1, w: 0.32, h: 0.32, altText: "서버", objectName: "srv-icon" });
    T(s, "함정 행정지원 AI (함 내 폐쇄망 서버)", { x: 3.95, y: top + 0.08, w: 4.05, h: 0.36, fontSize: 14, bold: true, color: C.text2, valign: "middle" });
    const mods = [
      ["FaBalanceScale", "규칙 기반 배정 엔진", "근무 규정·형평성 조건으로 당직·휴가 배정"],
      ["FaRobot", "생성형 AI (경량 sLLM)", "항해 자료를 표준 서식 문장으로 작성"],
      ["FaSearch", "검증 모듈", "규정 위반·누락·이상값 자동 점검"],
    ];
    for (let i = 0; i < 3; i++) {
      const y = top + 0.55 + i * 0.8;
      box(s, { x: 3.55, y, w: 4.36, h: 0.7, fill: { color: C.background1 }, line: { color: C.accent5, width: 1 } });
      await iconCircle(s, mods[i][0], 3.65, y + 0.1, 0.5, i === 1 ? C.accent2 : C.accent1, HEX.white);
      T(s, mods[i][1], { x: 4.25, y: y + 0.05, w: 3.6, h: 0.3, fontSize: 13, bold: true, color: C.text2 });
      T(s, mods[i][2], { x: 4.25, y: y + 0.35, w: 3.6, h: 0.3, fontSize: 11, color: C.accent4 });
    }
    arrowRight(s, 8.16, 2.95, 0.32, 0.4);

    // outputs
    T(s, "AI 초안", { x: 8.56, y: top, w: 1.9, h: 0.35, fontSize: 14, bold: true, color: C.text2, align: "center" });
    const outs = [["FaCalendarAlt", "당직표"], ["FaBook", "항해일지"], ["FaUmbrellaBeach", "휴가계획"]];
    for (let i = 0; i < 3; i++) {
      const y = top + 0.45 + i * 0.86;
      box(s, { x: 8.56, y, w: 1.9, h: 0.72, fill: { color: C.background1 }, line: { color: C.accent1, width: 1.25 } });
      s.addImage({ data: await icon(outs[i][0], HEX.blue), x: 8.72, y: y + 0.2, w: 0.32, h: 0.32, altText: outs[i][1], objectName: nm("icon") });
      T(s, outs[i][1], { x: 9.12, y, w: 1.3, h: 0.72, fontSize: 14, bold: true, valign: "middle", color: C.text2 });
    }
    arrowRight(s, 10.54, 2.95, 0.32, 0.4);

    // approval/share
    T(s, "결재·공유", { x: 10.94, y: top, w: 1.79, h: 0.35, fontSize: 14, bold: true, color: C.text2, align: "center" });
    const fin = [["FaStamp", "전자결재\n자동 상신"], ["FaBell", "함 내 게시·\n알림"]];
    for (let i = 0; i < 2; i++) {
      const y = top + 0.45 + i * 1.3;
      box(s, { x: 10.94, y, w: 1.79, h: 1.15, fill: { color: C.text2 }, line: { color: C.text2, width: 0 } });
      s.addImage({ data: await icon(fin[i][0], HEX.white), x: 11.66, y: y + 0.12, w: 0.35, h: 0.35, altText: fin[i][1], objectName: nm("icon") });
      T(s, fin[i][1], { x: 10.94, y: y + 0.5, w: 1.79, h: 0.6, fontSize: 13, bold: true, align: "center", color: C.background1 });
    }

    // process
    T(s, "처리 절차", { x: 0.6, y: 4.85, w: 3, h: 0.35, fontSize: 16, bold: true, color: C.text2 });
    T(s, "■ 담당자", { x: 9.5, y: 4.85, w: 1.5, h: 0.35, fontSize: 12, bold: true, color: C.text2, align: "right" });
    T(s, "■ AI", { x: 11.1, y: 4.85, w: 1.63, h: 0.35, fontSize: 12, bold: true, color: C.accent2, align: "right" });
    const steps = [["① 기본정보 입력", true], ["② AI 초안 생성", false], ["③ 검토·수정", true], ["④ 결재 상신", false], ["⑤ 공유", false]];
    const sw = 2.5;
    steps.forEach(([t, human], i) => {
      const x = 0.6 + i * (sw - 0.09);
      s.addShape(i === 0 ? S.PENTAGON : S.CHEVRON, { x, y: 5.3, w: sw, h: 0.75, fill: { color: human ? C.text2 : C.accent2 }, line: { color: C.background1, width: 1 }, objectName: nm("step") });
      T(s, t, { x: x + (i === 0 ? 0.15 : 0.35), y: 5.3, w: sw - 0.6, h: 0.75, fontSize: 14, bold: true, valign: "middle", align: "center", color: C.background1 });
    });
    T(s, [
      { text: "AI는 초안 작성과 반복 처리를, 담당자는 검토·판단·승인을 맡는 ", options: {} },
      { text: "Human-in-the-loop", options: { bold: true, color: C.accent2 } },
      { text: " 구조", options: {} },
    ], { x: 0.6, y: 6.25, w: 12.13, h: 0.45, fontSize: 15, valign: "middle", color: C.text1 });

    s.addNotes("제안하는 함정 행정지원 AI의 구성입니다. 담당자가 인원 현황, 근무 규정, 항해 자료, 부대 일정, 개인 희망 같은 기본 정보를 입력하면, 함 내 폐쇄망 서버의 AI가 처리합니다. AI는 세 모듈로 구성됩니다. 규칙 기반 배정 엔진은 근무 규정과 형평성 조건으로 당직과 휴가를 배정하고, 경량 생성형 AI는 항해 자료를 표준 서식 문장으로 작성하며, 검증 모듈은 규정 위반이나 누락, 이상값을 점검합니다. 그 결과 당직표, 항해일지, 휴가계획 초안이 만들어지고 결재 상신과 공유까지 이어집니다. 핵심은 AI가 초안을 만들고 담당자가 검토, 수정, 승인을 맡는 Human-in-the-loop 구조라는 점입니다. 최종 판단과 책임은 사람이 집니다.");
  }

  // =====================================================================
  // 6. 제안 2 - 기능별 세부 설계
  // =====================================================================
  {
    const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "제안내용" });
    s.addText("03  제안내용 ② 핵심 기능", { placeholder: "kicker" });
    s.addText("핵심 기능 세부 설계", { placeholder: "title" });

    const fns = [
      { ic: "FaCalendarAlt", name: "당직표 자동 생성", input: "인원 현황·직별 자격, 열외 인원(휴가·교육·환자)",
        proc: ["연속 당직 금지", "당직 후 최소 휴식시간 보장", "당직·야간 횟수 균등 배분", "직별 자격 조건 충족"], out: "당직표 초안 + 개인별 근무 통계" },
      { ic: "FaBook", name: "항해일지 자동 작성", input: "위치·침로·속력, 기상·해상 상태, 주요 사건(입출항·훈련)",
        proc: ["시각별 항해 자료 정리", "표준 서식 문장 생성", "누락·이상값 표시"], out: "표준 서식의 항해일지 초안" },
      { ic: "FaUmbrellaBeach", name: "휴가계획 생성·결재 상신", input: "부대 일정(출항·훈련·점검), 개인 희망일·잔여 휴가",
        proc: ["최소 잔류 인원 확보", "개인 희망 최대 반영", "중복 시 우선순위 조정"], out: "휴가계획안 → 결재 자동 상신" },
    ];
    const cw = 3.91, gap = 0.2, top = 1.55;
    for (let i = 0; i < 3; i++) {
      const f = fns[i], x = 0.6 + i * (cw + gap);
      box(s, { x, y: top, w: cw, h: 4.6, fill: { color: C.background1 }, line: { color: C.accent5, width: 1 },
        shadow: { type: "outer", color: "8899AA", opacity: 0.25, blur: 4, offset: 1.5, angle: 90 } });
      box(s, { x, y: top, w: cw, h: 0.8, fill: { color: C.text2 }, line: { color: C.text2, width: 0 } });
      await iconCircle(s, f.ic, x + 0.18, top + 0.14, 0.52, C.background1, HEX.navy);
      T(s, f.name, { x: x + 0.82, y: top, w: cw - 0.9, h: 0.8, fontSize: 16, bold: true, valign: "middle", color: C.background1 });

      const label = (t, y, col) => {
        box(s, { x: x + 0.2, y, w: 0.95, h: 0.3, fill: { color: col }, line: { color: col, width: 0 } });
        T(s, t, { x: x + 0.2, y, w: 0.95, h: 0.3, fontSize: 11, bold: true, align: "center", valign: "middle", color: C.background1 });
      };
      label("입력", top + 0.95, C.accent4);
      T(s, f.input, { x: x + 0.2, y: top + 1.3, w: cw - 0.4, h: 0.65, fontSize: 13 });
      label("AI 처리", top + 2.0, C.accent2);
      T(s, bullets(f.proc), { x: x + 0.2, y: top + 2.35, w: cw - 0.4, h: 1.2, fontSize: 13 });
      label("산출", top + 3.6, C.accent3);
      T(s, f.out, { x: x + 0.2, y: top + 3.95, w: cw - 0.4, h: 0.5, fontSize: 14, bold: true, color: C.text2 });
    }
    box(s, { x: 0.6, y: 6.3, w: 12.13, h: 0.6, fill: { color: C.background2 }, line: { color: C.accent5, width: 1 } });
    s.addImage({ data: await icon("FaShareAlt", HEX.teal), x: 0.8, y: 6.43, w: 0.34, h: 0.34, altText: "공유", objectName: "share-icon" });
    T(s, [
      { text: "공유 기능  ", options: { bold: true, color: C.accent2 } },
      { text: "확정 문서를 함 내 게시·개인 알림으로 전파하고, 수정 이력을 남겨 변경 사항을 추적", options: {} },
    ], { x: 1.3, y: 6.3, w: 11.3, h: 0.6, fontSize: 14, valign: "middle" });

    s.addNotes("핵심 기능 세 가지를 입력, AI 처리, 산출로 나누어 설계했습니다. 첫째, 당직표 자동 생성은 인원 현황과 열외 인원을 입력받아 연속 당직 금지, 최소 휴식시간 보장, 당직과 야간 횟수 균등 배분, 직별 자격 충족이라는 제약조건을 만족하는 당직표 초안을 만들고, 개인별 근무 통계를 함께 제시해 형평성을 확인할 수 있게 합니다. 둘째, 항해일지 자동 작성은 위치, 침로, 속력, 기상, 주요 사건을 바탕으로 표준 서식의 항해일지 초안을 작성하고 누락이나 이상값을 표시합니다. 셋째, 휴가계획은 부대 일정과 개인 희망을 고려해 최소 잔류 인원을 확보하면서 희망을 최대한 반영한 계획안을 만들고 결재를 자동으로 상신합니다. 확정된 문서는 공유 기능으로 함 내에 게시하고 알림을 보내며, 수정 이력을 관리합니다.");
  }

  // =====================================================================
  // 7. 제안 3 - 보안 운용·단계적 도입
  // =====================================================================
  {
    const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "제안내용" });
    s.addText("03  제안내용 ③ 운용 및 도입", { placeholder: "kicker" });
    s.addText("보안 환경을 고려한 운용 방식과 단계적 도입", { placeholder: "title" });

    T(s, "보안 운용 원칙", { x: 0.6, y: 1.6, w: 6, h: 0.4, fontSize: 16, bold: true, color: C.text2 });
    const rules = [
      ["FaLock", "폐쇄망 운용", "외부 인터넷과 연결하지 않고 함 내·부대 내부망 서버에서만 운용"],
      ["FaMicrochip", "경량 모델 온프레미스 탑재", "함정 서버 자원에 맞는 경량 sLLM과 규칙 엔진을 내부에 설치"],
      ["FaUserShield", "접근 통제", "직책별 권한을 부여하고 사용·수정 이력을 기록"],
      ["FaEyeSlash", "데이터 보호", "인적사항·항적 등 민감정보의 외부 반출 차단, 학습 시 비식별화"],
    ];
    for (let i = 0; i < 4; i++) {
      const y = 2.1 + i * 1.18;
      box(s, { x: 0.6, y, w: 6.0, h: 1.05, fill: { color: C.background2 }, line: { color: C.accent5, width: 1 } });
      await iconCircle(s, rules[i][0], 0.78, y + 0.2, 0.65, C.text2, HEX.white);
      T(s, rules[i][1], { x: 1.6, y: y + 0.1, w: 4.9, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
      T(s, rules[i][2], { x: 1.6, y: y + 0.45, w: 4.9, h: 0.55, fontSize: 13 });
    }

    T(s, "단계적 도입 방향", { x: 7.0, y: 1.6, w: 5.73, h: 0.4, fontSize: 16, bold: true, color: C.text2 });
    const stages = [
      { t: "1단계\n시범 적용", d: ["육상 부대·교육 함정", "당직표 기능 우선", "보안·운용 기준 검증"], top: 4.3, col: C.accent2 },
      { t: "2단계\n함정 탑재", d: ["함 내부망 서버 탑재", "항해일지·휴가 결재로 기능 확대"], top: 3.3, col: C.accent1 },
      { t: "3단계\n확대·연동", d: ["전 함정으로 확대", "국방 인사·전자결재 체계와 연동"], top: 2.3, col: C.text2 },
    ];
    const bw = 1.83;
    stages.forEach((st, i) => {
      const x = 7.0 + i * (bw + 0.12);
      box(s, { x, y: st.top, w: bw, h: 6.75 - st.top, fill: { color: st.col }, line: { color: st.col, width: 0 } });
      T(s, st.t, { x: x + 0.15, y: st.top + 0.15, w: bw - 0.3, h: 0.75, fontSize: 15, bold: true, color: C.background1 });
      T(s, bullets(st.d, { paraSpaceAfter: 4 }), { x: x + 0.15, y: st.top + 0.95, w: bw - 0.25, h: 1.35, fontSize: 12, color: C.background1 });
    });
    T(s, "위험이 낮은 기능부터\n단계적으로 확대", { x: 7.0, y: 2.35, w: 3.7, h: 0.75, fontSize: 13, italic: true, color: C.accent4 });

    s.addNotes("함정은 외부망과 분리된 보안 환경이므로 운용 방식이 중요합니다. 첫째, 외부 인터넷과 연결하지 않고 함 내 또는 부대 내부망 서버에서만 운용합니다. 둘째, 함정 서버 자원을 고려해 경량 sLLM과 규칙 엔진을 내부에 직접 설치합니다. 셋째, 직책별 권한을 부여하고 사용과 수정 이력을 기록합니다. 넷째, 인적사항이나 항적 같은 민감정보가 외부로 나가지 않도록 차단하고 학습에 쓸 때는 비식별화합니다. 도입은 3단계로 제안합니다. 1단계는 육상 부대나 교육 함정에서 위험이 낮은 당직표 기능부터 시범 적용하며 보안과 운용 기준을 검증합니다. 2단계는 함 내부망 서버에 탑재해 항해일지와 휴가 결재로 기능을 넓힙니다. 3단계는 전 함정으로 확대하고 국방 인사, 전자결재 체계와 연동합니다.");
  }

  // =====================================================================
  // 8. 결론 및 향후 계획
  // =====================================================================
  pres.addSection({ title: "결론 및 향후 계획" });
  {
    const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "결론 및 향후 계획" });
    s.addText("04  결론 및 향후 계획", { placeholder: "kicker" });
    s.addText("결론 및 향후 계획", { placeholder: "title" });

    T(s, "결론: 기대효과", { x: 0.6, y: 1.6, w: 6.2, h: 0.4, fontSize: 16, bold: true, color: C.text2 });
    const eff = [
      ["FaClock", "업무 소요시간 단축", "반복 행정업무 시간을 줄여 작전·전투준비에 재투입"],
      ["FaCheckCircle", "작성 오류 감소", "규정 위반·오기·누락을 AI가 사전 점검"],
      ["FaLayerGroup", "업무 표준화", "담당자와 관계없이 일정한 서식과 품질 유지"],
    ];
    for (let i = 0; i < 3; i++) {
      const y = 2.1 + i * 0.95;
      box(s, { x: 0.6, y, w: 6.2, h: 0.82, fill: { color: C.background2 }, line: { color: C.accent5, width: 1 } });
      await iconCircle(s, eff[i][0], 0.75, y + 0.13, 0.56, C.accent2, HEX.white);
      T(s, eff[i][1], { x: 1.5, y: y + 0.07, w: 5.2, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
      T(s, eff[i][2], { x: 1.5, y: y + 0.42, w: 5.2, h: 0.33, fontSize: 13 });
    }
    box(s, { x: 0.6, y: 5.05, w: 6.2, h: 1.4, fill: { color: C.text2 }, line: { color: C.text2, width: 0 } });
    T(s, "AI가 초안을 만들고, 승조원은 판단한다", { x: 0.85, y: 5.2, w: 5.8, h: 0.5, fontSize: 20, bold: true, color: C.background1 });
    T(s, "확보된 시간을 작전·전투준비 업무에 할애하여 함정의 주요임무 집중 수행에 기여", { x: 0.85, y: 5.75, w: 5.75, h: 0.8, fontSize: 14, color: C.background2 });

    T(s, "향후 계획: 정량적 성능평가", { x: 7.2, y: 1.6, w: 5.53, h: 0.4, fontSize: 16, bold: true, color: C.text2 });
    const hdr = (t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.text2 }, fontSize: 14, valign: "middle" } });
    const c1 = (t) => ({ text: t, options: { bold: true, color: C.text2, fill: { color: C.background2 }, fontSize: 13, valign: "middle" } });
    const c = (t) => ({ text: t, options: { fontSize: 13, color: C.text1, valign: "middle" } });
    s.addTable([
      [hdr("평가 지표"), hdr("측정 방법")],
      [c1("업무 소요시간"), c("기존 방식 대비 문서별 작성 시간 비교")],
      [c1("작성 정확도"), c("규정 위반·오기·누락 건수")],
      [c1("근무 형평성"), c("개인별 당직·야간 횟수 편차")],
      [c1("사용성"), c("승조원 만족도·수용성 설문")],
    ], { x: 7.2, y: 2.1, w: 5.53, colW: [1.75, 3.78], rowH: [0.42, 0.55, 0.55, 0.55, 0.55], border: { type: "solid", pt: 1, color: HEX.line }, margin: [0.05, 0.12, 0.05, 0.12], objectName: "eval-table" });

    T(s, "추진 절차", { x: 7.2, y: 4.95, w: 5.53, h: 0.35, fontSize: 14, bold: true, color: C.text2 });
    const flow = ["실제 함정\n행정업무 수집", "시범 운용·\n성능평가", "기능 보완·\n확대 적용"];
    const fw = 1.6;
    flow.forEach((t, i) => {
      const x = 7.2 + i * (fw + 0.365);
      box(s, { x, y: 5.4, w: fw, h: 1.0, fill: { color: C.background1 }, line: { color: C.accent2, width: 1.5 } });
      T(s, t, { x, y: 5.4, w: fw, h: 1.0, fontSize: 13, bold: true, align: "center", valign: "middle", color: C.text2 });
      if (i < 2) arrowRight(s, x + fw + 0.06, 5.75, 0.25, 0.3, C.accent2);
    });

    s.addNotes("결론입니다. 제안한 기능을 도입하면 반복 행정업무의 소요시간이 줄어들고, 이렇게 확보한 시간을 작전과 전투준비에 쓸 수 있습니다. 또한 AI가 규정 위반이나 오기, 누락을 미리 점검해 작성 오류가 줄고, 담당자와 관계없이 일정한 서식과 품질을 유지하는 업무 표준화 효과도 기대됩니다. 즉, AI가 초안을 만들고 승조원은 판단에 집중함으로써 함정의 주요임무 집중 수행에 기여할 수 있습니다. 향후에는 실제 함정 행정업무를 바탕으로 업무 소요시간, 작성 정확도, 근무 형평성, 사용성을 지표로 성능을 평가해 효과를 정량적으로 검증하고, 결과를 반영해 기능을 보완하고 확대 적용하겠습니다. 감사합니다.");
  }

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
})().catch((e) => { console.error(e); process.exit(1); });
