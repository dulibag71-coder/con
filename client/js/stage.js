let scene, camera, renderer, stage, floor, analyzer, dataArray;
let spotLights = [];
let cubeVisualizers = [];
let avatars = []; // { group, parts, onStage, animOffset, currentMove }
let isAudioInitialized = false;

// Avatar Creator
function createAvatar(color, onStage = false) {
    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(1, 1.2, 0.5);
    const bodyMat = new THREE.MeshStandardMaterial({ color: color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.1;
    group.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.0;
    group.add(head);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.3, 0.8, 0.3);
    const leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.position.set(-0.7, 1.1, 0);
    leftArm.geometry.translate(0, -0.4, 0); // Pivot at shoulder
    leftArm.position.y = 1.5;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, bodyMat);
    rightArm.position.set(0.7, 1.1, 0);
    rightArm.geometry.translate(0, -0.4, 0); // Pivot at shoulder
    rightArm.position.y = 1.5;
    group.add(rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.35, 0.6, 0.35);
    const leftLeg = new THREE.Mesh(legGeo, bodyMat);
    leftLeg.position.set(-0.3, 0.3, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, bodyMat);
    rightLeg.position.set(0.3, 0.3, 0);
    group.add(rightLeg);

    return {
        group,
        parts: { body, head, leftArm, rightArm, leftLeg, rightLeg },
        onStage,
        animOffset: Math.random() * Math.PI * 2
    };
}

function initThreeJS() {
    if (renderer) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508);
    scene.fog = new THREE.FogExp2(0x050508, 0.012);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 25);
    camera.lookAt(0, 5, 0);

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('concert-canvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Floor & Stage
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.1, metalness: 0.9 });
    floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const stageGeo = new THREE.BoxGeometry(20, 1.5, 10);
    const stageMat = new THREE.MeshStandardMaterial({ color: 0x151515, metalness: 0.9, roughness: 0.2 });
    stage = new THREE.Mesh(stageGeo, stageMat);
    stage.position.y = 0.75;
    scene.add(stage);

    // Visualizer Bars
    for (let i = 0; i < 32; i++) {
        const barGeo = new THREE.BoxGeometry(0.3, 1, 0.3);
        const barMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.5 });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set((i - 16) * 0.6, 1.5, -4.5);
        scene.add(bar);
        cubeVisualizers.push(bar);
    }

    // Performer
    const performer = createAvatar(0xff0088, true);
    performer.group.scale.set(1.5, 1.5, 1.5);
    performer.group.position.set(0, 1.5, 0);
    scene.add(performer.group);
    avatars.push(performer);

    // Audience
    for (let i = 0; i < 40; i++) {
        const color = new THREE.Color().setHSL(Math.random(), 0.7, 0.5);
        const audience = createAvatar(color, false);
        audience.group.position.set((Math.random() - 0.5) * 50, 0, 12 + Math.random() * 20);
        audience.group.rotation.y = Math.PI + (Math.random() - 0.5) * 0.5;
        scene.add(audience.group);
        avatars.push(audience);
    }

    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambient);

    const colors = [0x00d4ff, 0xff00ff, 0x00ff88, 0xffaa00];
    colors.forEach((color, i) => {
        const spot = new THREE.SpotLight(color, 15);
        spot.position.set((i - 1.5) * 15, 30, -10);
        spot.target = stage;
        spot.angle = Math.PI / 6;
        spot.penumbra = 0.5;
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
    analyzer.fftSize = 256;
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
    }).catch(e => console.log("Audio interaction required"));
};

function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;

    let energy = { bass: 0, mid: 0, high: 0, all: 0 };

    if (isAudioInitialized && analyzer) {
        analyzer.getByteFrequencyData(dataArray);

        // Split frequencies
        const bCount = Math.floor(dataArray.length * 0.1);
        const mCount = Math.floor(dataArray.length * 0.4);

        for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i];
            energy.all += v;
            if (i < bCount) energy.bass += v;
            else if (i < bCount + mCount) energy.mid += v;
            else energy.high += v;
        }

        energy.all /= dataArray.length;
        energy.bass /= bCount;
        energy.mid /= mCount;
        energy.high /= (dataArray.length - bCount - mCount);

        cubeVisualizers.forEach((bar, i) => {
            const freq = dataArray[i % dataArray.length];
            const scale = 1 + (freq / 255) * 15;
            bar.scale.y = scale;
            bar.position.y = 1.5 + scale / 2;
            bar.material.emissiveIntensity = freq / 255 + 0.5;
        });
    }

    const bassInt = energy.bass / 255;
    const midInt = energy.mid / 255;
    const highInt = energy.high / 255;

    avatars.forEach(avatar => {
        const { group, parts, animOffset, onStage } = avatar;
        const syncTime = time * 2 + animOffset;

        // 1. COMPLEX BODY MOTION (BASS-DRIVEN)
        // Bobbing & Jumping
        const jump = Math.max(0, bassInt - 0.7) * 5;
        group.position.y = (onStage ? 1.5 : 0) + (Math.abs(Math.sin(syncTime * 4)) * 0.3 * bassInt) + jump;

        // Side-to-side sway
        group.rotation.z = Math.sin(syncTime * 2) * 0.1 * midInt;
        group.rotation.y = (onStage ? 0 : Math.PI) + Math.sin(syncTime) * 0.2;

        // 2. ARM MOTIONS (MID/HIGH-DRIVEN)
        if (onStage) {
            // Performer: Wave arms aggressively to highs
            parts.leftArm.rotation.z = -1.5 + Math.sin(syncTime * 10) * highInt * 2;
            parts.rightArm.rotation.z = 1.5 - Math.sin(syncTime * 10 + Math.PI) * highInt * 2;
            parts.leftArm.rotation.x = Math.sin(syncTime * 5) * 1.5 * midInt;
            parts.rightArm.rotation.x = Math.cos(syncTime * 5) * 1.5 * midInt;
        } else {
            // Audience: Hands up on bass/mid peaks
            const handsUp = midInt * 2;
            parts.leftArm.rotation.z = -handsUp + Math.sin(syncTime * 4) * 0.2;
            parts.rightArm.rotation.z = handsUp - Math.sin(syncTime * 4) * 0.2;
        }

        // 3. HEAD (SNARE/MID-DRIVEN)
        parts.head.rotation.x = Math.sin(syncTime * 8) * 0.3 * midInt;
        parts.head.position.y = 2.0 + Math.sin(syncTime * 8) * 0.05 * midInt;
    });

    // Lights (Energy-synced)
    spotLights.forEach((spot, i) => {
        const pulse = (i % 2 === 0 ? bassInt : highInt) * 20;
        spot.intensity = 5 + pulse + (App.state.concertState?.cheerCount || 0) * 0.5;
        spot.position.x += Math.sin(time + i) * 0.2;
    });

    // Dynamic Camera
    camera.position.x = Math.sin(time * 0.5) * 8;
    camera.position.z = 25 + Math.cos(time * 0.3) * 5;
    camera.lookAt(0, 5, 0);

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
