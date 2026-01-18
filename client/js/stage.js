let scene, camera, renderer, stage, floor, analyzer, dataArray;
let spotLights = [];
let cubeVisualizers = [];
let avatars = []; // { mesh, type, animOffset }
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
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac }); // Skin tone
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.0;
    group.add(head);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.3, 0.8, 0.3);
    const leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.position.set(-0.7, 1.1, 0);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, bodyMat);
    rightArm.position.set(0.7, 1.1, 0);
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
    if (renderer) return; // Prevent double init

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508);
    scene.fog = new THREE.FogExp2(0x050508, 0.015);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 25);
    camera.lookAt(0, 5, 0);

    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('concert-canvas'),
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Floor & Stage
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.2,
        metalness: 0.8
    });
    floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const stageGeo = new THREE.BoxGeometry(20, 1.5, 10);
    const stageMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9 });
    stage = new THREE.Mesh(stageGeo, stageMat);
    stage.position.y = 0.75;
    scene.add(stage);

    // Visualizer Bars
    for (let i = 0; i < 32; i++) {
        const barGeo = new THREE.BoxGeometry(0.4, 1, 0.4);
        const barMat = new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 0.5 });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set((i - 16) * 0.6, 1.5, -4);
        scene.add(bar);
        cubeVisualizers.push(bar);
    }

    // Characters
    // 1. Performer (Singer/Dancer)
    const performer = createAvatar(0xff00ff, true);
    performer.group.scale.set(1.5, 1.5, 1.5);
    performer.group.position.set(0, 1.5, 0);
    scene.add(performer.group);
    avatars.push(performer);

    // 2. Audience members
    for (let i = 0; i < 20; i++) {
        const color = new THREE.Color().setHSL(Math.random(), 0.5, 0.5);
        const audience = createAvatar(color, false);
        audience.group.position.set(
            (Math.random() - 0.5) * 40,
            0,
            12 + Math.random() * 15
        );
        audience.group.rotation.y = Math.PI;
        scene.add(audience.group);
        avatars.push(audience);
    }

    // Lights
    const ambient = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambient);

    const colors = [0x00d4ff, 0xff00ff, 0x00ff88, 0xffaa00];
    colors.forEach((color, i) => {
        const spot = new THREE.SpotLight(color, 10);
        spot.position.set((i - 1.5) * 15, 25, -10);
        spot.target = stage;
        spot.angle = Math.PI / 8;
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
    }).catch(e => console.log("Audio interaction required"));
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
            const scale = 1 + (freq / 255) * 12;
            bar.scale.y = scale;
            bar.position.y = 1.5 + scale / 2;
        });
    }

    // Avatar Animations (Dancing)
    const danceIntensity = avgFreq > 0 ? (avgFreq / 128) : 1;
    avatars.forEach(avatar => {
        const { group, parts, animOffset } = avatar;
        const speed = 5 * danceIntensity;

        // Bobbing
        group.position.y = (avatar.onStage ? 1.5 : 0) + Math.abs(Math.sin(time * speed + animOffset)) * 0.5 * danceIntensity;

        // Rotation
        group.rotation.y += Math.sin(time * 2 + animOffset) * 0.01;

        // Arms waving
        parts.leftArm.rotation.z = -0.5 + Math.sin(time * speed + animOffset) * 1.5 * danceIntensity;
        parts.rightArm.rotation.z = 0.5 - Math.sin(time * speed + animOffset) * 1.5 * danceIntensity;

        // Head bobbing
        parts.head.rotation.x = Math.sin(time * speed * 2 + animOffset) * 0.2;
    });

    // Light Pulse
    spotLights.forEach((spot, i) => {
        const beat = Math.sin(time * 4 + i) * 0.5 + 0.5;
        spot.intensity = (avgFreq / 5 + beat * 10) * (1 + (App.state.concertState?.cheerCount || 0) * 0.1);
        spot.position.x += Math.sin(time + i) * 0.1;
    });

    camera.position.x = Math.sin(time * 0.3) * 5;
    camera.lookAt(0, 5, 0);

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
