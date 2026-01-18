let scene, camera, renderer, stage, floor, analyzer, dataArray;
let spotLights = [];
let cubeVisualizers = [];
let performers = []; // BTS-style 7 members
let audience = [];
let isAudioInitialized = false;

// Formation Data
const formations = {
    V_SHAPE: [
        { x: 0, z: 0 }, { x: -3, z: 2 }, { x: 3, z: 2 },
        { x: -6, z: 4 }, { x: 6, z: 4 }, { x: -9, z: 6 }, { x: 9, z: 6 }
    ],
    LINE: [
        { x: -9, z: 0 }, { x: -6, z: 0 }, { x: -3, z: 0 },
        { x: 0, z: 0 }, { x: 3, z: 0 }, { x: 6, z: 0 }, { x: 9, z: 0 }
    ],
    ARROW: [
        { x: 0, z: -3 }, { x: -2, z: -1 }, { x: 2, z: -1 },
        { x: -4, z: 1 }, { x: 4, z: 1 }, { x: -6, z: 3 }, { x: 6, z: 3 }
    ],
    X_SHAPE: [
        { x: 0, z: 0 }, { x: -4, z: -4 }, { x: 4, z: -4 },
        { x: -8, z: -8 }, { x: 8, z: -8 }, { x: -4, z: 4 }, { x: 4, z: 4 }
    ]
};

let currentFormation = formations.V_SHAPE;
let formationKeys = Object.keys(formations);
let formationIndex = 0;

// Avatar Creator
function createAvatar(color, isPerformer = false) {
    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(1, 1.2, 0.5);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: color,
        metalness: isPerformer ? 0.8 : 0.2,
        roughness: isPerformer ? 0.2 : 0.8
    });
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
    leftArm.geometry.translate(0, -0.4, 0);
    leftArm.position.set(-0.7, 1.5, 0);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, bodyMat);
    rightArm.geometry.translate(0, -0.4, 0);
    rightArm.position.set(0.7, 1.5, 0);
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
        parts: { body, head, leftArm, rightArm, leftLeg, rightLeg, armMat: bodyMat },
        isPerformer,
        animOffset: Math.random() * Math.PI * 2,
        targetPos: new THREE.Vector3()
    };
}

function initThreeJS() {
    if (renderer) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020205);
    scene.fog = new THREE.FogExp2(0x020205, 0.01);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 35);
    camera.lookAt(0, 5, 0);

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('concert-canvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Floor & Stage
    const floorGeo = new THREE.PlaneGeometry(300, 300);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.9 });
    floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const stageGeo = new THREE.BoxGeometry(40, 1.5, 20);
    const stageMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.1 });
    stage = new THREE.Mesh(stageGeo, stageMat);
    stage.position.y = 0.75;
    scene.add(stage);

    // Visualizer Bars
    for (let i = 0; i < 64; i++) {
        const barGeo = new THREE.BoxGeometry(0.4, 1, 0.4);
        const barMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.5 });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set((i - 32) * 0.7, 1.5, -9);
        scene.add(bar);
        cubeVisualizers.push(bar);
    }

    // BTS-style Group (7 members)
    const PerformerColors = [0xff0088, 0x00ff88, 0x00d4ff, 0xffaa00, 0xffffff, 0xaa00ff, 0xff0000];
    for (let i = 0; i < 7; i++) {
        const p = createAvatar(PerformerColors[i], true);
        p.group.scale.set(1.6, 1.6, 1.6);
        p.group.position.set(currentFormation[i].x, 1.5, currentFormation[i].z);
        scene.add(p.group);
        performers.push(p);
    }

    // Audience
    for (let i = 0; i < 50; i++) {
        const color = new THREE.Color().setHSL(Math.random(), 0.6, 0.4);
        const aud = createAvatar(color, false);
        aud.group.position.set((Math.random() - 0.5) * 60, 0, 15 + Math.random() * 30);
        aud.group.rotation.y = Math.PI + (Math.random() - 0.5) * 0.4;
        scene.add(aud.group);
        audience.push(aud);
    }

    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambient);

    // Dynamic Spotlights
    const colors = [0x00d4ff, 0xff00ff, 0x00ff88, 0xffaa00];
    colors.forEach((color, i) => {
        const spot = new THREE.SpotLight(color, 20);
        spot.position.set((i - 1.5) * 20, 40, -10);
        spot.target = stage;
        spot.angle = Math.PI / 5;
        spot.penumbra = 0.6;
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
    analyzer.fftSize = 512;
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

    let energy = { bass: 0, mid: 0, high: 0, peak: false };

    if (isAudioInitialized && analyzer) {
        analyzer.getByteFrequencyData(dataArray);

        let sum = 0;
        const bRange = 10, mRange = 100;
        for (let i = 0; i < bRange; i++) energy.bass += dataArray[i];
        for (let i = bRange; i < mRange; i++) energy.mid += dataArray[i];
        for (let i = mRange; i < dataArray.length; i++) energy.high += dataArray[i];

        energy.bass /= bRange;
        energy.mid /= (mRange - bRange);
        energy.high /= (dataArray.length - mRange);

        energy.peak = energy.bass > 220;

        cubeVisualizers.forEach((bar, i) => {
            const freq = dataArray[i % dataArray.length];
            const scale = 1 + (freq / 255) * 20;
            bar.scale.y = scale;
            bar.position.y = 1.5 + scale / 2;
            bar.material.emissiveIntensity = freq / 255 + 0.5;
        });
    }

    const bassInt = energy.bass / 255;
    const midInt = energy.mid / 255;
    const highInt = energy.high / 255;

    // Formation Switch Logic (Every 8 seconds or on peak)
    if (Math.floor(time) % 8 === 0 && (time % 1 < 0.02)) {
        formationIndex = (formationIndex + 1) % formationKeys.length;
        currentFormation = formations[formationKeys[formationIndex]];
    }

    // Performers: BTS-STYLE KNIFE CHOREOGRAPHY
    performers.forEach((p, i) => {
        const { group, parts, animOffset } = p;
        const moveTime = time * 4; // Sharp speed

        // 1. Formation Positioning
        const target = currentFormation[i];
        group.position.x = THREE.MathUtils.lerp(group.position.x, target.x, 0.05);
        group.position.z = THREE.MathUtils.lerp(group.position.z, target.z, 0.05);

        // 2. Synchronized Moves (칼군무)
        const isUpbeat = Math.sin(moveTime * Math.PI) > 0;

        // Body jump on bass
        group.position.y = 1.5 + (energy.peak ? 2 * bassInt : Math.abs(Math.sin(moveTime)) * 0.5 * bassInt);

        // Sharp Arm Motions
        if (energy.peak) {
            // "Knife" move: Arms straight up/down
            parts.leftArm.rotation.z = -Math.PI * 0.8;
            parts.rightArm.rotation.z = Math.PI * 0.8;
        } else {
            // Complex sync: Alternating arm waves
            parts.leftArm.rotation.z = -1 + Math.sin(moveTime + i * 0.1) * 2 * midInt;
            parts.rightArm.rotation.z = 1 - Math.cos(moveTime + i * 0.1) * 2 * midInt;
            parts.leftArm.rotation.x = Math.sin(moveTime * 2) * 1.5 * highInt;
        }

        // Head tracking
        parts.head.rotation.y = Math.sin(time * 10) * 0.2 * highInt;
        parts.head.rotation.x = Math.sin(moveTime * 2) * 0.3 * bassInt;
    });

    // Audience: Simple cheering
    audience.forEach(aud => {
        const { group, parts, animOffset } = aud;
        group.position.y = Math.abs(Math.sin(time * 3 + animOffset)) * 0.6 * bassInt;
        parts.leftArm.rotation.z = -0.5 - midInt * 2;
        parts.rightArm.rotation.z = 0.5 + midInt * 2;
    });

    // Dynamic Lighting (Concert Mode)
    spotLights.forEach((spot, i) => {
        const pulse = (energy.peak ? 50 : 10 + bassInt * 20);
        spot.intensity = pulse + (App.state.concertState?.cheerCount || 0) * 1;
        spot.position.x = Math.sin(time * 0.5 + i) * 30;
    });

    // Pro Camera Work
    camera.position.x = Math.sin(time * 0.2) * 15;
    camera.position.y = 10 + Math.sin(time * 0.4) * 5;
    camera.lookAt(0, 5, 0);

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
