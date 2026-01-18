const App = {
    state: {
        user: sessionStorage.getItem('concert_user'),
        token: sessionStorage.getItem('concert_token'),
        socket: null,
        concertState: null,
        serverTimeOffset: 0
    },

    init() {
        console.log("App Initializing...");
        this.hideLoading();
        
        if (this.state.user && this.state.token) {
            this.showView('enter'); // Auto-fill if already applied but not entered stage
            document.getElementById('enter-name').value = this.state.user;
            document.getElementById('enter-token').value = this.state.token;
        } else {
            this.showView('payment');
        }
    },

    showView(viewId) {
        document.querySelectorAll('.container, #view-stage').forEach(el => el.classList.add('hidden'));
        const target = document.getElementById(`view-${viewId}`);
        if (target) {
            target.classList.remove('hidden');
            target.style.opacity = 0;
            setTimeout(() => target.style.opacity = 1, 50);
        }
    },

    hideLoading() {
        const loader = document.getElementById('loading-overlay');
        loader.style.opacity = 0;
        setTimeout(() => loader.style.display = 'none', 500);
    },

    async submitPayment() {
        const name = document.getElementById('pay-name').value;
        const depositor_name = document.getElementById('pay-depositor').value;

        if (!name || !depositor_name) return alert('모든 정보를 입력해주세요.');

        try {
            const res = await fetch('/api/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, depositor_name })
            });
            const data = await res.json();
            if (data.success) {
                alert('신청이 완료되었습니다. 관리자 승인 후 토큰이 발급됩니다.');
                this.state.user = name;
                sessionStorage.setItem('concert_user', name);
                this.showView('enter');
                document.getElementById('enter-name').value = name;
            } else {
                alert('오류: ' + data.error);
            }
        } catch (e) {
            console.error(e);
            alert('서버 연결 오류');
        }
    },

    async enterConcert() {
        const name = document.getElementById('enter-name').value;
        const token = document.getElementById('enter-token').value;

        if (!name || !token) return alert('정보를 입력해주세요.');

        try {
            const res = await fetch('/api/enter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, token })
            });
            const data = await res.json();
            if (data.success) {
                this.state.user = name;
                this.state.token = token;
                sessionStorage.setItem('concert_user', name);
                sessionStorage.setItem('concert_token', token);
                this.startStage();
            } else {
                alert(data.error);
            }
        } catch (e) {
            console.error(e);
            alert('서버 연결 오류');
        }
    },

    startStage() {
        this.showView('stage');
        initThreeJS(); // From stage.js
        this.initSocket();
    },

    initSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.state.socket = new WebSocket(`${protocol}//${window.location.host}`);

        this.state.socket.onopen = () => {
            console.log('Connected to Stage Server');
        };

        this.state.socket.onmessage = (event) => {
            const payload = JSON.parse(event.data);
            this.handleSocketMessage(payload);
        };
    },

    handleSocketMessage(payload) {
        switch (payload.type) {
            case 'INIT':
                this.state.concertState = payload.data.concertState;
                this.state.serverTimeOffset = payload.data.serverTime - Date.now();
                this.updateUI();
                break;
            case 'CONCERT_STARTED':
                this.state.concertState.isPlaying = true;
                this.state.concertState.startTime = payload.startTime;
                this.state.concertState.currentSong = payload.songUrl;
                if (window.onConcertStart) window.onConcertStart(payload.songUrl, payload.startTime);
                break;
            case 'CHEER_UPDATE':
                this.state.concertState.cheerCount = payload.cheerCount;
                this.updateUI();
                break;
        }
    },

    updateUI() {
        const cheerDisplay = document.getElementById('cheer-display');
        if (cheerDisplay && this.state.concertState) {
            cheerDisplay.innerText = `응원: ${this.state.concertState.cheerCount}`;
        }
    },

    sendCheer() {
        if (this.state.socket && this.state.socket.readyState === WebSocket.OPEN) {
            this.state.socket.send(JSON.stringify({ type: 'CHEER' }));
        }
    }
};

window.onload = () => App.init();
