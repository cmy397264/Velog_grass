# Velog_grass

벨로그(velog) 글 작성일을 기준으로 **GitHub 잔디 스타일 SVG(`grass.svg`)를 자동 생성**하는 저장소입니다.

![velog grass](https://cdn.jsdelivr.net/gh/cmy397264/Velog_grass@main/grass.svg)

## 동작 방식

1. `scripts/generate.mjs`가 velog GraphQL API(`v2.velog.io/graphql`)에서 글 목록의 `released_at`을 모두 가져옵니다.
2. 한국 시간(KST) 기준으로 날짜별 작성 수를 집계해 잔디 SVG를 그립니다.
3. GitHub Actions(`.github/workflows/update-grass.yml`)가 **매일 오전 6시(KST)** 실행되어, 변경이 있을 때만 `grass.svg`를 커밋하고 jsDelivr 캐시를 비웁니다.

## 사용법

```bash
# 로컬 생성 (Node 20+)
VELOG_USER=<velog 아이디> OUT=grass.svg node scripts/generate.mjs

# 테스트: released_at 배열 JSON으로 생성
node scripts/generate.mjs --input posts.json
```

| 환경변수 | 기본값 | 설명 |
|---|---|---|
| `VELOG_USER` | `cmy397264` | 잔디를 만들 velog 사용자명 |
| `OUT` | `grass.svg` | 출력 파일 경로 |

Actions 탭에서 `workflow_dispatch`로 수동 실행도 가능합니다.

## 블로그에 붙이기

```markdown
![velog grass](https://cdn.jsdelivr.net/gh/cmy397264/Velog_grass@main/grass.svg)
```
