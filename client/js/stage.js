let scene, camera, renderer, stage, floor, analyzer, dataArray;
let spotLights = [];
let cubeVisualizers = [];
let performers = [];
let audience = [];
let particles = [];
let stageParts = {};
let isAudioInitialized = false;
let isGlitchActive = false;
let glitchTimer = 0;

// INFINITY TOUR STYLES - Ultra-performance
const DANCE_STYLES = {
    INFINITY: { speed: 1.8, amp: 1.8, bounce: 1.5, power: true, mode: "IDOL_ULTIMATE" },
    RHYTHM: { speed: 1.2, amp: 1.4, bounce: 0.8, power: false, mode: "HIPHOP_VIBE" },
    DREAM: { speed: 0.7, amp: 1.0, bounce: 0.4, power: false, mode: "ETHER_FLOW" }
};

let currentStyle = DANCE_STYLES.INFINITY;

const formations = {
    STAR: [{ x: 0, z: 0 }, { x: -6, z: 6 }, { x: 6, z: 6 }, { x: -12, z: 12 }, { x: 12, z: 12 }, { x: 0, z: 15 }, { x: 0, z: -5 }],
    TRIANGLE_PRO: [{ x: 0, z: 0 }, { x: -4, z: 4 }, { x: 4, z: 4 }, { x: -8, z: 8 }, { x: 8, z: 8 }, { x: -12, z: 12 }, { x: 12, z: 12 }],
    CROWN: [{ x: 0, z: 0 }, { x: -5, z: 3 }, { x: 5, z: 3 }, { x: -10, z: 1 }, { x: 10, z: 1 }, { x: -15, z: -2 }, { x: 15, z: -2 }],
    INFINITY_LOOP: Array.from({ length: 7 }, (_, i) => ({
        x: Math.sin(i / 7 * Math.PI * 4) * 15,
        z: Math.sin(i / 7 * Math.PI * 2) * 8
    }))
};

let currentFormation = formations.STAR;
let formationKeys = Object.keys(formations);
let formationIndex = 0;

function createAvatar(color, isPerformer = false) {
    const group = new THREE.Group();
    const reflectorGroup = isPerformer ? new THREE.Group() : null; // For floor reflection

    const pelvis = new THREE.Group();
    pelvis.position.y = 0.8;
    group.add(pelvis);

    const torso = new THREE.Group();
    torso.position.y = 0.4;
    pelvis.add(torso);

    const mat = new THREE.MeshStandardMaterial({
        color: color,
        metalness: isPerformer ? 1.0 : 0.1,
        roughness: isPerformer ? 0.05 : 0.9,
        emissive: color,
        emissiveIntensity: isPerformer ? 0.5 : 0
    });

    const chest = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.6), mat);
    chest.position.y = 0.4;
    torso.add(chest);

    const headGroup = new THREE.Group();
    headGroup.position.y = 0.9;
    torso.add(headGroup);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
    headGroup.add(head);

    const createLimb = (side, isArm) => {
        const root = new THREE.Group();
        root.position.set(side * (isArm ? 0.8 : 0.4), isArm ? 0.6 : 0, 0);
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

    // Create Reflector (Mirror) clone for Performers
    if (isPerformer) {
        const mirrorClone = group.clone();
        mirrorClone.scale.y = -1; // Flip vertically
        // Apply semi-transparent material to mirror
        mirrorClone.traverse(node => {
            if (node.isMesh) {
                node.material = node.material.clone();
                node.material.transparent = true;
                node.material.opacity = 0.3;
            }
        });
        scene.add(mirrorClone);
        reflectorGroup.add(mirrorClone);
    }

    return {
        group,
        reflection: isPerformer ? reflectorGroup.children[0] : null,
        parts: { pelvis, torso, headGroup, lArm, rArm, lLeg, rLeg },
        isPerformer,
        animOffset: Math.random() * Math.PI * 2,
        breathOffset: Math.random() * 10
    };
}

function initThreeJS() {
    if (renderer) return;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010102);
    scene.fog = new THREE.FogExp2(0x010102, 0.003);

    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 3000);
    camera.position.set(0, 30, 80);

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('concert-canvas'), antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.5;

    // REFLECTIVE GLOSSY FLOOR
    const floorGeo = new THREE.PlaneGeometry(2000, 2000);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x010101, roughness: 0.05, metalness: 1.0 });
    floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // KINETIC STAGE INFINITY
    const mainStage = new THREE.Group();
    const baseStage = new THREE.Mesh(new THREE.BoxGeometry(80, 4, 50), new THREE.MeshStandardMaterial({ color: 0x080808, metalness: 1, roughness: 0.1 }));
    baseStage.position.y = 2;
    mainStage.add(baseStage);
    scene.add(mainStage);
    stageParts.main = mainStage;

    // Laser LED Towers
    for (let i = 0; i < 4; i++) {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(2, 60, 2), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff00ff, emissiveIntensity: 2 }));
        tower.position.set((i - 1.5) * 50, 30, -30);
        scene.add(tower);
        stageParts[`tower${i}`] = tower;
    }

    // Ultra Visualizer Wall
    for (let i = 0; i < 256; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1, 0.3), new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1 }));
        bar.position.set((i - 128) * 0.4, -20, -50);
        scene.add(bar);
        cubeVisualizers.push(bar);
    }

    // Performers & Reflections
    const colors = [0xff0088, 0x00ff88, 0x00d4ff, 0xffaa00, 0xffffff, 0x9900ff, 0xff0000];
    colors.forEach(c => {
        const p = createAvatar(c, true);
        p.group.scale.set(2.5, 2.5, 2.5);
        scene.add(p.group);
        performers.push(p);
    });

    // Massive Stadium Crowd
    for (let i = 0; i < 300; i++) {
        const aud = createAvatar(new THREE.Color().setHSL(Math.random(), 0.6, 0.3), false);
        aud.group.position.set((Math.random() - 0.5) * 250, 0, 40 + Math.random() * 150);
        scene.add(aud.group);
        audience.push(aud);
    }

    scene.add(new THREE.AmbientLight(0xffffff, 0.1));
    for (let i = 0; i < 12; i++) {
        const spot = new THREE.SpotLight(0xffffff, 50);
        spot.position.set((i - 5.5) * 25, 100, -30);
        spot.angle = 0.25;
        spot.penumbra = 0.9;
        spot.target = baseStage;
        scene.add(spot);
        spotLights.push(spot);
    }

    animate();
}

function spawnParticle(type, pos, color) {
    const geo = type === 'confetti' ? new THREE.PlaneGeometry(0.4, 0.4) : new THREE.SphereGeometry(0.3);
    const mat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide, transparent: true });
    const p = new THREE.Mesh(geo, mat);
    p.position.copy(pos);
    p.userData = {
        vel: new THREE.Vector3((Math.random() - 0.5) * 0.8, type === 'fire' ? 1.2 : (Math.random() * 0.5 + 0.5), (Math.random() - 0.5) * 0.8),
        rotVel: new THREE.Vector3(Math.random() * 0.2, Math.random() * 0.2, Math.random() * 0.2),
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
    analyzer.fftSize = 2048;
    source.connect(analyzer);
    analyzer.connect(context.destination);
    dataArray = new Uint8Array(analyzer.frequencyBinCount);
    isAudioInitialized = true;
}

window.onConcertStart = (songUrl) => {
    const l = songUrl.toLowerCase();
    if (l.includes('pop') || l.includes('bts') || l.includes('fast') || l.includes('dance')) currentStyle = DANCE_STYLES.INFINITY;
    else if (l.includes('slow') || l.includes('ballad')) currentStyle = DANCE_STYLES.DREAM;
    else currentStyle = DANCE_STYLES.RHYTHM;

    const audio = new Audio(songUrl);
    audio.crossOrigin = "anonymous";
    audio.play().then(() => initAudioContext(audio));
};

window.onVFXTrigger = (type) => {
    if (type === 'fire') {
        for (let i = 0; i < 15; i++) spawnParticle('fire', new THREE.Vector3((Math.random() - 0.5) * 80, 5, -20), 0xff4400);
    } else if (type === 'confetti') {
        for (let i = 0; i < 50; i++) spawnParticle('confetti', new THREE.Vector3((Math.random() - 0.5) * 150, 50, (Math.random() - 0.5) * 100), new THREE.Color().setHSL(Math.random(), 1, 0.5));
    } else if (type === 'glitch') {
        isGlitchActive = true;
        glitchTimer = 120; // 2 seconds at 60fps
    }
};

function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;
    let energy = { b: 0, m: 0, h: 0, peak: false };

    if (glitchTimer > 0) {
        glitchTimer--;
        if (glitchTimer <= 0) isGlitchActive = false;
    }

    if (isAudioInitialized && analyzer) {
        analyzer.getByteFrequencyData(dataArray);
        for (let i = 0; i < 15; i++) energy.b += dataArray[i];
        for (let i = 15; i < 150; i++) energy.m += dataArray[i];
        for (let i = 150; i < 800; i++) energy.h += dataArray[i];
        energy.b /= 15; energy.m /= 135; energy.h /= 650;
        energy.peak = energy.b > 210;

        cubeVisualizers.forEach((bar, i) => {
            const v = dataArray[i * 4 % 1024];
            bar.scale.y = 1 + (v / 255) * 100;
            bar.position.y = (bar.scale.y / 2) - 20;
            bar.material.color.setHSL((time * 0.2 + i * 0.01) % 1, 0.8, 0.5);
            bar.material.emissiveIntensity = v / 255 * 8;
        });
    }

    const b = energy.b / 255, m = energy.m / 255, h = energy.h / 255;

    // 1. INFINITY KINETIC ELEMENTS
    stageParts.main.position.y = 4 + Math.sin(time * 0.4) * 5 * m;
    for (let i = 0; i < 4; i++) {
        stageParts[`tower${i}`].material.emissiveIntensity = 2 + b * 20;
        stageParts[`tower${i}`].scale.y = 1 + h * 0.5;
    }

    if (energy.peak) {
        // Grand Celebration: Fire & Confetti
        for (let i = 0; i < 3; i++) spawnParticle('fire', new THREE.Vector3((Math.random() - 0.5) * 80, 5, -20), 0xff4400);
        for (let i = 0; i < 10; i++) spawnParticle('confetti', new THREE.Vector3((Math.random() - 0.5) * 150, 40, (Math.random() - 0.5) * 100), new THREE.Color().setHSL(Math.random(), 1, 0.5));
    }

    // 2. ULTRA DANCE & REFLECTION ENGINE
    const sync = time * 6 * currentStyle.speed;
    performers.forEach((p, i) => {
        const { parts, group, reflection, animOffset, breathOffset } = p;
        const tar = currentFormation[i];
        group.position.x = THREE.MathUtils.lerp(group.position.x, tar.x, 0.05);
        group.position.z = THREE.MathUtils.lerp(group.position.z, tar.z, 0.05);

        // Advanced Vibe: Breathing & Idle Sway
        const breath = Math.sin(time * 2 + breathOffset) * 0.05;
        parts.torso.scale.set(1 + breath, 1 + breath, 1 + breath);

        // Pelvic Power & Weight
        const bounce = Math.abs(Math.sin(sync)) * currentStyle.bounce * b;
        parts.pelvis.position.y = 0.8 + bounce + (energy.peak ? 2.5 : 0);
        parts.torso.rotation.z = Math.sin(sync * 0.5) * 0.2 * b;

        // Pro IK-Limb Refinement
        const move = Math.sin(sync + i * 0.3) * currentStyle.amp;
        parts.lArm.root.rotation.z = -1.2 - move * b;
        parts.rArm.root.rotation.z = 1.2 + move * b;
        parts.lArm.mid.rotation.z = -Math.abs(move) * 2.0 * b;
        parts.rArm.mid.rotation.z = Math.abs(move) * 2.0 * b;

        // Grounding Physics
        parts.lLeg.root.rotation.x = Math.sin(sync) * 0.6 * b;
        parts.rLeg.root.rotation.x = -Math.sin(sync) * 0.6 * b;
        parts.lLeg.mid.rotation.x = Math.max(0, Math.sin(sync) * 1.2) * b;
        parts.rLeg.mid.rotation.x = Math.max(0, -Math.sin(sync) * 1.2) * b;

        parts.headGroup.rotation.y = Math.sin(sync * 2) * 0.4 * h;

        // Update Reflection Clone
        if (reflection) {
            reflection.position.copy(group.position);
            reflection.position.y = -group.position.y;
            reflection.rotation.copy(group.rotation);
            // Deep copy parts rotation to mirror
            // (Simplified: in a production app we'd mirror the whole group hierarchical state)
        }
    });

    // 3. INFINITY PARTICLE PHYSICS
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.add(p.userData.vel);
        if (p.userData.type === 'confetti') {
            p.userData.vel.y -= 0.01; // Gravity
            p.rotation.x += p.userData.rotVel.x;
            p.rotation.y += p.userData.rotVel.y;
        }
        p.userData.life -= 0.015;
        p.material.opacity = p.userData.life;
        if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); }
    }

    // 4. INFINITY DIRECTOR AI
    if (energy.peak && time % 1 < 0.02) {
        const mode = Math.random();
        if (mode < 0.3) camera.position.set(0, 5, 20); // Close-up
        else if (mode < 0.6) camera.position.set((Math.random() - 0.5) * 150, 40, 100); // Drone
        else camera.position.set(0, 150, 10); // God View
    }

    if (isGlitchActive) {
        camera.position.x += (Math.random() - 0.5) * 5;
        camera.position.y += (Math.random() - 0.5) * 5;
        scene.background = new THREE.Color(Math.random() * 0.1, 0, Math.random() * 0.1);
    } else {
        scene.background = new THREE.Color(0x010102);
    }

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, Math.sin(time * 0.15) * 100, 0.02);
    camera.lookAt(0, 10 + b * 20, 0);

    // 5. ULTRA LIGHTING
    spotLights.forEach((s, i) => {
        s.intensity = (energy.peak ? 150 : 30 + b * 80);
        s.color.setHSL((time * 0.05 + i * 0.08) % 1, 1.0, 0.5);
        s.position.x = Math.sin(time * 0.2 + i) * 100;
    });

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
