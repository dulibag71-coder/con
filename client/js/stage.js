let scene, camera, renderer, stage, floor, analyzer, dataArray;
let spotLights = [];
let cubeVisualizers = [];
let performers = [];
let audience = [];
let particles = []; // Fire, Confetti, Sparks
let stageParts = {}; // Kinetic elements
let isAudioInitialized = false;

// MEGA DANCE STYLES - 10X Re-tuned
const DANCE_STYLES = {
    LEGENDARY: { speed: 1.6, amp: 1.5, bounce: 1.2, power: true, style: "K-POP_GOD" },
    SMOOTH_CRIMINAL: { speed: 1.0, amp: 1.2, bounce: 0.6, power: false, style: "GROOVE_MASTER" },
    ETHEREAL: { speed: 0.6, amp: 0.8, bounce: 0.3, power: false, style: "FLOW_STATE" }
};

let currentStyle = DANCE_STYLES.LEGENDARY;

const formations = {
    DIAMOND: [{ x: 0, z: 0 }, { x: -4, z: 4 }, { x: 4, z: 4 }, { x: 0, z: 8 }, { x: -8, z: 8 }, { x: 8, z: 8 }, { x: 0, z: 12 }],
    V_POWER: [{ x: 0, z: 0 }, { x: -5, z: 3 }, { x: 5, z: 3 }, { x: -10, z: 6 }, { x: 10, z: 6 }, { x: -15, z: 9 }, { x: 15, z: 9 }],
    LINE_X: [{ x: -15, z: 0 }, { x: -10, z: 0 }, { x: -5, z: 0 }, { x: 0, z: 0 }, { x: 5, z: 0 }, { x: 10, z: 0 }, { x: 15, z: 0 }],
    WAVE: Array.from({ length: 7 }, (_, i) => ({ x: (i - 3) * 6, z: Math.sin(i) * 5 }))
};

let currentFormation = formations.DIAMOND;
let formationKeys = Object.keys(formations);
let formationIndex = 0;

// Hyper-Refined Avatar with Pro Joints & Pelvic Control
function createAvatar(color, isPerformer = false) {
    const group = new THREE.Group();

    // Joint Hierarchy: Pelvis -> Torso -> Neck -> Head
    const pelvis = new THREE.Group();
    pelvis.position.y = 0.8;
    group.add(pelvis);

    const torso = new THREE.Group();
    torso.position.y = 0.4;
    pelvis.add(torso);

    const mat = new THREE.MeshStandardMaterial({
        color: color,
        metalness: isPerformer ? 0.9 : 0.1,
        roughness: isPerformer ? 0.1 : 0.9,
        emissive: color,
        emissiveIntensity: isPerformer ? 0.2 : 0
    });

    const chest = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.6), mat);
    chest.position.y = 0.4;
    torso.add(chest);

    const headGroup = new THREE.Group();
    headGroup.position.y = 0.9;
    torso.add(headGroup);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
    headGroup.add(head);

    // Advanced Limbs (Elbows & Knees)
    const createLimb = (side, isArm) => {
        const root = new THREE.Group();
        root.position.set(side * (isArm ? 0.75 : 0.4), isArm ? 0.6 : 0, 0);

        const upper = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.3), mat);
        upper.position.y = -0.3;
        root.add(upper);

        const midJoint = new THREE.Group();
        midJoint.position.y = -0.35;
        upper.add(midJoint);

        const lower = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.25), mat);
        lower.position.y = -0.35;
        midJoint.add(lower);

        return { root, mid: midJoint, lower };
    };

    const lArm = createLimb(-1, true);
    const rArm = createLimb(1, true);
    const lLeg = createLimb(-1, false);
    const rLeg = createLimb(1, false);

    torso.add(lArm.root);
    torso.add(rArm.root);
    pelvis.add(lLeg.root);
    pelvis.add(rLeg.root);

    return {
        group,
        parts: { pelvis, torso, headGroup, lArm, rArm, lLeg, rLeg },
        isPerformer,
        animOffset: Math.random() * Math.PI * 2,
        vibe: Math.random()
    };
}

function initThreeJS() {
    if (renderer) return;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010103);
    scene.fog = new THREE.FogExp2(0x010103, 0.005);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 20, 60);

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('concert-canvas'), antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;

    // KINETIC STAGE DESIGN
    const floorGeo = new THREE.PlaneGeometry(1000, 1000);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 0.1, metalness: 1.0 });
    floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Main Kinetic Platform
    const mainStage = new THREE.Group();
    const baseStage = new THREE.Mesh(new THREE.BoxGeometry(60, 3, 40), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 1, roughness: 0.2 }));
    baseStage.position.y = 1.5;
    mainStage.add(baseStage);
    scene.add(mainStage);
    stageParts.main = mainStage;

    // LED Wings
    const wingGeo = new THREE.BoxGeometry(20, 40, 1);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0x00ffff, emissiveIntensity: 2 });
    const lWing = new THREE.Mesh(wingGeo, wingMat);
    lWing.position.set(-45, 20, -15);
    lWing.rotation.y = Math.PI / 6;
    scene.add(lWing);
    stageParts.lWing = lWing;

    const rWing = new THREE.Mesh(wingGeo, wingMat);
    rWing.position.set(45, 20, -15);
    rWing.rotation.y = -Math.PI / 6;
    scene.add(rWing);
    stageParts.rWing = rWing;

    // Mega Visualizer Wall
    for (let i = 0; i < 128; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1, 0.6), new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 1 }));
        bar.position.set((i - 64) * 0.8, -10, -30);
        scene.add(bar);
        cubeVisualizers.push(bar);
    }

    // Pro Performers
    const colors = [0xff0088, 0x00ff88, 0x00d4ff, 0xffaa00, 0xffffff, 0xaa00ff, 0xff4400];
    colors.forEach(c => {
        const p = createAvatar(c, true);
        p.group.scale.set(2.2, 2.2, 2.2);
        scene.add(p.group);
        performers.push(p);
    });

    // Epic Crowd
    for (let i = 0; i < 150; i++) {
        const aud = createAvatar(new THREE.Color().setHSL(Math.random(), 0.7, 0.4), false);
        aud.group.position.set((Math.random() - 0.5) * 150, 0, 30 + Math.random() * 100);
        scene.add(aud.group);
        audience.push(aud);
    }

    scene.add(new THREE.AmbientLight(0xffffff, 0.2));

    // Volumetric-like Spotlights
    for (let i = 0; i < 8; i++) {
        const spot = new THREE.SpotLight(0xffffff, 40);
        spot.position.set((i - 3.5) * 30, 80, -20);
        spot.angle = 0.3;
        spot.penumbra = 0.8;
        spot.target = baseStage;
        scene.add(spot);
        spotLights.push(spot);
    }

    animate();
}

function spawnParticle(type, pos, color) {
    const geo = new THREE.SphereGeometry(type === 'fire' ? 0.4 : 0.1);
    const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 });
    const p = new THREE.Mesh(geo, mat);
    p.position.copy(pos);
    p.userData = {
        vel: new THREE.Vector3((Math.random() - 0.5) * 0.5, type === 'fire' ? 0.8 : 0.2, (Math.random() - 0.5) * 0.5),
        life: 1.0,
        type: type
    };
    scene.add(p);
    particles.push(p);
}

function initAudioContext(audioElement) {
    if (isAudioInitialized) return;
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const source = context.createMediaElementSource(audioElement);
    analyzer = context.createAnalyser();
    analyzer.fftSize = 1024;
    source.connect(analyzer);
    analyzer.connect(context.destination);
    dataArray = new Uint8Array(analyzer.frequencyBinCount);
    isAudioInitialized = true;
}

window.onConcertStart = (songUrl) => {
    const l = songUrl.toLowerCase();
    if (l.includes('pop') || l.includes('bts') || l.includes('fast')) currentStyle = DANCE_STYLES.LEGENDARY;
    else if (l.includes('slow')) currentStyle = DANCE_STYLES.ETHEREAL;
    else currentStyle = DANCE_STYLES.SMOOTH_CRIMINAL;

    const audio = new Audio(songUrl);
    audio.crossOrigin = "anonymous";
    audio.play().then(() => initAudioContext(audio));
};

function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;
    let energy = { b: 0, m: 0, h: 0, peak: false };

    if (isAudioInitialized && analyzer) {
        analyzer.getByteFrequencyData(dataArray);
        for (let i = 0; i < 10; i++) energy.b += dataArray[i];
        for (let i = 10; i < 100; i++) energy.m += dataArray[i];
        for (let i = 100; i < 500; i++) energy.h += dataArray[i];
        energy.b /= 10; energy.m /= 90; energy.h /= 400;
        energy.peak = energy.b > 215;

        cubeVisualizers.forEach((bar, i) => {
            const v = dataArray[i % 512];
            bar.scale.y = 1 + (v / 255) * 60;
            bar.position.y = (bar.scale.y / 2) - 10;
            bar.material.emissiveIntensity = v / 255 * 5;
        });
    }

    const b = energy.b / 255, m = energy.m / 255, h = energy.h / 255;

    // 1. KINETIC STAGE ANIMATION
    stageParts.main.position.y = Math.sin(time * 0.5) * 2 * m;
    stageParts.lWing.rotation.z = Math.sin(time) * 0.2 * b;
    stageParts.rWing.rotation.z = -Math.sin(time) * 0.2 * b;
    if (energy.peak) {
        stageParts.lWing.material.emissiveIntensity = 10;
        for (let i = 0; i < 5; i++) spawnParticle('fire', new THREE.Vector3((Math.random() - 0.5) * 50, 2, -10), 0xffaa00);
    } else {
        stageParts.lWing.material.emissiveIntensity = THREE.MathUtils.lerp(stageParts.lWing.material.emissiveIntensity, 1, 0.1);
    }

    // 2. ULTIMATE DANCE ENGINE
    const sync = time * 5 * currentStyle.speed;
    performers.forEach((p, i) => {
        const { parts, group, animOffset } = p;
        const tar = currentFormation[i];
        group.position.x = THREE.MathUtils.lerp(group.position.x, tar.x, 0.04);
        group.position.z = THREE.MathUtils.lerp(group.position.z, tar.z, 0.04);

        // Core Physics: Pelvic Weight & Rebound
        const bounce = Math.abs(Math.sin(sync)) * currentStyle.bounce * b;
        parts.pelvis.position.y = 0.8 + bounce + (energy.peak ? 1.2 : 0);
        parts.torso.rotation.x = Math.sin(sync) * 0.2 * m;
        parts.torso.rotation.z = Math.cos(sync * 0.5) * 0.15 * m;

        // IK-inspired Limb Logic
        const armWave = Math.sin(sync + i * 0.2) * currentStyle.amp;
        parts.lArm.root.rotation.z = -1.2 - armWave * m;
        parts.rArm.root.rotation.z = 1.2 + armWave * m;
        parts.lArm.mid.rotation.z = -Math.abs(armWave) * 1.5 * b;
        parts.rArm.mid.rotation.z = Math.abs(armWave) * 1.5 * b;

        // Leg Grounding
        parts.lLeg.root.rotation.x = Math.sin(sync) * 0.5 * b;
        parts.rLeg.root.rotation.x = -Math.sin(sync) * 0.5 * b;
        parts.lLeg.mid.rotation.x = Math.max(0, Math.sin(sync) * 1.0) * b;
        parts.rLeg.mid.rotation.x = Math.max(0, -Math.sin(sync) * 1.0) * b;

        parts.headGroup.rotation.y = Math.sin(sync * 2) * 0.3 * h;
    });

    // 3. PARTICLE PHYSICS
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.add(p.userData.vel);
        p.userData.life -= 0.02;
        p.material.opacity = p.userData.life;
        if (p.userData.life <= 0) {
            scene.remove(p);
            particles.splice(i, 1);
        }
    }

    // 4. CINEMATIC DIRECTOR AI
    const camTargetY = 5 + b * 10;
    if (energy.peak && time % 2 < 0.02) {
        // Dramatic Cut
        camera.position.set((Math.random() - 0.5) * 100, 10 + Math.random() * 40, 40 + Math.random() * 60);
    }
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, Math.sin(time * 0.2) * 40, 0.01);
    camera.lookAt(0, camTargetY, 0);

    // 5. STADIUM LIGHTING
    spotLights.forEach((s, i) => {
        s.intensity = (energy.peak ? 100 : 20 + b * 50);
        s.color.setHSL((time * 0.1 + i * 0.1) % 1, 0.8, 0.5);
        s.position.x = Math.sin(time * 0.3 + i) * 60;
    });

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
