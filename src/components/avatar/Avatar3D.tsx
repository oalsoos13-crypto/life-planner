"use client";
import { useEffect, useRef, useState } from "react";
import type { MouthDriver } from "./speech";

/**
 * وجه المستشار ثلاثي الأبعاد (Three.js، بيتحمّل بس بهالشاشة).
 * - إذا في موديل خاص (GLB من صورك، بتخزين خاص عبر /api/avatar): بنحرّك blendshapes الفم والرمش (ARKit/Oculus visemes).
 * - إذا ما في: شخصية «فلكية» مرسومة بالكود: راس زجاجي بحافة ضو، عيون بترمش، فم بيحكي، وحلقة نجوم.
 * بيوقف الرسم لما ما يكون ظاهر، وبيحترم «تقليل الحركة».
 */
export function Avatar3D({ driver, modelUrl, className }: { driver: MouthDriver; modelUrl?: string; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      if (disposed) return;
      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      } catch {
        setFailed(true);
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      el.appendChild(renderer.domElement);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
      camera.position.set(0, 0.15, 5.2);

      scene.add(new THREE.AmbientLight(0x8f86ff, 0.55));
      const key = new THREE.DirectionalLight(0xffffff, 1.6);
      key.position.set(-2, 2.5, 3);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x9fdcff, 2.2);
      rim.position.set(2.5, 1, -2.5);
      scene.add(rim);

      const rig = new THREE.Group();
      scene.add(rig);

      // ── حلقة نجوم حول الراس ──
      const starGeo = new THREE.BufferGeometry();
      const N = 260, pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const a = Math.random() * Math.PI * 2, r = 1.55 + (Math.random() - 0.5) * 0.35;
        pos.set([Math.cos(a) * r, (Math.random() - 0.5) * 0.08, Math.sin(a) * r], i * 3);
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const ring = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 0.028, transparent: true, opacity: 0.9, depthWrite: false }));
      ring.rotation.x = 0.32;
      ring.rotation.z = -0.18;
      rig.add(ring);

      // ── الشخصية الافتراضية ──
      let setMouth: (v: number) => void = () => {};
      let setBlink: (v: number) => void = () => {};
      const head = new THREE.Group();
      rig.add(head);

      const buildDefault = () => {
        const glass = new THREE.MeshPhysicalMaterial({ color: 0x2a2470, roughness: 0.18, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 1, sheenColor: new THREE.Color(0x9fdcff), sheenRoughness: 0.35, emissive: 0x1a1250, emissiveIntensity: 0.6 });
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.82, 64, 48), glass);
        skull.scale.set(0.9, 1.08, 0.92);
        head.add(skull);
        // حافة ضو (fresnel) كقشرة أكبر بشوي من ورا
        const halo = new THREE.Mesh(
          new THREE.SphereGeometry(0.86, 48, 32),
          new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
            uniforms: { c: { value: new THREE.Color(0x9f8bff) } },
            vertexShader: "varying vec3 n; varying vec3 v; void main(){ n=normalize(normalMatrix*normal); vec4 p=modelViewMatrix*vec4(position,1.); v=normalize(-p.xyz); gl_Position=projectionMatrix*p; }",
            fragmentShader: "uniform vec3 c; varying vec3 n; varying vec3 v; void main(){ float f=pow(1.-abs(dot(n,v)),2.4); gl_FragColor=vec4(c,f*0.9); }",
          }),
        );
        halo.scale.set(0.95, 1.12, 0.97);
        head.add(halo);

        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe9f6ff });
        const eyes = [-0.27, 0.27].map((x) => {
          const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.07, 6, 16), eyeMat);
          e.position.set(x, 0.12, 0.72);
          e.rotation.z = Math.PI / 2;
          head.add(e);
          const glow = new THREE.PointLight(0x9fdcff, 0.4, 0.8);
          glow.position.copy(e.position).add(new THREE.Vector3(0, 0, 0.1));
          head.add(glow);
          return e;
        });
        setBlink = (b) => eyes.forEach((e) => (e.scale.x = 1 - b * 0.9));

        const mouth = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.2, 6, 16), new THREE.MeshBasicMaterial({ color: 0xc9b8ff }));
        mouth.rotation.z = Math.PI / 2;
        mouth.position.set(0, -0.3, 0.72);
        head.add(mouth);
        // الكبسولة مدوّرة 90°: محورها المحلي x هو العمودي (فتحة الفم)، وy هو العرض
        setMouth = (m) => mouth.scale.set(1 + m * 2.6, 1 - m * 0.25, 1);

        // كتاف وجسم ناعم تحت
        const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), glass);
        torso.scale.set(1.25, 0.75, 0.7);
        torso.position.y = -1.75;
        rig.add(torso);
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.5, 32), glass);
        neck.position.y = -0.95;
        rig.add(neck);
      };

      // ── موديلك الخاص (إذا موجود) ──
      if (modelUrl) {
        try {
          const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
          const gltf = await new GLTFLoader().loadAsync(modelUrl);
          if (disposed) return;
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const s = 2.4 / Math.max(size.y, 0.001);
          model.scale.setScalar(s);
          model.position.sub(center.multiplyScalar(s));
          head.add(model);
          const morphs: { m: import("three").Mesh; jaw: number[]; blink: number[] }[] = [];
          model.traverse((o) => {
            const m = o as import("three").Mesh;
            const dict = m.morphTargetDictionary;
            if (!dict || !m.morphTargetInfluences) return;
            const pick = (names: string[]) => names.map((n) => dict[n]).filter((i): i is number => i != null);
            morphs.push({ m, jaw: pick(["jawOpen", "viseme_aa", "mouthOpen", "viseme_O"]), blink: pick(["eyeBlinkLeft", "eyeBlinkRight", "eyesClosed"]) });
          });
          setMouth = (v) => morphs.forEach(({ m, jaw }) => jaw.forEach((i, k) => (m.morphTargetInfluences![i] = k === 0 ? v : v * 0.4)));
          setBlink = (v) => morphs.forEach(({ m, blink }) => blink.forEach((i) => (m.morphTargetInfluences![i] = v)));
        } catch {
          buildDefault();
        }
      } else buildDefault();

      // ── الحجم والرسم ──
      const resize = () => {
        const w = el.clientWidth, h = el.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(el);

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let visible = true;
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
      io.observe(el);
      const look = { x: 0, y: 0 };
      const onMove = (e: PointerEvent) => { look.x = (e.clientX / window.innerWidth - 0.5) * 2; look.y = (e.clientY / window.innerHeight - 0.5) * 2; };
      window.addEventListener("pointermove", onMove, { passive: true });

      let raf = 0, nextBlink = 2, blinkT = -1;
      const clock = new THREE.Clock();
      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (!visible) return;
        const t = clock.getElapsedTime();
        const m = driver.mouth;
        setMouth(m);
        // رمش طبيعي كل 2-5 ثواني
        if (t > nextBlink && blinkT < 0) blinkT = t;
        if (blinkT >= 0) {
          const k = (t - blinkT) / 0.16;
          setBlink(k < 1 ? Math.sin(k * Math.PI) : 0);
          if (k >= 1) { blinkT = -1; nextBlink = t + 2 + Math.random() * 3; }
        }
        if (!reduce) {
          ring.rotation.y = t * (driver.speaking ? 0.35 : 0.12);
          rig.position.y = Math.sin(t * 1.1) * 0.05;
          head.rotation.y += ((look.x * 0.25 + (driver.speaking ? Math.sin(t * 1.7) * 0.06 : 0)) - head.rotation.y) * 0.06;
          head.rotation.x += ((look.y * 0.12 + (driver.listening ? -0.08 : 0) + m * 0.04) - head.rotation.x) * 0.06;
        }
        (ring.material as import("three").PointsMaterial).opacity = driver.listening ? 0.6 + Math.sin(t * 6) * 0.3 : 0.9;
        renderer.render(scene, camera);
      };
      loop();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        window.removeEventListener("pointermove", onMove);
        scene.traverse((o) => {
          const m = o as import("three").Mesh;
          m.geometry?.dispose();
          const mat = m.material as import("three").Material | import("three").Material[] | undefined;
          (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => { disposed = true; cleanup(); };
  }, [driver, modelUrl]);

  return (
    <div ref={host} className={className} aria-hidden>
      {failed && <div className="orb mx-auto mt-10 h-28 w-28 rounded-full" />}
    </div>
  );
}
