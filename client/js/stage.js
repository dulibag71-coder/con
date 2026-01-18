let scene, camera, renderer, analyzer, dataArray;
let spotLights = [], cubeVisualizers = [], performers = [], audience = [];
let particles = [], stageParts = {}, orbitalRings = [], lasers = [];
let isAudioInitialized = false, isGlitchActive = false, glitchTimer = 0;

// ELITE CHOREOGRAPHY ENGINE (100X PRECISION)
const CHOREO = {
    PATTERNS: {
        SHARP: (t) => Math.pow(Math.sin(t), 3), // Knife-like snap
        FLOW: (t) => Math.sin(t) * 0.8 + Math.sin(t * 0.5) * 0.2, // Fluid wave
        STRIKE: (t) => Math.abs(Math.sin(t)) > 0.8 ? 1 : 0, // Impact points
        POPPING: (t) => Math.sin(t * 2) > 0.9 ? 1.2 : Math.sin(t), // Muscle isolation
    },
    STYLES: {
        SUPER_IDOL: { speed: 1.1, tension: 1.5, sharp: true, canon: true },
        STREET_VIBE: { speed: 1.3, tension: 0.8, sharp: false, canon: false },
        ETHEREAL: { speed: 0.8, tension: 1.2, sharp: false, canon: true }
    }
};

let currentStyle = CHOREO.STYLES.SUPER_IDOL;

const formations = {
    V_SHAPE: [{ x: 0, z: 0 }, { x: -8, z: 8 }, { x: 8, z: 8 }, { x: -16, z: 16 }, { x: 16, z: 16 }, { x: -24, z: 24 }, { x: 24, z: 24 }],
    DIAMOND: [{ x: 0, z: 0 }, { x: 0, z: 15 }, { x: 0, z: 30 }, { x: -10, z: 15 }, { x: 10, z: 15 }, { x: -20, z: 15 }, { x: 20, z: 15 }],
    X_CROSS: [{ x: 0, z: 0 }, { x: -10, z: 10 }, { x: 10, z: -10 }, { x: 10, z: 10 }, { x: -10, z: -10 }, { x: -20, z: 20 }, { x: 20, z: -20 }],
    CANON_LINE: Array.from({ length: 7 }, (_, i) => ({ x: (i - 3) * 12, z: 10 }))
};

let currentFormation = formations.V_SHAPE;
let formationKeys = Object.keys(formations), formationIndex = 0;

function createAvatar(color, isPerformer = false) {
    const group = new THREE.Group();
    const reflectorGroup = isPerformer ? new THREE.Group() : null;

    // Joint Hierarchy (Pro Rig)
    const pelvis = new THREE.Group(); pelvis.position.y = 0.8; group.add(pelvis);
    const spine = new THREE.Group(); spine.position.y = 0.4; pelvis.add(spine);
    const torso = new THREE.Group(); spine.add(torso);

    const mat = new THREE.MeshStandardMaterial({
        color: color, metalness: isPerformer ? 1.0 : 0.2, roughness: isPerformer ? 0.01 : 1.0,
        emissive: color, emissiveIntensity: isPerformer ? 1.5 : 0
    });

    const chest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.7), mat);
    chest.position.y = 0.4; torso.add(chest);

    const headGroup = new THREE.Group(); headGroup.position.y = 1.0; torso.add(headGroup);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.75), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
    headGroup.add(head);

    const createLimb = (side, isArm) => {
        const root = new THREE.Group(); root.position.set(side * (isArm ? 0.9 : 0.45), isArm ? 0.7 : 0, 0);
        const upper = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.8, 0.35), mat); upper.position.y = -0.35; root.add(upper);
        const mid = new THREE.Group(); mid.position.y = -0.4; upper.add(mid);
        const lower = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), mat); lower.position.y = -0.4; mid.add(lower);
        return { root, mid, lower };
    };

    const lArm = createLimb(-1, true), rArm = createLimb(1, true);
    const lLeg = createLimb(-1, false), rLeg = createLimb(1, false);

    torso.add(lArm.root); torso.add(rArm.root);
    pelvis.add(lLeg.root); pelvis.add(rLeg.root);

    if (!isPerformer) {
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.8), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 5 }));
        stick.position.set(1.0, 2.5, 0.5); group.add(stick);
    }

    if (isPerformer) {
        const mirror = group.clone(); mirror.scale.y = -1;
        mirror.traverse(n => { if (n.isMesh) { n.material = n.material.clone(); n.material.transparent = true; n.material.opacity = 0.2; } });
        scene.add(mirror); reflectorGroup.add(mirror);
    }

    return {
        group, reflection: isPerformer ? reflectorGroup.children[0] : null,
        parts: { pelvis, spine, torso, headGroup, lArm, rArm, lLeg, rLeg },
        isPerformer, animOffset: Math.random() * Math.PI * 2,
        timingVariation: (Math.random() - 0.5) * 0.05, // Elite Precision (Very low variation)
        canonRank: 0, // Will be set by formation
        vibeOffset: Math.random() * 10
    };
}

function initThreeJS() {
    if (renderer) return;
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x000001);
    scene.fog = new THREE.FogExp2(0x000001, 0.001);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.set(0, 50, 150);

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('concert-canvas'), antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputEncoding = THREE.sRGBEncoding;

    // REFLECTIVE ELITE FLOOR
    const floorGeo = new THREE.PlaneGeometry(5000, 5000);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x010101, roughness: 0.05, metalness: 1.0 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    scene.add(floorMesh);

    // DYNAMIC ULTIMATE STAGE
    const mainStage = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(120, 6, 80), new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 1, roughness: 0.1 }));
    base.position.y = 3; mainStage.add(base);
    scene.add(mainStage); stageParts.main = mainStage;

    // Kinetic Orbits
    for (let i = 0; i < 4; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(100 + i * 25, 0.6, 16, 120), new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 3 }));
        ring.rotation.x = Math.PI / 2; ring.position.y = 60 + i * 15;
        scene.add(ring); orbitalRings.push(ring);
    }

    // High-Precision Lasers
    for (let i = 0; i < 24; i++) {
        const laser = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.8, 600), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4 }));
        laser.position.set((i - 11.5) * 15, 300, -60); scene.add(laser); lasers.push(laser);
    }

    // Elite Performers
    const colors = [0xffffff, 0xff00ff, 0x00ffff, 0xffff00, 0x00ff00, 0xff0088, 0x0088ff];
    colors.forEach((c, i) => {
        const p = createAvatar(c, true);
        p.group.scale.set(3, 3, 3);
        p.canonRank = i;
        scene.add(p.group); performers.push(p);
    });

    // Pro Crowd
    for (let i = 0; i < 400; i++) {
        const aud = createAvatar(new THREE.Color().setHSL(Math.random(), 1, 0.5), false);
        aud.group.position.set((Math.random() - 0.5) * 400, 0, 60 + Math.random() * 250);
        scene.add(aud.group); audience.push(aud);
    }

    scene.add(new THREE.AmbientLight(0xffffff, 0.05));
    for (let i = 0; i < 24; i++) {
        const spot = new THREE.SpotLight(0xffffff, 80);
        spot.position.set((i - 11.5) * 18, 180, -50); spot.angle = 0.15; spot.penumbra = 1.0;
        spot.target = base; scene.add(spot); spotLights.push(spot);
    }

    animate();
}

function spawnParticle(type, pos, color) {
    const geo = type === 'confetti' ? new THREE.PlaneGeometry(0.6, 0.6) : new THREE.SphereGeometry(0.5);
    const mat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide, transparent: true });
    const p = new THREE.Mesh(geo, mat); p.position.copy(pos);
    p.userData = { vel: new THREE.Vector3((Math.random() - 0.5) * 1.2, type === 'fire' ? 1.8 : (Math.random() * 0.8 + 0.6), (Math.random() - 0.5) * 1.2), rot: new THREE.Vector3(Math.random() * 0.4, Math.random() * 0.4, Math.random() * 0.4), life: 1.0, type: type };
    scene.add(p); particles.push(p);
}

function initAudioContext(audioElement) {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const source = context.createMediaElementSource(audioElement);
    analyzer = context.createAnalyser(); analyzer.fftSize = 2048;
    source.connect(analyzer); analyzer.connect(context.destination);
    dataArray = new Uint8Array(analyzer.frequencyBinCount); isAudioInitialized = true;
}

window.onConcertStart = (url) => {
    const l = url.toLowerCase();
    if (l.includes('bts') || l.includes('fast') || l.includes('pop')) {
        currentStyle = CHOREO.STYLES.SUPER_IDOL;
        currentFormation = formations.V_SHAPE;
    } else {
        currentStyle = CHOREO.STYLES.STREET_VIBE;
        currentFormation = formations.CANON_LINE;
    }
    const a = new Audio(url); a.crossOrigin = "anonymous"; a.play().then(() => initAudioContext(a));
};

window.onVFXTrigger = (type) => {
    if (type === 'fire') for (let i = 0; i < 30; i++) spawnParticle('fire', new THREE.Vector3((Math.random() - 0.5) * 120, 5, -35), 0xff6600);
    else if (type === 'confetti') for (let i = 0; i < 150; i++) spawnParticle('confetti', new THREE.Vector3((Math.random() - 0.5) * 250, 80, (Math.random() - 0.5) * 150), new THREE.Color().setHSL(Math.random(), 1.0, 0.6));
    else if (type === 'glitch') { isGlitchActive = true; glitchTimer = 200; }
};

function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;
    let energy = { b: 0, m: 0, h: 0, peak: false };

    if (glitchTimer > 0) { glitchTimer--; if (glitchTimer <= 0) isGlitchActive = false; }

    if (isAudioInitialized && analyzer) {
        analyzer.getByteFrequencyData(dataArray);
        for (let i = 0; i < 25; i++) energy.b += dataArray[i];
        for (let i = 25; i < 250; i++) energy.m += dataArray[i];
        for (let i = 250; i < 1000; i++) energy.h += dataArray[i];
        energy.b /= 25; energy.m /= 225; energy.h /= 750;
        energy.peak = energy.b > 220;
    }

    const b = energy.b / 255, m = energy.m / 255, h = energy.h / 255;

    // 1. ELITE STAGE DYNAMICS
    stageParts.main.position.y = 6 + Math.sin(time * 0.6) * 10 * m;
    orbitalRings.forEach((r, i) => { r.rotation.y += (0.012 + i * 0.012) * (1.2 + b); r.scale.setScalar(1 + b * 0.15); });
    lasers.forEach((l, i) => {
        l.rotation.z = Math.sin(time * 0.6 + i * 0.5) * 0.6;
        l.material.opacity = m * (i % 3 === 0 ? 0.3 : 0.9);
        l.scale.y = 1 + h * 3;
    });

    if (energy.peak && Math.random() < 0.1) {
        spawnParticle('fire', new THREE.Vector3((Math.random() - 0.5) * 120, 5, -35), 0xffaa00);
    }

    // 2. 100X PRECISION CHOREOGRAPHY ENGINE
    const beat = time * 7.5 * currentStyle.speed;
    const sharpBeat = CHOREO.PATTERNS.SHARP(beat);
    const flowBeat = CHOREO.PATTERNS.FLOW(beat);

    performers.forEach((p, i) => {
        const { parts, group, reflection, timingVariation, canonRank, vibeOffset } = p;
        const tar = currentFormation[i];

        // Elite Positioning
        group.position.x = THREE.MathUtils.lerp(group.position.x, tar.x, 0.08);
        group.position.z = THREE.MathUtils.lerp(group.position.z, tar.z, 0.08);
        group.position.y = stageParts.main.position.y + 5.5;

        // Canon AI: Wave effects
        const canonDelay = currentStyle.canon ? canonRank * 0.15 : 0;
        const localBeat = beat - canonDelay + timingVariation;
        const localSharp = CHOREO.PATTERNS.SHARP(localBeat);
        const localFlow = CHOREO.PATTERNS.FLOW(localBeat);

        // Weighted Breathing
        const breath = Math.sin(time * 2.5 + vibeOffset) * 0.1;
        parts.torso.scale.setScalar(1 + breath);

        // Pelvic Drive & Body Weight
        const isCenter = i === 0;
        const energyMult = isCenter ? 1.4 : 1.0;
        const bounce = Math.abs(localSharp) * 1.8 * b * energyMult;
        parts.pelvis.position.y = 0.8 + bounce + (energy.peak ? 4.5 : 0);
        parts.spine.rotation.x = -localFlow * 0.15 * b; // Professional lean
        parts.torso.rotation.z = localSharp * 0.3 * b;

        // "Knife-Sharp" Limbs
        const armWave = localFlow * 2.2 * b * energyMult;
        parts.lArm.root.rotation.z = -1.5 - armWave;
        parts.rArm.root.rotation.z = 1.5 + armWave;
        parts.lArm.mid.rotation.z = -Math.abs(localSharp) * 2.5 * b;
        parts.rArm.mid.rotation.z = Math.abs(localSharp) * 2.5 * b;

        // Ground-Planted Leg Physics
        const legSwing = localFlow * 0.8 * b;
        parts.lLeg.root.rotation.x = Math.max(-0.5, Math.sin(localBeat) * 1.2 * b);
        parts.rLeg.root.rotation.x = Math.max(-0.5, -Math.sin(localBeat) * 1.2 * b);
        parts.lLeg.mid.rotation.x = Math.max(0, Math.sin(localBeat) * 1.8) * b;
        parts.rLeg.mid.rotation.x = Math.max(0, -Math.sin(localBeat) * 1.8) * b;

        parts.headGroup.rotation.y = localSharp * 0.6 * h;

        if (reflection) { reflection.position.copy(group.position); reflection.position.y = -group.position.y; reflection.rotation.copy(group.rotation); }
    });

    // 3. GALAXY SYNC (AUDIENCE)
    audience.forEach(aud => {
        aud.group.position.y = Math.abs(Math.sin(time * 3 + aud.animOffset)) * 2.0 * b;
        aud.parts.rArm.root.rotation.z = 1.2 + Math.sin(time * 6 + aud.animOffset) * 0.6 * b;
        aud.group.rotation.y = Math.sin(time + aud.animOffset) * 0.3;
    });

    // 4. ELITE PARTICLE PHYSICS
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.position.add(p.userData.vel);
        if (p.userData.type === 'confetti') { p.userData.vel.y -= 0.015; p.rotation.x += p.userData.rot.x; p.rotation.y += p.userData.rot.y; }
        p.userData.life -= 0.015; p.material.opacity = p.userData.life;
        if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); }
    }

    // 5. PRO DIRECTOR AI (HERO SHOTS)
    if (energy.peak && time % 1.2 < 0.025) {
        const mode = Math.random();
        if (mode < 0.5) camera.position.set(0, 5, 25); // Elite Hero Close-up
        else if (mode < 0.8) camera.position.set((Math.random() - 0.5) * 250, 100, 200);
        else camera.position.set(0, 400, 80);
    }
    if (isGlitchActive) { camera.position.x += (Math.random() - 0.5) * 12; camera.position.y += (Math.random() - 0.5) * 12; scene.background = new THREE.Color(Math.random() * 0.2, 0, 0); }
    else scene.background = new THREE.Color(0x000001);

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, Math.sin(time * 0.12) * 200, 0.02);
    camera.lookAt(0, 20 + b * 40, 0);

    spotLights.forEach((s, i) => { s.intensity = (energy.peak ? 250 : 50 + b * 120); s.color.setHSL((time * 0.04 + i * 0.06) % 1, 1.0, 0.5); s.position.x = Math.sin(time * 0.15 + i) * 200; });

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
