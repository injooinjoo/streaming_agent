# 배포 가이드 - Streaming Agent

Vultr VPS를 단일 배포 환경으로 사용합니다.

---

## 서버 정보

| 항목 | 값 |
|------|-----|
| **호스트** | `158.247.204.45` |
| **사용자** | `root` |
| **OS** | Ubuntu |
| **Node.js** | v20+ |
| **프로세스 관리** | PM2 |
| **데이터베이스** | SQLite3 |

---

## 서버 접속

```bash
# SSH 접속
ssh root@158.247.204.45

# 프로젝트 디렉토리
cd /root/streaming_agent
```

---

## 배포 아키텍처

```
GitHub (main branch)
    ↓ push
GitHub Actions
    ↓ SSH deploy
Vultr Server (158.247.204.45)
    ├── PM2 (프로세스 관리)
    │   └── streaming-agent (포트 3001)
    ├── SQLite DBs
    │   ├── streaming_data.db
    │   └── weflab_clone.db
    └── 외부 접속: http://158.247.204.45:3001
```

---

## 배포 방법

### 자동 배포 (권장)

`main` 브랜치에 push하면 GitHub Actions가 자동으로 배포합니다.

```bash
# 로컬에서 변경사항 커밋 & 푸시
git add .
git commit -m "feat: 새 기능 추가"
git push origin main
```

GitHub Actions에서 실행되는 작업:
1. 서버에 SSH 접속
2. `git pull` 최신 코드 가져오기
3. `npm ci --omit=dev` 의존성 설치
4. `pm2 restart` 애플리케이션 재시작

### 수동 배포

```bash
# 서버 접속
ssh root@158.247.204.45

# 프로젝트 디렉토리로 이동
cd /root/streaming_agent

# 최신 코드 가져오기
git pull origin main

# 의존성 설치
cd server && npm ci --omit=dev && cd ..

# 애플리케이션 재시작
pm2 restart streaming-agent
```

---

## PM2 명령어

```bash
# 상태 확인
pm2 status

# 로그 확인
pm2 logs streaming-agent
pm2 logs streaming-agent --lines 100  # 최근 100줄

# 재시작
pm2 restart streaming-agent

# 중지
pm2 stop streaming-agent

# 시작
pm2 start ecosystem.config.js --env production

# 모든 프로세스 재시작
pm2 restart all

# PM2 설정 저장 (서버 재부팅 시 자동 시작)
pm2 save
pm2 startup
```

---

## 환경 변수

서버에서 `.env` 파일 또는 환경 변수로 설정:

```bash
# 필수
NODE_ENV=production
PORT=3001

# JWT (선택)
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# OAuth (선택)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
```

---

## 데이터베이스

SQLite3 파일 기반 데이터베이스 사용:

```bash
# 데이터베이스 위치
/root/streaming_agent/server/streaming_data.db
/root/streaming_agent/server/weflab_clone.db

# 백업
cp streaming_data.db streaming_data.db.backup
cp weflab_clone.db weflab_clone.db.backup
```

### 백업 자동화

PM2로 백업 스케줄러 실행:

```bash
pm2 start ecosystem.config.js  # backup-scheduler 포함
```

---

## 헬스체크

```bash
# 로컬에서 확인
curl http://158.247.204.45:3001/health

# 서버에서 확인
curl localhost:3001/health
```

---

## 로그 확인

```bash
# PM2 로그 (실시간)
pm2 logs streaming-agent

# 로그 파일 직접 확인
tail -f /root/streaming_agent/logs/out.log
tail -f /root/streaming_agent/logs/err.log
```

---

## 트러블슈팅

### 서버가 응답하지 않을 때

```bash
# PM2 상태 확인
pm2 status

# 프로세스 재시작
pm2 restart streaming-agent

# 로그 확인
pm2 logs streaming-agent --lines 50
```

### 포트 충돌

```bash
# 3001 포트 사용 중인 프로세스 확인
lsof -i :3001

# 프로세스 종료
kill -9 <PID>
```

### 디스크 공간 부족

```bash
# 디스크 사용량 확인
df -h

# 로그 파일 정리
pm2 flush
rm -rf /root/streaming_agent/logs/*.log
```

### 메모리 부족

```bash
# 메모리 사용량 확인
free -m

# PM2 메모리 확인
pm2 monit
```

---

## GitHub Secrets 설정

자동 배포를 위해 GitHub 리포지토리에 다음 Secret 추가:

| Secret Name | 값 |
|-------------|-----|
| `VULTR_SSH_KEY` | Vultr 서버의 SSH 개인키 |

### SSH 키 생성 및 설정

```bash
# 로컬에서 SSH 키 생성
ssh-keygen -t rsa -b 4096 -C "deploy@streaming-agent"

# 공개키를 서버에 추가
ssh-copy-id root@158.247.204.45

# 개인키 내용을 GitHub Secret에 추가
cat ~/.ssh/id_rsa
```

---

## 제거된 배포 설정

다음 파일들은 더 이상 사용하지 않습니다 (백업됨):

| 파일 | 설명 | 상태 |
|------|------|------|
| `fly.toml.bak` | Fly.io 설정 | 백업됨, 사용 안함 |
| `render.yaml.bak` | Render 설정 | 백업됨, 사용 안함 |

---

## Nginx 리버스 프록시 설정

포트 80으로 접근할 수 있도록 Nginx를 설정합니다.

### 자동 설정 (권장)

```bash
# 서버 접속
ssh root@158.247.204.45

# 프로젝트 디렉토리로 이동
cd /root/streaming_agent

# 설정 스크립트 실행
bash deploy/setup-server.sh
```

### 수동 설정

```bash
# Nginx 설치
apt update && apt install -y nginx

# 설정 파일 복사
cp deploy/nginx.conf /etc/nginx/sites-available/streaming-agent
ln -sf /etc/nginx/sites-available/streaming-agent /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 설정 테스트 및 재시작
nginx -t && systemctl restart nginx
```

### 설정 완료 후 접속

```
http://158.247.204.45  (포트 없이 접근 가능)
```

---

## SSL 인증서 설정 (HTTPS)

도메인이 있는 경우 Let's Encrypt SSL 인증서를 설정합니다.

### 사전 요구사항

1. 도메인이 `158.247.204.45`를 가리키도록 DNS 설정
2. Nginx가 설치되어 있어야 함

### SSL 설정

```bash
# 서버에서 실행
bash deploy/setup-ssl.sh your-domain.com
```

### 수동 SSL 설정

```bash
# Certbot 설치
apt install -y certbot python3-certbot-nginx

# SSL 인증서 발급
certbot --nginx -d your-domain.com

# 자동 갱신 확인
certbot renew --dry-run
```

### SSL 설정 완료 후

```
https://your-domain.com
```

---

## 배포 스크립트 목록

| 파일 | 용도 |
|------|------|
| `deploy/nginx.conf` | Nginx 설정 파일 |
| `deploy/setup-server.sh` | Nginx + 방화벽 자동 설정 |
| `deploy/setup-ssl.sh` | SSL 인증서 자동 설정 |

---

## 문의

문제 발생 시 GitHub Issues에 등록하거나 관리자에게 문의하세요.
