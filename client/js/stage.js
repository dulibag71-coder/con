let scene, camera, renderer, analyzer, dataArray;
let spotLights = [], cubeVisualizers = [], performers = [], audience = [];
let particles = [], stageParts = {}, orbitalRings = [], lasers = [];
let isAudioInitialized = false, isGlitchActive = false, glitchTimer = 0;

// FINAL FRONTIER STYLES - GOD TIER ONLY
const DANCE_STYLES = {
    UNIVERSE: { speed: 1.8, amp: 2.0, bounce: 1.6, energy: 1.0, power: true },
    NEBULA: { speed: 1.3, amp: 1.5, bounce: 0.9, energy: 0.7, power: false },
    SUPERNOVA: { speed: 2.2, amp: 2.5, bounce: 2.0, energy: 1.2, power: true }
};

let currentStyle = DANCE_STYLES.UNIVERSE;

const formations = {
    ORBIT: Array.from({ length: 7 }, (_, i) => ({ x: Math.sin(i / 7 * Math.PI * 2) * 15, z: Math.cos(i / 7 * Math.PI * 2) * 15 })),
    PHOENIX: [{ x: 0, z: 0 }, { x: -8, z: 5 }, { x: 8, z: 5 }, { x: -16, z: 10 }, { x: 16, z: 10 }, { x: -24, z: 15 }, { x: 24, z: 15 }],
    ARROW_ULTRA: [{ x: 0, z: 0 }, { x: -5, z: 5 }, { x: 5, z: 5 }, { x: -10, z: 10 }, { x: 10, z: 10 }, { x: -15, z: 15 }, { x: 15, z: 15 }],
    CENTER_STAGE: [{ x: 0, z: 0 }, { x: -3, z: 0 }, { x: 3, z: 0 }, { x: -6, z: 3 }, { x: 6, z: 3 }, { x: -9, z: 6 }, { x: 9, z: 6 }]
};

let currentFormation = formations.ORBIT;
let formationKeys = Object.keys(formations), formationIndex = 0;

function createAvatar(color, isPerformer = false) {
    const group = new THREE.Group();
    const reflectorGroup = isPerformer ? new THREE.Group() : null;

    // Joint Hierarchy
    const pelvis = new THREE.Group(); pelvis.position.y = 0.8; group.add(pelvis);
    const torso = new THREE.Group(); torso.position.y = 0.4; pelvis.add(torso);

    const mat = new THREE.MeshStandardMaterial({
        color: color, metalness: isPerformer ? 1.0 : 0.2, roughness: isPerformer ? 0.02 : 1.0,
        emissive: color, emissiveIntensity: isPerformer ? 0.8 : 0
    });

    const chest = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.6), mat);
    chest.position.y = 0.4; torso.add(chest);

    const headGroup = new THREE.Group(); headGroup.position.y = 0.9; torso.add(headGroup);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
    headGroup.add(head);

    const createLimb = (side, isArm) => {
        const root = new THREE.Group(); root.position.set(side * (isArm ? 0.8 : 0.4), isArm ? 0.6 : 0, 0);
        const upper = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.3), mat); upper.position.y = -0.3; root.add(upper);
        const midJoint = new THREE.Group(); midJoint.position.y = -0.35; upper.add(midJoint);
        const lower = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.25), mat); lower.position.y = -0.35; midJoint.add(lower);
        return { root, mid: midJoint, lower };
    };

    const lArm = createLimb(-1, true), rArm = createLimb(1, true);
    const lLeg = createLimb(-1, false), rLeg = createLimb(1, false);

    torso.add(lArm.root); torso.add(rArm.root);
    pelvis.add(lLeg.root); pelvis.add(rLeg.root);

    // Lightstick for audience
    if (!isPerformer) {
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.5), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 2 }));
        stick.position.set(0.8, 2.5, 0.2);
        group.add(stick);
    }

    if (isPerformer) {
        const mirror = group.clone(); mirror.scale.y = -1;
        mirror.traverse(n => { if (n.isMesh) { n.material = n.material.clone(); n.material.transparent = true; n.material.opacity = 0.25; } });
        scene.add(mirror);
        reflectorGroup.add(mirror);
    }

    return {
        group, reflection: isPerformer ? reflectorGroup.children[0] : null,
        parts: { pelvis, torso, headGroup, lArm, rArm, lLeg, rLeg },
        isPerformer, animOffset: Math.random() * Math.PI * 2,
        timingVariation: (Math.random() - 0.5) * 0.15, // Micro-timing offset for realism
        vibeOffset: Math.random() * 10
    };
}

function initThreeJS() {
    if (renderer) return;
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x000002);
    scene.fog = new THREE.FogExp2(0x000002, 0.002);

    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 4000);
    camera.position.set(0, 40, 100);

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('concert-canvas'), antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputEncoding = THREE.sRGBEncoding;

    // REFLECTIVE GALAXY FLOOR
    const floorGeo = new THREE.PlaneGeometry(3000, 3000);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x010101, roughness: 0.1, metalness: 1.0 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    scene.add(floorMesh);

    // KINETIC INFINITY FRONTIER STAGE
    const mainStage = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(100, 5, 70), new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 1, roughness: 0.1 }));
    base.position.y = 2.5; mainStage.add(base);
    scene.add(mainStage); stageParts.main = mainStage;

    // Orbital LED Rings
    for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(80 + i * 20, 0.5, 16, 100), new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 2 }));
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 50 + i * 10;
        scene.add(ring); orbitalRings.push(ring);
    }

    // Volumetric Lasers
    for (let i = 0; i < 16; i++) {
        const laser = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.5, 400), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 }));
        laser.position.set((i - 7.5) * 20, 200, -50); scene.add(laser); lasers.push(laser);
    }

    // Performers & Galaxy Crowd
    const colors = [0xff00ff, 0x00ffff, 0xffff00, 0x00ff00, 0xff0088, 0x0088ff, 0xffffff];
    colors.forEach(c => { const p = createAvatar(c, true); p.group.scale.set(3, 3, 3); scene.add(p.group); performers.push(p); });

    for (let i = 0; i < 350; i++) {
        const aud = createAvatar(new THREE.Color().setHSL(Math.random(), 1, 0.5), false);
        aud.group.position.set((Math.random() - 0.5) * 300, 0, 50 + Math.random() * 200);
        scene.add(aud.group); audience.push(aud);
    }

    scene.add(new THREE.AmbientLight(0xffffff, 0.1));
    for (let i = 0; i < 20; i++) {
        const spot = new THREE.SpotLight(0xffffff, 60);
        spot.position.set((i - 9.5) * 20, 150, -40); spot.angle = 0.2; spot.penumbra = 0.9;
        spot.target = base; scene.add(spot); spotLights.push(spot);
    }

    animate();
}

function spawnParticle(type, pos, color) {
    const geo = type === 'confetti' ? new THREE.PlaneGeometry(0.5, 0.5) : new THREE.SphereGeometry(0.4);
    const mat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide, transparent: true });
    const p = new THREE.Mesh(geo, mat); p.position.copy(pos);
    p.userData = { vel: new THREE.Vector3((Math.random() - 0.5), type === 'fire' ? 1.5 : (Math.random() * 0.6 + 0.4), (Math.random() - 0.5)), rot: new THREE.Vector3(Math.random() * 0.3, Math.random() * 0.3, Math.random() * 0.3), life: 1.0, type: type };
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
    if (l.includes('pop') || l.includes('bts') || l.includes('fast')) currentStyle = DANCE_STYLES.SUPERNOVA;
    else if (l.includes('slow')) currentStyle = DANCE_STYLES.NEBULA;
    else currentStyle = DANCE_STYLES.UNIVERSE;
    const a = new Audio(url); a.crossOrigin = "anonymous"; a.play().then(() => initAudioContext(a));
};

window.onVFXTrigger = (type) => {
    if (type === 'fire') for (let i = 0; i < 25; i++) spawnParticle('fire', new THREE.Vector3((Math.random() - 0.5) * 100, 5, -25), 0xff4400);
    else if (type === 'confetti') for (let i = 0; i < 100; i++) spawnParticle('confetti', new THREE.Vector3((Math.random() - 0.5) * 200, 60, (Math.random() - 0.5) * 100), new THREE.Color().setHSL(Math.random(), 1, 0.6));
    else if (type === 'glitch') { isGlitchActive = true; glitchTimer = 180; }
};

function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;
    let energy = { b: 0, m: 0, h: 0, peak: false };

    if (glitchTimer > 0) { glitchTimer--; if (glitchTimer <= 0) isGlitchActive = false; }

    if (isAudioInitialized && analyzer) {
        analyzer.getByteFrequencyData(dataArray);
        for (let i = 0; i < 20; i++) energy.b += dataArray[i];
        for (let i = 20; i < 200; i++) energy.m += dataArray[i];
        for (let i = 200; i < 1000; i++) energy.h += dataArray[i];
        energy.b /= 20; energy.m /= 180; energy.h /= 800;
        energy.peak = energy.b > 215;
    }

    const b = energy.b / 255, m = energy.m / 255, h = energy.h / 255;

    // 1. FINAL FRONTIER ENVIRONMENT
    stageParts.main.position.y = 5 + Math.sin(time * 0.5) * 8 * m;
    orbitalRings.forEach((r, i) => { r.rotation.y += (0.01 + i * 0.01) * (1 + b); r.scale.setScalar(1 + b * 0.1); });
    lasers.forEach((l, i) => {
        l.rotation.z = Math.sin(time * 0.5 + i) * 0.5;
        l.material.opacity = m * (i % 2 === 0 ? 0.4 : 0.8);
        l.scale.y = 1 + h * 2;
    });

    if (energy.peak) {
        for (let i = 0; i < 2; i++) spawnParticle('fire', new THREE.Vector3((Math.random() - 0.5) * 100, 5, -30), 0xffcc00);
    }

    // 2. HUMAN VARIATION DANCE ENGINE
    const syncBase = time * 7 * currentStyle.speed;
    performers.forEach((p, i) => {
        const { parts, group, reflection, animOffset, timingVariation, vibeOffset } = p;
        const tar = currentFormation[i];
        group.position.x = THREE.MathUtils.lerp(group.position.x, tar.x, 0.04);
        group.position.z = THREE.MathUtils.lerp(group.position.z, tar.z, 0.04);

        const sync = syncBase + (timingVariation * currentStyle.energy); // Human imperfection
        const breath = Math.sin(time * 2 + vibeOffset) * 0.08; parts.torso.scale.setScalar(1 + breath);

        const bounce = Math.abs(Math.sin(sync)) * currentStyle.bounce * b;
        parts.pelvis.position.y = 0.8 + bounce + (energy.peak ? 3.5 : 0);
        parts.torso.rotation.z = Math.sin(sync * 0.5) * 0.25 * b;

        const armMove = Math.sin(sync + i * 0.4) * currentStyle.amp;
        parts.lArm.root.rotation.z = -1.3 - armMove * b;
        parts.rArm.root.rotation.z = 1.3 + armMove * b;
        parts.lArm.mid.rotation.z = -Math.abs(armMove) * 2.2 * b;
        parts.rArm.mid.rotation.z = Math.abs(armMove) * 2.2 * b;

        parts.lLeg.root.rotation.x = Math.sin(sync) * 0.7 * b;
        parts.rLeg.root.rotation.x = -Math.sin(sync) * 0.7 * b;
        parts.lLeg.mid.rotation.x = Math.max(0, Math.sin(sync) * 1.5) * b;

        parts.headGroup.rotation.y = Math.sin(sync * 2) * 0.5 * h;

        if (reflection) { reflection.position.copy(group.position); reflection.position.y = -group.position.y; reflection.rotation.copy(group.rotation); }
    });

    // 3. GALAXY AUDIENCE SYNC
    audience.forEach(aud => {
        aud.group.position.y = Math.abs(Math.sin(time * 2.5 + aud.animOffset)) * 1.5 * b;
        aud.parts.rArm.root.rotation.z = 1.0 + Math.sin(time * 5 + aud.animOffset) * 0.5 * b;
    });

    // 4. ULTIMATE PARTICLE PHYSICS
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.position.add(p.userData.vel);
        if (p.userData.type === 'confetti') { p.userData.vel.y -= 0.012; p.rotation.x += p.userData.rot.x; p.rotation.y += p.userData.rot.y; }
        p.userData.life -= 0.012; p.material.opacity = p.userData.life;
        if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); }
    }

    // 5. CINEMATIC FRONTIER CAMERA
    if (energy.peak && time % 0.8 < 0.02) {
        const mode = Math.random();
        if (mode < 0.4) camera.position.set(0, 10, 30); // Hero Shot
        else if (mode < 0.7) camera.position.set((Math.random() - 0.5) * 200, 80, 150);
        else camera.position.set(0, 300, 50);
    }
    if (isGlitchActive) { camera.position.x += (Math.random() - 0.5) * 8; camera.position.y += (Math.random() - 0.5) * 8; scene.background = new THREE.Color(Math.random() * 0.1, 0, 0); }
    else scene.background = new THREE.Color(0x000002);

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, Math.sin(time * 0.1) * 150, 0.02);
    camera.lookAt(0, 15 + b * 30, 0);

    spotLights.forEach((s, i) => { s.intensity = (energy.peak ? 200 : 40 + b * 100); s.color.setHSL((time * 0.03 + i * 0.05) % 1, 1.0, 0.5); s.position.x = Math.sin(time * 0.1 + i) * 150; });

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
