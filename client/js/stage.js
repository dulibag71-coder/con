let scene, camera, renderer, stage, floor, analyzer, dataArray;
let spotLights = [];
let cubeVisualizers = [];
let isAudioInitialized = false;

function initThreeJS() {
    if (renderer) return; // Prevent double init

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508);
    scene.fog = new THREE.FogExp2(0x050508, 0.015);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 20);
    camera.lookAt(0, 2, 0);

    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('concert-canvas'),
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;

    // Premium Floor
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.1,
        metalness: 0.8,
        emissive: 0x00d4ff,
        emissiveIntensity: 0.01
    });
    floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Main Stage
    const stageGroup = new THREE.Group();
    const stageGeo = new THREE.BoxGeometry(20, 1.5, 10);
    const stageMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.2 });
    stage = new THREE.Mesh(stageGeo, stageMat);
    stage.position.y = 0.75;
    stageGroup.add(stage);

    // Visualizer Bars
    for (let i = 0; i < 32; i++) {
        const barGeo = new THREE.BoxGeometry(0.4, 1, 0.4);
        const barMat = new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 0.5 });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set((i - 16) * 0.6, 1.5, -4);
        stageGroup.add(bar);
        cubeVisualizers.push(bar);
    }
    scene.add(stageGroup);

    // Dynamic Lights
    const ambient = new THREE.AmbientLight(0x404040, 0.2);
    scene.add(ambient);

    const colors = [0x00d4ff, 0xff00ff, 0x00ff88, 0xff4444];
    colors.forEach((color, i) => {
        const spot = new THREE.SpotLight(color, 5);
        spot.position.set((i - 1.5) * 10, 20, -10);
        spot.target = stage;
        spot.angle = Math.PI / 8;
        spot.penumbra = 0.3;
        spot.decay = 2;
        spot.distance = 100;
        scene.add(spot);
        spotLights.push(spot);
    });

    animate();
}

function initAudioContext(audioElement) {
    if (isAudioInitialized) return;
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const source = context.createMediaElementSource(audioElement);
    analyzer = context.createAnalyser();
    analyzer.fftSize = 128;
    source.connect(analyzer);
    analyzer.connect(context.destination);
    dataArray = new Uint8Array(analyzer.frequencyBinCount);
    isAudioInitialized = true;
}

window.onConcertStart = (songUrl) => {
    const audio = new Audio(songUrl);
    audio.crossOrigin = "anonymous";
    audio.play().then(() => {
        initAudioContext(audio);
    }).catch(e => console.error("Audio play failed:", e));
};

function animate() {
    requestAnimationFrame(animate);

    const time = Date.now() * 0.001;
    let avgFreq = 0;

    if (isAudioInitialized && analyzer) {
        analyzer.getByteFrequencyData(dataArray);
        avgFreq = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;

        cubeVisualizers.forEach((bar, i) => {
            const freq = dataArray[i % dataArray.length];
            const scale = 1 + (freq / 255) * 10;
            bar.scale.y = scale;
            bar.position.y = 1.5 + scale / 2;
            bar.material.emissiveIntensity = freq / 255 + 0.5;
        });
    }

    // Light Pulse
    spotLights.forEach((spot, i) => {
        const beat = Math.sin(time * 3 + i) * 0.5 + 0.5;
        spot.intensity = (avgFreq / 10 + beat * 5) * (1 + (App.state.concertState?.cheerCount || 0) * 0.01);
        spot.position.x += Math.sin(time * 0.5 + i) * 0.05;
    });

    camera.position.x = Math.sin(time * 0.2) * 2;
    camera.lookAt(0, 3, 0);

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
