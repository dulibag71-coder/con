let scene, camera, renderer, stage, floor, analyzer, dataArray;
let spotLights = [];
let cubeVisualizers = [];
let performers = [];
let audience = [];
let isAudioInitialized = false;

// Dance Style Definitions
const DANCE_STYLES = {
    POWER: { speed: 1.5, amplitude: 1.2, bounce: 0.8, arms: "SHARP" },
    GROOVE: { speed: 1.0, amplitude: 1.0, bounce: 0.5, arms: "WAVE" },
    SWAY: { speed: 0.5, amplitude: 0.8, bounce: 0.2, arms: "FLOW" }
};

let currentStyle = DANCE_STYLES.GROOVE;

// Formations
const formations = {
    V_SHAPE: [{ x: 0, z: 0 }, { x: -4, z: 3 }, { x: 4, z: 3 }, { x: -8, z: 6 }, { x: 8, z: 6 }, { x: -12, z: 9 }, { x: 12, z: 9 }],
    LINE: [{ x: -12, z: 0 }, { x: -8, z: 0 }, { x: -4, z: 0 }, { x: 0, z: 0 }, { x: 4, z: 0 }, { x: 8, z: 0 }, { x: 12, z: 0 }],
    ARROW: [{ x: 0, z: -4 }, { x: -3, z: -1 }, { x: 3, z: -1 }, { x: -6, z: 2 }, { x: 6, z: 2 }, { x: -9, z: 5 }, { x: 9, z: 5 }],
    CIRCLE: Array.from({ length: 7 }, (_, i) => ({
        x: Math.cos(i / 7 * Math.PI * 2) * 10,
        z: Math.sin(i / 7 * Math.PI * 2) * 10
    }))
};

let currentFormation = formations.V_SHAPE;
let formationKeys = Object.keys(formations);
let formationIndex = 0;

// Avatar Creator with Refined Joints
function createAvatar(color, isPerformer = false) {
    const group = new THREE.Group();

    // Body - Multi-part for smoother bending
    const bodyGroup = new THREE.Group();
    const upperBodyGeo = new THREE.BoxGeometry(1, 0.7, 0.5);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: color,
        metalness: isPerformer ? 0.7 : 0.1,
        roughness: isPerformer ? 0.3 : 0.9
    });
    const upperBody = new THREE.Mesh(upperBodyGeo, bodyMat);
    upperBody.position.y = 1.45;
    bodyGroup.add(upperBody);

    const lowerBodyGeo = new THREE.BoxGeometry(0.9, 0.5, 0.45);
    const lowerBody = new THREE.Mesh(lowerBodyGeo, bodyMat);
    lowerBody.position.y = 0.85;
    bodyGroup.add(lowerBody);
    group.add(bodyGroup);

    // Head
    const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.1;
    group.add(head);

    // Arms - Hierarchical joints
    const createArm = (side) => {
        const armPivot = new THREE.Group();
        armPivot.position.set(side * 0.7, 1.7, 0);

        const upperArmGeo = new THREE.BoxGeometry(0.25, 0.6, 0.25);
        const upperArm = new THREE.Mesh(upperArmGeo, bodyMat);
        upperArm.position.y = -0.3;
        armPivot.add(upperArm);

        const lowerArmPivot = new THREE.Group();
        lowerArmPivot.position.y = -0.6;

        const lowerArmGeo = new THREE.BoxGeometry(0.22, 0.6, 0.22);
        const lowerArm = new THREE.Mesh(lowerArmGeo, bodyMat);
        lowerArm.position.y = -0.3;
        lowerArmPivot.add(lowerArm);
        upperArm.add(lowerArmPivot);

        return { pivot: armPivot, lower: lowerArmPivot };
    };

    const leftArmSet = createArm(-1);
    const rightArmSet = createArm(1);
    group.add(leftArmSet.pivot);
    group.add(rightArmSet.pivot);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.35, 0.7, 0.35);
    const leftLeg = new THREE.Mesh(legGeo, bodyMat);
    leftLeg.position.set(-0.35, 0.35, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, bodyMat);
    rightLeg.position.set(0.35, 0.35, 0);
    group.add(rightLeg);

    return {
        group,
        parts: { bodyGroup, head, leftArm: leftArmSet, rightArm: rightArmSet, leftLeg, rightLeg },
        isPerformer,
        animOffset: Math.random() * Math.PI * 2
    };
}

function initThreeJS() {
    if (renderer) return;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020204);
    scene.fog = new THREE.FogExp2(0x020204, 0.008);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 40);

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('concert-canvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Floor & Stage
    const floorGeo = new THREE.PlaneGeometry(500, 500);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.9 });
    floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const stageGeo = new THREE.BoxGeometry(50, 2, 30);
    const stageMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.9, roughness: 0.15 });
    stage = new THREE.Mesh(stageGeo, stageMat);
    stage.position.y = 1;
    scene.add(stage);

    // Visualizers
    for (let i = 0; i < 64; i++) {
        const barGeo = new THREE.BoxGeometry(0.5, 1, 0.5);
        const barMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.8 });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set((i - 32) * 0.8, 2, -12);
        scene.add(bar);
        cubeVisualizers.push(bar);
    }

    // BTS-style Group (7 members)
    const colors = [0xff0088, 0x00ff88, 0x00d4ff, 0xffaa00, 0xffffff, 0x9900ff, 0xff0000];
    for (let i = 0; i < 7; i++) {
        const p = createAvatar(colors[i], true);
        p.group.scale.set(1.8, 1.8, 1.8);
        scene.add(p.group);
        performers.push(p);
    }

    // Larger Audience
    for (let i = 0; i < 80; i++) {
        const color = new THREE.Color().setHSL(Math.random(), 0.5, 0.3);
        const aud = createAvatar(color, false);
        aud.group.position.set((Math.random() - 0.5) * 80, 0, 20 + Math.random() * 40);
        aud.group.rotation.y = Math.PI + (Math.random() - 0.5);
        scene.add(aud.group);
        audience.push(aud);
    }

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const spotColors = [0x00d4ff, 0xff00ff, 0x00ff88, 0xffaa00, 0xffffff];
    spotColors.forEach((color, i) => {
        const spot = new THREE.SpotLight(color, 25);
        spot.position.set((i - 2) * 20, 50, -15);
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
    analyzer.fftSize = 512;
    source.connect(analyzer);
    analyzer.connect(context.destination);
    dataArray = new Uint8Array(analyzer.frequencyBinCount);
    isAudioInitialized = true;
}

window.onConcertStart = (songUrl) => {
    // Detect Style from Name/Url (Very simple logic for demo)
    const lowerUrl = songUrl.toLowerCase();
    if (lowerUrl.includes('dance') || lowerUrl.includes('fast')) currentStyle = DANCE_STYYLES.POWER;
    else if (lowerUrl.includes('bt') || lowerUrl.includes('pop')) currentStyle = DANCE_STYLES.POWER;
    else if (lowerUrl.includes('slow') || lowerUrl.includes('ballad')) currentStyle = DANCE_STYLES.SWAY;
    else currentStyle = DANCE_STYLES.GROOVE;

    const audio = new Audio(songUrl);
    audio.crossOrigin = "anonymous";
    audio.play().then(() => {
        initAudioContext(audio);
    }).catch(e => console.log("Audio play failed"));
};

function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;
    let energy = { bass: 0, mid: 0, high: 0, peak: false };

    if (isAudioInitialized && analyzer) {
        analyzer.getByteFrequencyData(dataArray);
        const bR = 10, mR = 100;
        for (let i = 0; i < bR; i++) energy.bass += dataArray[i];
        for (let i = bR; i < mR; i++) energy.mid += dataArray[i];
        for (let i = mR; i < dataArray.length; i++) energy.high += dataArray[i];
        energy.bass /= bR; energy.mid /= (mR - bR); energy.high /= (dataArray.length - mR);
        energy.peak = energy.bass > 210;

        cubeVisualizers.forEach((bar, i) => {
            const freq = dataArray[i % dataArray.length];
            const scale = 1 + (freq / 255) * 25;
            bar.scale.y = scale;
            bar.position.y = 2 + scale / 2;
            bar.material.emissiveIntensity = freq / 255 + 1.0;
        });
    }

    const bI = energy.bass / 255;
    const mI = energy.mid / 255;
    const hI = energy.high / 255;

    // Fast formation switch for POWER style
    const switchInterval = currentStyle === DANCE_STYLES.POWER ? 4 : 8;
    if (Math.floor(time) % switchInterval === 0 && (time % 1 < 0.015)) {
        formationIndex = (formationIndex + 1) % formationKeys.length;
        currentFormation = formations[formationKeys[formationIndex]];
    }

    // Professional Animation Logic
    const fullSync = time * 4 * currentStyle.speed;

    performers.forEach((p, i) => {
        const { group, parts, animOffset } = p;

        // 1. Formation LERP
        const tar = currentFormation[i];
        group.position.x = THREE.MathUtils.lerp(group.position.x, tar.x, 0.05);
        group.position.z = THREE.MathUtils.lerp(group.position.z, tar.z, 0.05);

        // 2. Body Core Motion
        group.position.y = 2 + (Math.abs(Math.sin(fullSync)) * currentStyle.bounce * bI) + (energy.peak ? 1.5 : 0);
        group.rotation.z = Math.sin(fullSync * 0.5) * 0.1 * mI * currentStyle.amplitude;

        // 3. Fluid Limb Motion (Hierarchical)
        if (currentStyle.arms === "SHARP") {
            // IDC/BTS POWER Move
            const armAngle = (energy.peak ? Math.PI : Math.PI * 0.3) * Math.sin(fullSync);
            parts.leftArm.pivot.rotation.z = -1.2 - armAngle;
            parts.rightArm.pivot.rotation.z = 1.2 + armAngle;
            parts.leftArm.lower.rotation.z = -Math.sin(fullSync) * 1.5 * bI;
            parts.rightArm.lower.rotation.z = Math.sin(fullSync) * 1.5 * bI;
        } else if (currentStyle.arms === "WAVE") {
            // Groovy Waves
            parts.leftArm.pivot.rotation.x = Math.sin(fullSync + i * 0.5) * 1.5 * mI;
            parts.rightArm.pivot.rotation.x = Math.cos(fullSync + i * 0.5) * 1.5 * mI;
            parts.leftArm.lower.rotation.x = Math.sin(fullSync * 0.8) * 2;
            parts.rightArm.lower.rotation.x = Math.cos(fullSync * 0.8) * 2;
        } else {
            // Elegant Sway
            parts.leftArm.pivot.rotation.z = -0.5 + Math.sin(fullSync * 0.5) * 1.5;
            parts.rightArm.pivot.rotation.z = 0.5 - Math.sin(fullSync * 0.5) * 1.5;
        }

        // Head bounce
        parts.head.rotation.x = Math.sin(fullSync * 2) * 0.2 * bI;
    });

    // Audience: Cheering style depends on song
    audience.forEach(aud => {
        const force = currentStyle === DANCE_STYLES.POWER ? 2.0 : 1.0;
        aud.group.position.y = Math.abs(Math.sin(time * 2 + aud.animOffset)) * force * bI;
        aud.parts.leftArm.pivot.rotation.z = -0.5 - mI * 2;
        aud.parts.rightArm.pivot.rotation.z = 0.5 + mI * 2;
    });

    // Epic Camera & Lights
    const lightInt = (energy.peak ? 60 : 15 + bI * 30);
    spotLights.forEach((spot, i) => {
        spot.intensity = lightInt + (App.state.concertState?.cheerCount || 0) * 1.5;
        spot.position.x = Math.sin(time * 0.3 + i) * 40;
    });

    camera.position.x = Math.sin(time * 0.15) * 25;
    camera.position.z = 45 + Math.cos(time * 0.1) * 10;
    camera.lookAt(0, 6, 0);

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
