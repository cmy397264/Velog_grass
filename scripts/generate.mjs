// velog 글 작성일 기준 잔디(SVG) 생성 스크립트
// 사용법: node scripts/generate.mjs
// 환경변수: VELOG_USER (기본 cmy397264), OUT (기본 grass.svg)
// 테스트: node scripts/generate.mjs --input posts.json  (released_at 배열 JSON)

import { readFileSync, writeFileSync } from 'node:fs';

const USER = process.env.VELOG_USER || 'cmy397264';
const OUT = process.env.OUT || 'grass.svg';
const DAY = 24 * 60 * 60 * 1000;
const KST = 9 * 60 * 60 * 1000;

// ---------- 1. velog에서 글 목록 가져오기 ----------
async function fetchReleasedDates() {
  const dates = [];
  const seen = new Set();
  let cursor;
  for (;;) {
    const res = await fetch('https://v2.velog.io/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query:
          'query($u:String,$c:ID,$l:Int){posts(username:$u,cursor:$c,limit:$l){id released_at}}',
        variables: { u: USER, c: cursor, l: 20 },
      }),
    });
    if (!res.ok) throw new Error(`velog API ${res.status}`);
    const json = await res.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors));
    const page = json.data.posts || [];
    const fresh = page.filter((p) => !seen.has(p.id));
    if (fresh.length === 0) break; // 끝났거나 cursor가 먹히지 않을 때
    fresh.forEach((p) => {
      seen.add(p.id);
      dates.push(p.released_at);
    });
    cursor = page[page.length - 1].id;
  }
  return dates;
}

async function loadDates() {
  const i = process.argv.indexOf('--input');
  if (i !== -1) return JSON.parse(readFileSync(process.argv[i + 1], 'utf8'));
  return fetchReleasedDates();
}

// ---------- 2. 날짜별 집계 (한국 시간 기준) ----------
const kstDay = (ts) => new Date(ts + KST).toISOString().slice(0, 10);
const dayToMs = (s) => Date.parse(`${s}T00:00:00Z`);
const msToDay = (ms) => new Date(ms).toISOString().slice(0, 10);

function buildGrid(releasedAts) {
  const counts = new Map();
  for (const r of releasedAts) {
    if (!r) continue;
    const d = kstDay(Date.parse(r));
    counts.set(d, (counts.get(d) || 0) + 1);
  }

  const todayStr = process.env.TODAY || kstDay(Date.now());
  const today = dayToMs(todayStr);
  const start = today - 364 * DAY;
  const startSunday = start - new Date(start).getUTCDay() * DAY;
  const weeks = Math.floor((today - startSunday) / DAY / 7) + 1;

  const cells = [];
  let total = 0;
  for (let t = startSunday; t <= today; t += DAY) {
    const date = msToDay(t);
    const count = counts.get(date) || 0;
    const inRange = t >= start;
    if (inRange) total += count;
    cells.push({
      date,
      count,
      inRange,
      col: Math.floor((t - startSunday) / DAY / 7),
      row: new Date(t).getUTCDay(),
    });
  }
  return { cells, weeks, total, todayStr };
}

// ---------- 3. SVG 그리기 ----------
const COLORS = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
const level = (n) => (n === 0 ? 0 : n >= 4 ? 4 : n);

function render({ cells, weeks, total }) {
  const CELL = 11;
  const GAP = 3;
  const STEP = CELL + GAP;
  const LEFT = 32;
  const TOP = 44;
  const width = LEFT + weeks * STEP + 12;
  const height = TOP + 7 * STEP + 34;
  const font =
    "-apple-system, 'Segoe UI', 'Malgun Gothic', 'Noto Sans KR', sans-serif";

  const out = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${font}">`
  );
  out.push(`<title>${USER} velog 잔디</title>`);
  out.push(
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="6" fill="#ffffff" stroke="#d0d7de"/>`
  );
  out.push(
    `<text x="${LEFT}" y="22" font-size="13" font-weight="600" fill="#24292f">${USER} · 최근 1년간 ${total}개의 글</text>`
  );

  // 월 라벨
  const labels = [];
  let lastMonth = '';
  for (const c of cells.filter((c) => c.row === 0 && c.inRange)) {
    const m = c.date.slice(5, 7);
    if (m !== lastMonth) labels.push({ col: c.col, month: Number(m) });
    lastMonth = m;
  }
  // 첫 달이 3주 미만만 보이면 다음 달 라벨과 겹치므로 첫 라벨은 생략
  if (labels.length > 1 && labels[1].col - labels[0].col < 3) labels.shift();
  for (const l of labels) {
    out.push(
      `<text x="${LEFT + l.col * STEP}" y="${TOP - 8}" font-size="10" fill="#57606a">${l.month}월</text>`
    );
  }

  // 요일 라벨
  [['월', 1], ['수', 3], ['금', 5]].forEach(([label, row]) => {
    out.push(
      `<text x="${LEFT - 8}" y="${TOP + row * STEP + 9}" font-size="10" fill="#57606a" text-anchor="end">${label}</text>`
    );
  });

  // 셀
  for (const c of cells) {
    if (!c.inRange) continue;
    const x = LEFT + c.col * STEP;
    const y = TOP + c.row * STEP;
    out.push(
      `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${COLORS[level(c.count)]}"><title>${c.date} · ${c.count}개</title></rect>`
    );
  }

  // 범례
  const ly = TOP + 7 * STEP + 8;
  const lx = width - 12 - (5 * STEP + 56);
  out.push(`<text x="${lx}" y="${ly + 9}" font-size="10" fill="#57606a">적음</text>`);
  COLORS.forEach((color, i) => {
    out.push(
      `<rect x="${lx + 28 + i * STEP}" y="${ly}" width="${CELL}" height="${CELL}" rx="2" fill="${color}"/>`
    );
  });
  out.push(
    `<text x="${lx + 28 + 5 * STEP + 4}" y="${ly + 9}" font-size="10" fill="#57606a">많음</text>`
  );

  out.push('</svg>');
  return out.join('\n');
}

// ---------- 실행 ----------
const dates = await loadDates();
const grid = buildGrid(dates);
writeFileSync(OUT, render(grid));
console.log(`${OUT} 생성 완료 · 전체 글 ${dates.length}개 · 최근 1년 ${grid.total}개`);
