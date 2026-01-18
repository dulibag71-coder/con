# 🎵 메타버스 콘서트 + 입금 승인 입장 시스템 (v3.0)

본 프로젝트는 브라우저 기반의 3D 메타버스 콘서트 시스템으로, 수동 입금 확인 및 관리자 승인 프로세스를 포함한 풀스택 애플리케이션입니다.

## 🚀 주요 기능
1.  **입금 신청**: 사용자가 이름과 입금자명을 입력하여 신청 (카카오뱅크 7777-03-4553512 박두리)
2.  **관리자 승인**: 관리자가 `/admin.html`에서 입금 확인 후 승인 (UUID 토큰 발급)
3.  **인증 입장**: 이름과 토큰이 일치하는 승인된 사용자만 콘서트장 입장 가능
4.  **실시간 동기화**: 모든 접속자가 동일한 시간에 음악과 조명 연출을 감상 (WebSocket 기반)
5.  **3D 메타버스**: Three.js 기반의 가상 무대 및 실시간 인터랙션(응원하기)

## 🛠 기술 스택
-   **Backend**: Node.js, Express, WebSocket (ws), SQLite3
-   **Frontend**: HTML5, CSS3, Vanilla JS, Three.js, Web Audio API

## 🏃 실행 방법
1.  **의존성 설치**
    ```bash
    cd server
    npm install
    ```
2.  **서버 실행**
    ```bash
    node server.js
    ```
3.  **접속 주소**
    -   사용자 입금 신청: `http://localhost:3000/payment.html`
    -   관리자 승인 패널: `http://localhost:3000/admin.html` (비밀번호: `admin1234`)
    -   콘서트 입장: `http://localhost:3000/enter.html`

## 📂 프로젝트 구조
-   `/server`: 백엔드 로직 및 DB (SQLite)
-   `/client`: 프론트엔드 웹 자원
    -   `payment.html`: 입금 신청 페이지
    -   `admin.html`: 관리자 승인 및 공연 제어
    -   `enter.html`: 입장 인증 페이지
    -   `concert.html`: 3D 메타버스 콘서트장
    -   `/js`: Three.js 무대, 소켓, 오디오 동기화 로직

## ⚠️ 주의사항
-   공연 시작은 관리자 페이지(`admin.html`)의 **[공연 시작 브로드캐스트]** 버튼을 눌러야 모든 클라이언트에서 음악이 시작됩니다.
-   오디오 자동 재생 정책으로 인해, 콘서트 입장 시 사용자의 클릭 인터랙션이 필요합니다.
