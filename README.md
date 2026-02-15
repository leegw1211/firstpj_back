# firstpj_back

컴퓨터공학과 2학년 때 만든 **첫 팀/개인 웹 프로젝트(맛집 리뷰 사이트)**의 백엔드입니다.  
지금 보면 귀엽고 투박하지만, 당시에는 "로그인/리뷰/카테고리/정렬" 같은 기본 기능을 처음부터 직접 붙여보며 많은 걸 배웠던 프로젝트입니다.

> 프론트엔드와 연동되는 Express + MySQL API 서버입니다.

---

## 프로젝트 소개

이 저장소는 맛집 리뷰 웹사이트의 백엔드 서버입니다.

- 사용자 회원가입/로그인/로그아웃
- 쿠키 기반 세션 관리
- 맛집(장소) 등록/수정/삭제
- 카테고리 등록 및 장소-카테고리 매핑
- 리뷰 작성/수정/삭제/조회
- 별점 평균 및 리뷰 수 기반 정렬/검색
- 사용자 요청사항 등록/조회/삭제

학부 초반에 만들었던 코드라 구조가 단일 파일 중심이고, 지금 기준으로는 개선할 점도 많습니다. 그래도 **처음으로 "웹 서비스를 끝까지 만들어 본" 의미 있는 기록**이라 아카이브로 남깁니다.

---

## 기술 스택

- **Runtime**: Node.js
- **Framework**: Express
- **Database**: MySQL (mysql package)
- **Etc**: cors, cookie-parser

---

## 실행 방식 (당시)

코드 기준으로 확인되는 내용은 아래와 같습니다.

- 서버는 `index.js`에서 실행되며 기본 포트는 `3000`
- CORS 허용 프론트 도메인: `https://pnucse99.netlify.app`
- DB 호스트: `svc.sel4.cloudtype.app`

즉, 당시 구성은 대략 **Netlify(프론트) + 별도 Node 서버 + Cloudtype 쪽 DB** 형태였던 것으로 보입니다.

> 참고: 현재 저장소에는 Dockerfile/CI/CD/배포 스크립트가 없어서, 정확한 배포 파이프라인 정보는 포함되어 있지 않습니다.

---

## API 개요

주요 엔드포인트 예시:

- 인증/세션
  - `POST /register`
  - `POST /login`
  - `POST /logout`
  - `POST /usercheck`
  - `GET /setupserver` (세션 만료 정리 이벤트 설정)

- 카테고리/장소
  - `POST /getcategory`
  - `POST /addcategory`
  - `POST /addplace`
  - `POST /modifyplace`
  - `POST /deleteplace`
  - `POST /searchplace`
  - `POST /getplaces_fromcategory_scoredesc`
  - `POST /getplaces_fromcategory_countdesc`

- 리뷰
  - `POST /loadreviewlist`
  - `POST /loadpost`
  - `POST /review`
  - `POST /modify`
  - `POST /deletepost`

- 기타
  - `POST /changePagename`
  - `POST /userRequest`
  - `POST /getuserRequest`
  - `POST /deluserRequest`

---

## 회고 & 한계

이 프로젝트는 학부 2학년 시절의 결과물이라, 현재 기준으로 다음과 같은 개선 포인트가 있습니다.

- SQL 쿼리 문자열 결합 방식 다수 사용 (SQL Injection 대응 미흡)
- DB 계정/호스트 정보 코드 하드코딩
- 에러 처리 및 인증/권한 처리 일관성 부족
- 단일 파일 구조로 유지보수성 낮음

언젠가 리팩토링한다면 아래를 우선 적용하고 싶습니다.

1. 환경변수 분리 (`.env`)
2. Prepared Statements/ORM 적용
3. 라우터/서비스/레포지토리 계층 분리
4. 인증 미들웨어 정리
5. 테스트 코드 추가

---

## 라이선스

별도 라이선스 표기가 없다면 기본적으로 All rights reserved 상태입니다.  
공개 범위를 정리한 뒤 필요하면 LICENSE 파일을 추가하세요.
