const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(cors());

// 정적 파일 제공 설정
// __dirname은 server 폴더이므로, 루트 기준으로 경로 설정
const projectRoot = path.join(__dirname, '..');
const clientPath = path.join(projectRoot, 'client');
app.use(express.static(clientPath));

// 기본 경로 접속 시 index.html 제공
app.get('/', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
});

// 관리자 페이지
app.get('/admin', (req, res) => {
    res.sendFile(path.join(projectRoot, 'admin.html'));
});

// DB 초기화
// 배포 환경에서는 데이터 유지를 위해 /app/server/data 폴더 등을 권장하지만, 
// 여기서는 기본 위치인 server 폴더의 database.sqlite를 사용합니다.
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// 콘서트 상태 관리
let concertState = {
    startTime: null,
    isPlaying: false,
    cheerCount: 0,
    currentSong: null
};

// --- API 엔드포인트 ---

// 1. 입금 신청 (Payment)
app.post('/api/payment', (req, res) => {
    const { name, depositor_name } = req.body;
    if (!name || !depositor_name) {
        return res.status(400).json({ error: '이름과 입금자명을 입력해주세요.' });
    }

    const stmt = db.prepare(`INSERT INTO users (name, depositor_name, status) VALUES (?, ?, 'PENDING')`);
    const info = stmt.run(name, depositor_name);
    res.json({ success: true, id: info.lastInsertRowid });
});

// 2. 관리자: 대기 목록 조회
app.get('/api/admin/pending', (req, res) => {
    const password = req.headers['admin-password'];
    if (password !== 'admin1234') return res.status(403).json({ error: '권한이 없습니다.' });

    const rows = db.prepare(`SELECT * FROM users WHERE status = 'PENDING' ORDER BY created_at DESC`).all();
    res.json(rows);
});

// 3. 관리자: 승인 처리
app.post('/api/admin/approve', (req, res) => {
    const { id } = req.body;
    const password = req.headers['admin-password'];
    if (password !== 'admin1234') return res.status(403).json({ error: '권한이 없습니다.' });

    const token = uuidv4();
    const stmt = db.prepare(`UPDATE users SET status = 'APPROVED', access_token = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?`);
    stmt.run(token, id);
    res.json({ success: true, token });
});

// 4. 입장 인증
app.post('/api/enter', (req, res) => {
    const { name, token } = req.body;
    const user = db.prepare(`SELECT * FROM users WHERE name = ? AND access_token = ? AND status = 'APPROVED'`).get(name, token);

    if (!user) return res.status(401).json({ error: '인증 정보가 올바르지 않거나 승인되지 않았습니다.' });
    res.json({ success: true });
});

// --- WebSocket 로직 ---

wss.on('connection', (ws, req) => {
    console.log('New client connected');

    ws.send(JSON.stringify({
        type: 'INIT',
        data: {
            concertState,
            serverTime: Date.now()
        }
    }));

    ws.on('message', (message) => {
        const payload = JSON.parse(message);

        switch (payload.type) {
            case 'START_CONCERT':
                concertState.startTime = Date.now();
                concertState.isPlaying = true;
                concertState.currentSong = payload.songUrl || 'assets/audio/song1.mp3';
                broadcast({
                    type: 'CONCERT_STARTED',
                    startTime: concertState.startTime,
                    songUrl: concertState.currentSong
                });
                break;

            case 'CHEER':
                concertState.cheerCount++;
                broadcast({ type: 'CHEER_UPDATE', cheerCount: concertState.cheerCount });
                break;
        }
    });
});

function broadcast(data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
