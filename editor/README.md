# 타워디펜스 AI 편집기

기존 UI에 AI 수정 / HTML 다운로드 버튼을 추가합니다.

- 모델: anthropic/claude-haiku-5.5. Messages API output_config.effort=high, thinking.type=disabled.
- 서버 secret: OPENROUTER_API_KEY. 키는 클라이언트나 다운로드 파일에 포함하지 않습니다.
- 개인 코드: 브라우저 localStorage에 저장. 기기 간 이동은 HTML 다운로드/불러오기 사용. 전투 진행 상태는 저장하지 않습니다.
- 이전 버전: 현재 세션 최근 10개. 새로고침 후에는 마지막 수정본만 유지합니다.
- 다운로드: React, 아이콘, Babel, CSS, 소스를 포함하는 오프라인 단일 HTML.
- AI 코드는 allow-scripts iframe에서 실행하고 CSP로 외부 네트워크를 차단합니다. 적용 전 문법/초기 렌더링 검사. 모든 게임 동작을 자동 보장하지는 않습니다.
- 기본 Tailwind CSS는 빌드 시 생성합니다. 새 스타일은 인라인 또는 styles.css를 사용합니다.
- D1/R2는 사용하지 않습니다.

빌드: npm ci 후 npm run build. 배포: npx wrangler pages deploy dist --project-name tower --branch main. GitHub main 자동 배포도 같은 빌드 명령과 dist를 사용합니다.

검증 서버: OPENROUTER_API_KEY를 프로세스 환경변수로 전달하고 node editor/local-server.mjs 실행 (127.0.0.1:8800). 키 파일은 만들지 않습니다.
TEST_URL 환경변수를 해당 주소로 지정하고 node editor/verify.mjs 실행. 실제 유료 AI 요청, 저장/재접속, 다운로드/오프라인 실행, 불러오기/되돌리기 검사. Chrome 필요.
