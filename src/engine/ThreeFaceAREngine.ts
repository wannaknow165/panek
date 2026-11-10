/**
 * Three.js 3D Face AR Engine (Snapchat & Banuba Quality)
 * High-fidelity 3D meshes, PBR metallic materials, volumetric lighting,
 * organic branching antlers, and real-time head pose tracking (yaw, pitch, roll).
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { TrackedFace } from './FaceBodyTracker';
import { HatAnchor, GlassesAnchor, Point3D } from './MediaPipeFaceTracker';

export type ThreeARMaskType = 'none' | 'forest' | 'cyber' | 'glasses' | 'crown' | 'kitsune' | 'kitty' | 'helmet' | 'dj_stage';

export class ThreeFaceAREngine {
  private width: number = 720;
  private height: number = 1280;
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  // Root anchor group attached to the tracked face
  private faceAnchor: THREE.Group;

  // Mask Groups
  private forestMaskGroup: THREE.Group;
  private cyberOniGroup: THREE.Group;
  private glassesGroup: THREE.Group;
  private crownGroup: THREE.Group;
  private kitsuneGroup: THREE.Group;
  private kittyGroup: THREE.Group;
  private helmetGroup: THREE.Group;
  private djStageGroup: THREE.Group;

  // DJ Stage & Music Visualizer Elements
  private vinylPlatter!: THREE.Mesh;
  private equalizerBars: THREE.Mesh[] = [];

  // Dynamic particle systems
  private forestParticles: THREE.Points;
  private crownSparkles: THREE.Points;

  // 3D Surprise & Jaw Drop Reaction VFX
  private surpriseGroup: THREE.Group;
  private shockwaveRing1!: THREE.Mesh;
  private shockwaveRing2!: THREE.Mesh;
  private surpriseSpikes!: THREE.Group;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Initialize WebGLRenderer with transparency and preserved drawing buffer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    this.scene = new THREE.Scene();

    // Studio PBR Environment Map via RoomEnvironment & PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Perspective camera setup: at distance D, visible height in 3D matches screen pixels
    const fov = 45;
    const distance = (this.height / 2) / Math.tan((fov * Math.PI) / 360);
    this.camera = new THREE.PerspectiveCamera(fov, this.width / this.height, 1, distance * 3);
    this.camera.position.set(0, 0, distance);
    this.camera.lookAt(0, 0, 0);

    // Studio Lighting Rig
    this.setupLighting();

    // Face Anchor
    this.faceAnchor = new THREE.Group();
    this.scene.add(this.faceAnchor);

    // Build Snapchat / Banuba Grade 3D Procedural Models
    this.forestMaskGroup = this.createForestBeastMask();
    this.cyberOniGroup = this.createCyberOniMask();
    this.glassesGroup = this.createCyberGlassesMask();
    this.crownGroup = this.createImperialCrownMask();
    this.kitsuneGroup = this.createKitsuneMask();
    this.kittyGroup = this.createKawaiiKittyMask();
    this.helmetGroup = this.createMechaHelmetMask();

    // 3D Cyber DJ Turntable Stage & Audio Reactive Visualizer (Lyria Music Companion)
    this.djStageGroup = this.createDJTurntableStage();

    // 3D Surprise VFX (expanding shockwave rings and radiant manga energy spikes)
    this.surpriseGroup = this.createSurpriseVFXGroup();

    // Forest Spores Particle System
    this.forestParticles = this.createForestParticles();
    this.forestMaskGroup.add(this.forestParticles);

    // Crown Sparkles
    this.crownSparkles = this.createCrownSparkles();
    this.crownGroup.add(this.crownSparkles);

    // Add all masks & surprise effects to anchor
    this.faceAnchor.add(
      this.forestMaskGroup,
      this.cyberOniGroup,
      this.glassesGroup,
      this.crownGroup,
      this.kitsuneGroup,
      this.kittyGroup,
      this.helmetGroup,
      this.djStageGroup,
      this.surpriseGroup
    );

    this.hideAllMasks();
  }

  private setupLighting() {
    // Warm / Cool Studio Contrast Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x112244, 0.85);
    this.scene.add(hemiLight);

    // Soft Key Ambient
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    // Key Directional Light (Warm Sun/Studio key)
    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.2);
    keyLight.position.set(250, 400, 500);
    this.scene.add(keyLight);

    // Fill Light (Cool Cyan rim)
    const fillLight = new THREE.DirectionalLight(0x00f2fe, 1.4);
    fillLight.position.set(-300, -100, 300);
    this.scene.add(fillLight);

    // Back Rim Light (Hot Magenta kick)
    const rimLight = new THREE.DirectionalLight(0xfe2c55, 1.2);
    rimLight.position.set(0, -400, -200);
    this.scene.add(rimLight);
  }

  /**
   * 1. Banuba Mystic Forest Beast / Stag Druid ("הוא ביער")
   * Massive branching organic 3D antlers with golden runes, glowing eyes, and moss/bark shaders
   */
  private createForestBeastMask(): THREE.Group {
    const group = new THREE.Group();

    // Wood & Bark Organic Material
    const barkMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d2817,
      roughness: 0.85,
      metalness: 0.1,
    });

    // Golden Rune Inlay Material
    const runeMaterial = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 1.8,
      roughness: 0.2,
      metalness: 0.8,
    });

    // Helper: Build a majestic branching 3D antler tine
    const createBranch = (side: 1 | -1): THREE.Group => {
      const antler = new THREE.Group();

      // Main curved beam
      const points: THREE.Vector3[] = [];
      const segs = 12;
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const x = side * (35 + t * 140 + Math.sin(t * Math.PI) * 40);
        const y = 80 + t * 240 - Math.pow(t, 2) * 50;
        const z = -20 + Math.sin(t * Math.PI * 0.8) * 60;
        points.push(new THREE.Vector3(x, y, z));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, 28, 14, 8, false);
      const mainBeam = new THREE.Mesh(tubeGeo, barkMaterial);
      antler.add(mainBeam);

      // 3 Secondary branching tines
      [0.35, 0.65, 0.85].forEach((tinePos, idx) => {
        const basePt = curve.getPoint(tinePos);
        const tinePts: THREE.Vector3[] = [
          basePt,
          new THREE.Vector3(
            basePt.x + side * (35 + idx * 25),
            basePt.y + 45 + idx * 20,
            basePt.z + 30 + (idx % 2 === 0 ? 25 : -25)
          ),
          new THREE.Vector3(
            basePt.x + side * (60 + idx * 30),
            basePt.y + 90 + idx * 25,
            basePt.z + 40
          ),
        ];
        const tineCurve = new THREE.CatmullRomCurve3(tinePts);
        const tineGeo = new THREE.TubeGeometry(tineCurve, 12, 8 - idx * 1.5, 6, false);
        const tineMesh = new THREE.Mesh(tineGeo, barkMaterial);
        antler.add(tineMesh);

        // Glowing Rune Ring on each tine
        const ringGeo = new THREE.TorusGeometry(9 - idx * 1.5, 2.5, 8, 16);
        const ringMesh = new THREE.Mesh(ringGeo, runeMaterial);
        ringMesh.position.copy(basePt);
        ringMesh.lookAt(tinePts[1]);
        antler.add(ringMesh);
      });

      return antler;
    };

    group.add(createBranch(1));
    group.add(createBranch(-1));

    // Carved Bone/Wood Mask Plate across forehead and brow
    const browGeo = new THREE.TorusGeometry(85, 18, 12, 24, Math.PI * 0.7);
    const browMesh = new THREE.Mesh(browGeo, barkMaterial);
    browMesh.rotation.z = Math.PI * 0.65;
    browMesh.position.set(0, 55, 30);
    group.add(browMesh);

    // Glowing Emerald Spirit Eyes
    const eyeGeo = new THREE.SphereGeometry(14, 16, 16);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 2.5,
      roughness: 0.1,
    });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-45, 25, 40);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(45, 25, 40);
    group.add(leftEye, rightEye);

    // Mystical Forehead Rune Jewel
    const jewelGeo = new THREE.OctahedronGeometry(18, 0);
    const jewelMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 2.0,
      metalness: 0.6,
      roughness: 0.1,
    });
    const jewel = new THREE.Mesh(jewelGeo, jewelMat);
    jewel.position.set(0, 75, 45);
    jewel.scale.set(0.8, 1.4, 0.8);
    group.add(jewel);

    return group;
  }

  /**
   * 2. Banuba Cyber Oni Demon 3D Mask
   * Metallic chrome horns, cyber-jaw with fangs, glowing neon intakes
   */
  private createCyberOniMask(): THREE.Group {
    const group = new THREE.Group();

    // Chrome Metal Material
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0x1a202c,
      metalness: 0.95,
      roughness: 0.15,
    });

    // Neon Crimson Glow
    const neonCrimson = new THREE.MeshStandardMaterial({
      color: 0xfe2c55,
      emissive: 0xfe2c55,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });

    // Swept-Back Metallic Horns (Left & Right)
    const createHorn = (side: 1 | -1): THREE.Mesh => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        pts.push(new THREE.Vector3(
          side * (55 + t * 75),
          70 + t * 140,
          -10 - Math.pow(t, 2) * 80
        ));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(curve, 16, 16 * (1 - 0.7 * (pts.length ? 0 : 0)), 8, false);
      return new THREE.Mesh(geo, chromeMat);
    };
    group.add(createHorn(1));
    group.add(createHorn(-1));

    // Lower Cyber Rebreather Jaw Plate
    const jawGeo = new THREE.CylinderGeometry(60, 45, 90, 16, 1, false, -Math.PI * 0.5, Math.PI);
    const jawMesh = new THREE.Mesh(jawGeo, chromeMat);
    jawMesh.rotation.x = Math.PI * 0.15;
    jawMesh.position.set(0, -75, 45);
    group.add(jawMesh);

    // Glowing Neon Vents
    [-30, -10, 10, 30].forEach((vx) => {
      const ventGeo = new THREE.BoxGeometry(7, 35, 12);
      const ventMesh = new THREE.Mesh(ventGeo, neonCrimson);
      ventMesh.position.set(vx, -75, 75);
      ventMesh.rotation.z = vx * 0.01;
      group.add(ventMesh);
    });

    // Cyber Fangs (Left & Right)
    const fangGeo = new THREE.ConeGeometry(8, 25, 8);
    fangGeo.rotateX(Math.PI);
    const leftFang = new THREE.Mesh(fangGeo, chromeMat);
    leftFang.position.set(-35, -55, 75);
    const rightFang = new THREE.Mesh(fangGeo, chromeMat);
    rightFang.position.set(35, -55, 75);
    group.add(leftFang, rightFang);

    return group;
  }

  /**
   * 3. Snapchat Holo-Visor / Holographic HUD 3D Glasses
   */
  private createCyberGlassesMask(): THREE.Group {
    const group = new THREE.Group();

    // Curved Visor Glass (Transparent Cyan Shimmer)
    const visorGeo = new THREE.CylinderGeometry(85, 85, 45, 32, 1, true, -Math.PI * 0.45, Math.PI * 0.9);
    const visorMat = new THREE.MeshPhysicalMaterial({
      color: 0x00f2fe,
      emissive: 0x0088cc,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.75,
      roughness: 0.1,
      metalness: 0.3,
      transmission: 0.7,
      ior: 1.5,
    });
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.rotation.y = Math.PI * 0.5;
    visorMesh.position.set(0, -28, 40);
    group.add(visorMesh);

    // Top Frame Bar (Titanium)
    const frameGeo = new THREE.TorusGeometry(86, 4, 8, 32, Math.PI * 0.9);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.9,
      roughness: 0.2,
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.rotation.x = Math.PI * 0.5;
    frameMesh.rotation.z = Math.PI * 0.05;
    frameMesh.position.set(0, -8, 40);
    group.add(frameMesh);

    // Dual HUD Scanning Rings on each eye
    const ringGeo = new THREE.RingGeometry(18, 22, 24);
    const hudMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const leftRing = new THREE.Mesh(ringGeo, hudMat);
    leftRing.position.set(-45, -28, 62);
    const rightRing = new THREE.Mesh(ringGeo, hudMat);
    rightRing.position.set(45, -28, 62);
    group.add(leftRing, rightRing);

    return group;
  }

  /**
   * 4. Snapchat 3D Imperial Royal Gold Crown with Faceted Jewels
   */
  private createImperialCrownMask(): THREE.Group {
    const group = new THREE.Group();

    // Pure 24K Gold Material
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xb45309,
      emissiveIntensity: 0.35,
      metalness: 0.95,
      roughness: 0.15,
    });

    // Crown Base Ring
    const baseGeo = new THREE.CylinderGeometry(85, 80, 32, 32);
    const baseMesh = new THREE.Mesh(baseGeo, goldMat);
    baseMesh.position.set(0, 110, 10);
    group.add(baseMesh);

    // 8 Ornate Crown Points
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * 83;
      const z = Math.sin(angle) * 83 + 10;
      const height = i % 2 === 0 ? 55 : 35;

      const pointGeo = new THREE.ConeGeometry(15, height, 8);
      const pointMesh = new THREE.Mesh(pointGeo, goldMat);
      pointMesh.position.set(x, 126 + height / 2, z);
      group.add(pointMesh);

      // Gemstone on each point
      const gemGeo = new THREE.OctahedronGeometry(6, 0);
      const gemColor = i % 2 === 0 ? 0xfe2c55 : (i % 4 === 1 ? 0x00f2fe : 0x10b981);
      const gemMat = new THREE.MeshStandardMaterial({
        color: gemColor,
        emissive: gemColor,
        emissiveIntensity: 1.5,
        roughness: 0.1,
        metalness: 0.5,
      });
      const gem = new THREE.Mesh(gemGeo, gemMat);
      gem.position.set(x, 130 + height, z);
      group.add(gem);
    }

    // Majestic Front Cross/Emblem
    const emblemGeo = new THREE.DodecahedronGeometry(14, 0);
    const emblemMat = new THREE.MeshStandardMaterial({
      color: 0xfe2c55,
      emissive: 0xfe2c55,
      emissiveIntensity: 1.8,
      metalness: 0.4,
      roughness: 0.1,
    });
    const emblem = new THREE.Mesh(emblemGeo, emblemMat);
    emblem.position.set(0, 110, 95);
    group.add(emblem);

    return group;
  }

  /**
   * 5. Japanese Kitsune Spirit Fox 3D Mask
   */
  private createKitsuneMask(): THREE.Group {
    const group = new THREE.Group();

    // White Porcelain Ceramic Material
    const porcelainMat = new THREE.MeshStandardMaterial({
      color: 0xfafafa,
      roughness: 0.15,
      metalness: 0.1,
    });

    // Crimson Shinto Lacquer
    const redLacquer = new THREE.MeshStandardMaterial({
      color: 0xfe2c55,
      roughness: 0.2,
      metalness: 0.3,
    });

    // Fox Face Shell
    const shellGeo = new THREE.SphereGeometry(95, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const shellMesh = new THREE.Mesh(shellGeo, porcelainMat);
    shellMesh.scale.set(0.9, 1.2, 0.6);
    shellMesh.position.set(0, 0, 15);
    group.add(shellMesh);

    // Fox Ears (Left & Right)
    const createFoxEar = (side: 1 | -1): THREE.Mesh => {
      const earGeo = new THREE.ConeGeometry(28, 75, 4);
      earGeo.rotateY(Math.PI * 0.25);
      const earMesh = new THREE.Mesh(earGeo, porcelainMat);
      earMesh.position.set(side * 60, 105, 10);
      earMesh.rotation.z = side * -0.25;
      earMesh.rotation.x = -0.15;
      return earMesh;
    };
    group.add(createFoxEar(1));
    group.add(createFoxEar(-1));

    // Red Fox Eye Markings
    [-45, 45].forEach((ex) => {
      const markGeo = new THREE.TorusGeometry(20, 3, 8, 16, Math.PI * 0.8);
      const markMesh = new THREE.Mesh(markGeo, redLacquer);
      markMesh.position.set(ex, -28, 65);
      markMesh.rotation.z = ex > 0 ? 0.3 : -0.3;
      group.add(markMesh);
    });

    return group;
  }

  /**
   * 6. Kawaii 3D TikTok Neon Cat Ears
   */
  private createKawaiiKittyMask(): THREE.Group {
    const group = new THREE.Group();

    const pinkMat = new THREE.MeshStandardMaterial({
      color: 0xff70a6,
      emissive: 0xff007f,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });

    const innerMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
    });

    [-1, 1].forEach((dir) => {
      const earGeo = new THREE.ConeGeometry(32, 70, 3);
      const earMesh = new THREE.Mesh(earGeo, pinkMat);
      earMesh.position.set(dir * 65, 110, 15);
      earMesh.rotation.z = dir * -0.3;
      earMesh.rotation.y = dir * 0.15;

      const innerEarGeo = new THREE.ConeGeometry(20, 50, 3);
      const innerMesh = new THREE.Mesh(innerEarGeo, innerMat);
      innerMesh.position.set(dir * 65, 108, 22);
      innerMesh.rotation.z = dir * -0.3;
      group.add(earMesh, innerMesh);
    });

    return group;
  }

  /**
   * 7. Banuba Sci-Fi Mecha Visor Helmet 3D
   */
  private createMechaHelmetMask(): THREE.Group {
    const group = new THREE.Group();

    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x242b35,
      metalness: 0.9,
      roughness: 0.2,
    });

    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      emissive: 0x00a8e8,
      emissiveIntensity: 1.5,
      metalness: 0.5,
      roughness: 0.1,
    });

    // Helmet Dome
    const domeGeo = new THREE.SphereGeometry(110, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const domeMesh = new THREE.Mesh(domeGeo, armorMat);
    domeMesh.position.set(0, 35, 0);
    group.add(domeMesh);

    // Glowing Horizontal Visor Band
    const visorGeo = new THREE.CylinderGeometry(105, 105, 30, 24, 1, false, -Math.PI * 0.4, Math.PI * 0.8);
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.rotation.y = Math.PI * 0.5;
    visorMesh.position.set(0, -15, 25);
    group.add(visorMesh);

    return group;
  }

  /**
   * Forest Spores Floating Magic Particles
   */
  private createForestParticles(): THREE.Points {
    const count = 45;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 320;
      positions[i * 3 + 1] = Math.random() * 350;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200 + 40;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x34d399,
      size: 14,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    return new THREE.Points(geometry, material);
  }

  /**
   * Royal Crown Sparkles
   */
  private createCrownSparkles(): THREE.Points {
    const count = 30;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 95 + Math.random() * 30;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = 120 + (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = Math.sin(angle) * r + 10;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffea00,
      size: 10,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    return new THREE.Points(geometry, material);
  }

  public hideAllMasks() {
    this.forestMaskGroup.visible = false;
    this.cyberOniGroup.visible = false;
    this.glassesGroup.visible = false;
    this.crownGroup.visible = false;
    this.kitsuneGroup.visible = false;
    this.kittyGroup.visible = false;
    this.helmetGroup.visible = false;
    if (this.djStageGroup) this.djStageGroup.visible = false;
  }

  /**
   * 8. 3D Cyber DJ Turntable Stage & Audio Reactive Visualizer (Lyria Music Companion)
   * 10 composite procedural parts:
   * 1. Console plinth / base chassis
   * 2. Chrome platter rim
   * 3. Micro-grooved vinyl record
   * 4. Center TikTok LIVE neon record label
   * 5. Center spindle pin
   * 6. Curved tonearm with stylus
   * 7. Pitch fader control slider
   * 8. 10 Audio-Reactive LED equalizer bars
   * 9. LED status indicator lights
   * 10. Neon underglow shadow disc
   */
  private createDJTurntableStage(): THREE.Group {
    const stage = new THREE.Group();
    // Position below chin at chest level
    stage.position.set(0, -180, 40);
    stage.rotation.x = 0.45; // Tilted slightly towards camera for optimal 3D perspective

    // 1. Console Plinth / Base Chassis (Brushed Titanium)
    const baseGeo = new THREE.BoxGeometry(220, 18, 160);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x141824,
      metalness: 0.85,
      roughness: 0.25,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    stage.add(baseMesh);

    // Chassis Neon Trim Rim
    const rimGeo = new THREE.BoxGeometry(224, 2, 164);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      emissive: 0x00f2fe,
      emissiveIntensity: 1.2,
      roughness: 0.1,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.y = 9;
    stage.add(rimMesh);

    // 2. Turntable Platter Rim (Chrome)
    const platterRimGeo = new THREE.CylinderGeometry(56, 56, 6, 48);
    const platterRimMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.98,
      roughness: 0.08,
    });
    const platterRimMesh = new THREE.Mesh(platterRimGeo, platterRimMat);
    platterRimMesh.position.set(-35, 12, 0);
    stage.add(platterRimMesh);

    // 3. Micro-grooved Vinyl Record (rotates)
    const vinylGroup = new THREE.Group();
    vinylGroup.position.set(-35, 15, 0);

    const vinylGeo = new THREE.CylinderGeometry(52, 52, 2, 48);
    const vinylMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.25,
      roughness: 0.4,
    });
    const vinylDisc = new THREE.Mesh(vinylGeo, vinylMat);
    vinylGroup.add(vinylDisc);

    // 4. Center Record Label (Procedural Neon Decal)
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 128;
    labelCanvas.height = 128;
    const lCtx = labelCanvas.getContext('2d');
    if (lCtx) {
      const grad = lCtx.createRadialGradient(64, 64, 5, 64, 64, 60);
      grad.addColorStop(0, '#fe2c55');
      grad.addColorStop(0.7, '#25f4ee');
      grad.addColorStop(1, '#05070a');
      lCtx.fillStyle = grad;
      lCtx.beginPath();
      lCtx.arc(64, 64, 60, 0, Math.PI * 2);
      lCtx.fill();
      lCtx.fillStyle = '#ffffff';
      lCtx.font = 'bold 18px sans-serif';
      lCtx.textAlign = 'center';
      lCtx.fillText('LYRIA', 64, 60);
      lCtx.font = 'bold 12px sans-serif';
      lCtx.fillText('AI 3D', 64, 76);
    }
    const labelTex = new THREE.CanvasTexture(labelCanvas);
    labelTex.colorSpace = THREE.SRGBColorSpace;
    const labelGeo = new THREE.CylinderGeometry(18, 18, 2.2, 32);
    const labelMat = new THREE.MeshBasicMaterial({ map: labelTex });
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    vinylGroup.add(labelMesh);

    // 5. Spindle Pin (Chrome)
    const spindleGeo = new THREE.CylinderGeometry(2, 2, 7, 16);
    const spindleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.95,
      roughness: 0.05,
    });
    const spindle = new THREE.Mesh(spindleGeo, spindleMat);
    spindle.position.y = 3;
    vinylGroup.add(spindle);

    this.vinylPlatter = vinylDisc;
    stage.add(vinylGroup);

    // 6. Tonearm Pivot & Curved Arm with Stylus
    const armPivotGeo = new THREE.CylinderGeometry(6, 7, 12, 16);
    const armPivotMat = new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.9, roughness: 0.2 });
    const armPivot = new THREE.Mesh(armPivotGeo, armPivotMat);
    armPivot.position.set(30, 16, -40);
    stage.add(armPivot);

    const armPoints = [
      new THREE.Vector3(30, 20, -40),
      new THREE.Vector3(25, 20, -10),
      new THREE.Vector3(10, 18, 10),
      new THREE.Vector3(-5, 16, 20),
    ];
    const armCurve = new THREE.CatmullRomCurve3(armPoints);
    const armGeo = new THREE.TubeGeometry(armCurve, 16, 1.5, 8, false);
    const armMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.95, roughness: 0.1 });
    const tonearm = new THREE.Mesh(armGeo, armMat);
    stage.add(tonearm);

    // Stylus Cartridge
    const stylusGeo = new THREE.BoxGeometry(6, 4, 10);
    const stylusMat = new THREE.MeshStandardMaterial({ color: 0xfe2c55, roughness: 0.3 });
    const stylus = new THREE.Mesh(stylusGeo, stylusMat);
    stylus.position.set(-6, 16, 22);
    stage.add(stylus);

    // 7. Pitch Fader Track & Knob
    const trackGeo = new THREE.BoxGeometry(6, 1, 60);
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.8 });
    const track = new THREE.Mesh(trackGeo, trackMat);
    track.position.set(80, 10, 10);
    stage.add(track);

    const faderKnobGeo = new THREE.BoxGeometry(10, 6, 8);
    const faderKnobMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8, roughness: 0.2 });
    const faderKnob = new THREE.Mesh(faderKnobGeo, faderKnobMat);
    faderKnob.position.set(80, 13, 0);
    stage.add(faderKnob);

    // 8. 10 Audio-Reactive Equalizer LED Bars
    this.equalizerBars = [];
    const numBars = 10;
    const barWidth = 4;
    const barSpacing = 6.5;
    const startX = 35;
    const startZ = -20;

    for (let i = 0; i < numBars; i++) {
      const barGeo = new THREE.BoxGeometry(barWidth, 1, 3);
      const hue = 0.5 + (i / numBars) * 0.45;
      const barColor = new THREE.Color().setHSL(hue, 1.0, 0.55);
      const barMat = new THREE.MeshStandardMaterial({
        color: barColor,
        emissive: barColor,
        emissiveIntensity: 1.8,
        roughness: 0.2,
      });
      const barMesh = new THREE.Mesh(barGeo, barMat);
      barMesh.position.set(startX + (i * barSpacing) - (numBars * barSpacing) / 4, 11, startZ);
      this.equalizerBars.push(barMesh);
      stage.add(barMesh);
    }

    // 9. Soft Contact Shadow Plane Underneath
    const shadowGeo = new THREE.PlaneGeometry(240, 180);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
      grad.addColorStop(0, 'rgba(0, 242, 254, 0.35)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.6)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 128, 128);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -10;
    stage.add(shadowMesh);

    stage.visible = false;
    return stage;
  }

  /**
   * 3D Jaw Drop / Surprise VFX (Expanding Holographic Shockwave & Manga Action Cones)
   */
  private createSurpriseVFXGroup(): THREE.Group {
    const group = new THREE.Group();
    // Positioned at mouth level relative to face center
    group.position.set(0, -65, 25);

    // Shockwave Ring 1 (Electric Cyan Torus)
    const ring1Geo = new THREE.TorusGeometry(32, 4.5, 16, 64);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      wireframe: true,
      transparent: true,
      opacity: 0,
    });
    this.shockwaveRing1 = new THREE.Mesh(ring1Geo, ring1Mat);
    group.add(this.shockwaveRing1);

    // Shockwave Ring 2 (Golden Radiant Torus)
    const ring2Geo = new THREE.TorusGeometry(48, 3.2, 16, 64);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0,
    });
    this.shockwaveRing2 = new THREE.Mesh(ring2Geo, ring2Mat);
    group.add(this.shockwaveRing2);

    // Radiant Manga Action Cones / Spikes
    this.surpriseSpikes = new THREE.Group();
    const spikeGeo = new THREE.ConeGeometry(7, 48, 6);
    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0xffea00,
      emissive: 0xff9900,
      emissiveIntensity: 1.8,
      roughness: 0.2,
      metalness: 0.8,
    });

    const numSpikes = 8;
    for (let i = 0; i < numSpikes; i++) {
      const angle = (i / numSpikes) * Math.PI * 2;
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.position.set(Math.cos(angle) * 75, Math.sin(angle) * 75, 5);
      spike.rotation.z = angle - Math.PI / 2;
      this.surpriseSpikes.add(spike);
    }
    group.add(this.surpriseSpikes);

    group.visible = false;
    return group;
  }

  /**
   * Updates head orientation and renders 3D AR Scene with landmark-based anchoring
   * and dynamic facial gesture reactions (surprise jaw drop shockwaves).
   */
  public updateAndRender(
    face: TrackedFace,
    activeMask: ThreeARMaskType,
    time: number,
    hatAnchor?: HatAnchor,
    glassesAnchor?: GlassesAnchor,
    landmarks?: Point3D[],
    surpriseIntensity: number = 0,
    audioLevel: number = 0,
    isMusicPlaying: boolean = false
  ): HTMLCanvasElement {
    // Hide all masks first
    this.hideAllMasks();

    const isSurpriseActive = surpriseIntensity > 0.02;

    if (activeMask === 'none' && !isSurpriseActive) {
      this.renderer.clear();
      return this.canvas;
    }

    // Activate selected 3D model
    if (activeMask === 'forest') this.forestMaskGroup.visible = true;
    else if (activeMask === 'cyber') this.cyberOniGroup.visible = true;
    else if (activeMask === 'glasses') this.glassesGroup.visible = true;
    else if (activeMask === 'crown') this.crownGroup.visible = true;
    else if (activeMask === 'kitsune') this.kitsuneGroup.visible = true;
    else if (activeMask === 'kitty') this.kittyGroup.visible = true;
    else if (activeMask === 'helmet') this.helmetGroup.visible = true;
    else if (activeMask === 'dj_stage') this.djStageGroup.visible = true;

    // Landmark-based placement for accessories
    let targetX = face.x - this.width / 2;
    let targetY = -(face.y - this.height / 2);
    let targetZ = 0;
    let roll = face.roll;
    let yaw = face.yaw || 0;
    let pitch = face.pitch || 0;
    let scale = (face.width / 220) * 1.05;

    // Perfect 3D Landmark Anchoring for Glasses (bridge of nose & eye line)
    if (activeMask === 'glasses' && glassesAnchor) {
      targetX = glassesAnchor.x - this.width / 2;
      targetY = -(glassesAnchor.y - this.height / 2);
      targetZ = glassesAnchor.z || 0;
      roll = glassesAnchor.roll;
      yaw = glassesAnchor.yaw;
      scale = (glassesAnchor.width / 110) * 1.02;
    }
    // Perfect 3D Landmark Anchoring for Hats & Crowns & Forest Antlers (top of forehead/hairline)
    else if ((activeMask === 'crown' || activeMask === 'forest') && hatAnchor) {
      targetX = hatAnchor.x - this.width / 2;
      targetY = -(hatAnchor.y - this.height / 2);
      targetZ = hatAnchor.z || 0;
      roll = hatAnchor.roll;
      yaw = hatAnchor.yaw;
      scale = (hatAnchor.headWidth / 220) * 1.05;
    }

    this.faceAnchor.position.set(targetX, targetY, targetZ);
    this.faceAnchor.rotation.z = -roll;
    this.faceAnchor.rotation.y = yaw;
    this.faceAnchor.rotation.x = pitch;
    this.faceAnchor.scale.set(scale, scale, scale);

    // 3D Surprise Reaction Animation (Jaw Drop Shockwave & Spikes)
    if (this.surpriseGroup) {
      if (isSurpriseActive) {
        this.surpriseGroup.visible = true;
        const progress = 1.0 - surpriseIntensity; // 0 to 1
        const s1 = 1.0 + progress * 2.8;
        const s2 = 1.2 + progress * 3.6;
        this.shockwaveRing1.scale.set(s1, s1, s1);
        this.shockwaveRing2.scale.set(s2, s2, s2);

        (this.shockwaveRing1.material as THREE.MeshBasicMaterial).opacity = Math.max(0, surpriseIntensity * 0.95);
        (this.shockwaveRing2.material as THREE.MeshBasicMaterial).opacity = Math.max(0, surpriseIntensity * 0.85);

        this.surpriseSpikes.rotation.z = time * 4.5;
        const spikeScale = 0.6 + surpriseIntensity * 0.8;
        this.surpriseSpikes.scale.set(spikeScale, spikeScale, spikeScale);
      } else {
        this.surpriseGroup.visible = false;
      }
    }

    // Animate Forest Particles
    if (this.forestMaskGroup.visible && this.forestParticles) {
      const posAttr = this.forestParticles.geometry.attributes.position;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < arr.length / 3; i++) {
        arr[i * 3 + 1] += 1.2;
        arr[i * 3] += Math.sin(time * 3 + i) * 0.8;
        if (arr[i * 3 + 1] > 380) {
          arr[i * 3 + 1] = 40;
        }
      }
      posAttr.needsUpdate = true;
    }

    // Animate Crown Sparkles (orbit)
    if (this.crownGroup.visible && this.crownSparkles) {
      this.crownSparkles.rotation.y = time * 1.2;
    }

    // Animate DJ Turntable Stage & Audio-Reactive Equalizer
    if (this.djStageGroup && this.djStageGroup.visible) {
      if (this.vinylPlatter) {
        this.vinylPlatter.rotation.y += isMusicPlaying ? 0.09 : 0.02;
      }
      if (this.equalizerBars && this.equalizerBars.length > 0) {
        const energy = Math.max(0.05, audioLevel + (isMusicPlaying ? 0.45 : 0.08));
        this.equalizerBars.forEach((bar, idx) => {
          const freqOffset = Math.sin(time * 12 + idx * 0.85);
          const barHeight = Math.max(2, energy * 36 * (0.65 + 0.35 * freqOffset));
          bar.scale.y = barHeight;
          bar.position.y = 11 + barHeight / 2;
        });
      }
    }

    // Render WebGL
    this.renderer.render(this.scene, this.camera);
    return this.canvas;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public dispose() {
    this.renderer.dispose();
  }
}
