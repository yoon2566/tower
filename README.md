<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 타워디펜스 AI 편집기

현재 배포: https://tower-4mm.pages.dev/

AI 수정, 오프라인 단일 HTML 다운로드, 브라우저 자동 저장 기능은 [편집기 안내](editor/README.md)를 참고하세요.
현재 배포 빌드는 `npm run build`이며, 서버의 `OPENROUTER_API_KEY` secret을 사용합니다. 아래는 원본 게임 개발 안내입니다.

## 원본 게임 개발

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/15PPGEQnmGRXCbtP6nd9D8sftt2Ocj9_4

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
