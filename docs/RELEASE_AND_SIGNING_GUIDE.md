# 러비러비톡(Lovely Talk) 설치형 앱 빌드 · 영구 서명 키 · 자동 배포 가이드

## 1. 플랫폼 구성 요약

- **기존 웹 버전**: `npm run dev` / `npm run build` / `npm run start` 그대로 유지됩니다. 웹에서는 설치형 앱 전용 업데이트 로직이 실행되지 않습니다.
- **Android APK (Capacitor)**:
  - 고정 Application ID: `com.lovelytalk.app`
  - 스마트폰·태블릿 화면 및 회전 상태 유지 지원
  - 영구 Release 서명 키 필수 적용 (미설정/복구 실패 시 빌드 중단)
  - 앱 내 업데이트: GitHub Releases의 최신 정식 릴리스(`android-latest.json`) 확인 -> APK 다운로드 진행률 표시 -> SHA-256 무결성 검증 -> Android 시스템 설치 화면 호출 (기존 데이터 유지)
- **Windows EXE (Electron + electron-builder)**:
  - 고정 App ID: `com.lovelytalk.app` / Product Name: `LovelyTalk`
  - Windows x64 NSIS 설치형 (`LovelyTalk-Windows-Setup.exe`)
  - 고정 커스텀 프로토콜(`lovelytalk://app`) 및 `deleteAppDataOnUninstall: false`로 업데이트 후에도 IndexedDB(채팅 기록, 캐릭터, 나의 분신, 스킨) 완전 유지
  - `electron-updater` 기반 정식 릴리스 확인, 사용자 승인 후 다운로드·설치·재시작

---

## 2. 필수 GitHub Secrets 목록

GitHub 저장소의 **Settings → Secrets and variables → Actions → Repository secrets → New repository secret**에서 아래 항목을 등록하세요.

### 필수 (Android 영구 서명 키 복구 및 서명)
| Secret 이름 | 설명 |
|---|---|
| `KEYSTORE_ENCRYPTION_KEY` | AES-256-GCM 암호화/복호화 마스터 키 (최소 16자 이상, 강력한 무작위 문자열 권장) |
| `ANDROID_KEYSTORE_PASSWORD` | Android Release Keystore 비밀번호 |
| `ANDROID_KEY_ALIAS` | Android Release Key 별칭 (예: `lovelytalk-release`) |
| `ANDROID_KEY_PASSWORD` | Android Release Key 비밀번호 (Keystore 비밀번호와 동일하게 설정 가능) |

### 백업 저장소 방식 (택 1 — 비공개 저장소 방식 권장)
- **방식 A (권장: 전용 비공개 GitHub 저장소 Vault)**
  | Secret 이름 | 설명 |
  |---|---|
  | `ANDROID_KEYSTORE_BACKUP_REPO` | 암호화된 서명 키 백업을 보관할 **비공개(Private)** 저장소 (예: `내아이디/lovelytalk-keystore-private`) |
  | `KEYSTORE_BACKUP_TOKEN` | 해당 비공개 저장소 읽기/쓰기 권한이 있는 GitHub Personal Access Token (`repo` 또는 Fine-grained `Contents: Read & Write`) |
  > 빌드 스크립트가 백업 저장소의 `private === true` 여부를 API로 검증하며, 공개 저장소일 경우 즉시 빌드를 중단합니다.
- **방식 B (대안: GitHub Encrypted Secret 직접 저장)**
  | Secret 이름 | 설명 |
  |---|---|
  | `ANDROID_KEYSTORE_ENC_BASE64` | `lovelytalk-release.jks.enc` 파일을 Base64 인코딩한 문자열 (`base64 -w 0 lovelytalk-release.jks.enc`) |

---

## 3. 최초 1회 영구 Android 서명 키 생성 및 백업

이미 기존에 사용 중인 Android 서명 키가 있다면 **절대 새로 생성하지 말고** 기존 `.jks` 파일을 암호화하여 백업하세요:
```bash
KEYSTORE_ENCRYPTION_KEY="강력한_암호화키" node scripts/android-keystore-manager.mjs encrypt ./existing.jks ./lovelytalk-release.jks.enc
```

신규로 최초 1회 생성하는 경우 (방식 A 기준):
1. GitHub에 **Private(비공개)** 저장소(예: `내아이디/lovelytalk-keystore-private`)를 생성합니다.
2. 위 표의 6개 Secrets를 앱 저장소에 등록합니다.
3. 앱 저장소의 **Actions → Android Permanent Keystore Bootstrap & Vault Check → Run workflow** 클릭
4. `mode`를 `init-once`로 선택하고 실행합니다.
   - 이미 백업 파일이 존재하면 자동으로 중단되어 기존 키 덮어쓰기를 방지합니다.
   - 완료 후 `mode: verify`로 실행해 복구 가능 여부를 확인합니다.

---

## 4. 최초 빌드 테스트 및 정식 배포 방법

### 테스트 빌드 (Artifact만 생성, 정식 릴리스 미생성)
1. GitHub 저장소 **Actions → Build & Release Installable Apps (Android APK & Windows EXE) → Run workflow**
2. `publish_release`를 `false`(기본값)로 두고 실행합니다.
3. 완료 후 Summary 하단 Artifacts에서 `android-release-artifact`와 `windows-release-artifact`를 내려받아 검증합니다.

### 정식 배포 (GitHub Releases 자동 등록)
일반 코드 푸시(`main`)로는 정식 릴리스가 생성되지 않습니다. 버전 태그를 푸시할 때만 Android + Windows 빌드와 검증을 거쳐 정식 릴리스가 공개됩니다:
```bash
npm run version:verify
git tag v1.0.0
git push origin v1.0.0
```

---

## 5. 이후 버전 업데이트 방법

1. 버전 증가 (SemVer + Android `versionCode` 자동 증가 및 전체 파일 동기화):
   ```bash
   npm run version:bump -- patch   # 예: 1.0.0 -> 1.0.1 (versionCode 10001)
   # 또는 minor (1.1.0), major (2.0.0), 직접 지정 (1.2.3)
   ```
2. 변경 사항 커밋 및 푸시:
   ```bash
   git add version.json package.json package-lock.json android/app/build.gradle
   git commit -m "chore(release): bump version to v1.0.1"
   git push origin main
   ```
3. 버전 태그 생성 및 푸시 (자동 빌드 및 정식 릴리스 등록):
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
4. 기존 Android/Windows 설치형 앱을 실행하거나 **환경설정 → 업데이트 확인**을 누르면 `v1.0.1` 업데이트 알림이 표시됩니다.
