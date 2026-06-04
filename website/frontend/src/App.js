import { useState, useEffect, useRef } from "react";
import * as THREE from "three";

const SYMBOLS = [
  "BTC","ETH","BNB","SOL","XRP","ADA","DOGE","AVAX","DOT","LINK",
  "MATIC","UNI","ATOM","LTC","BCH","NEAR","APT","ARB","OP","INJ"
];

const BASE_PRICES = {
  BTC:67000,ETH:3500,BNB:580,SOL:140,XRP:0.52,ADA:0.45,DOGE:0.12,
  AVAX:35,DOT:7,LINK:18,MATIC:0.8,UNI:10,ATOM:9,LTC:85,BCH:450,
  NEAR:6,APT:8,ARB:1.1,OP:2.1,INJ:25
};

function getThreatLevel(mag) {
  if (mag >= 7) return { label: "CRITICAL", color: "#ff2020", blink: true };
  if (mag >= 5) return { label: "HIGH", color: "#ff6a00" };
  if (mag >= 3) return { label: "MODERATE", color: "#ffcc00" };
  return { label: "LOW", color: "#00ff88" };
}

function SeismicWaveform({ earthquakes }) {
  const canvasRef = useRef(null);
  const dataRef = useRef(Array.from({ length: 300 }, () => 0));
  const impactRef = useRef(0);

  useEffect(() => {
    if (earthquakes.length > 0) {
      impactRef.current = Math.min(40, (earthquakes[0].magnitude || 1) * 6);
    }
  }, [earthquakes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let frame;
    const draw = () => {
      const noise = (Math.random() - 0.5) * 4;
      const impact = impactRef.current > 0 ? (Math.random() - 0.5) * impactRef.current : 0;
      impactRef.current *= 0.96;
      dataRef.current.push(noise + impact + Math.sin(Date.now() / 200) * 2);
      dataRef.current.shift();

      ctx.fillStyle = "rgba(0,0,0,0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.strokeStyle = "#00ff88";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#00ff88";
      ctx.shadowBlur = 4;
      const mid = canvas.height / 2;
      dataRef.current.forEach((v, i) => {
        const x = (i / dataRef.current.length) * canvas.width;
        const y = mid - v;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw center line
      ctx.beginPath();
      ctx.strokeStyle = "rgba(0,255,136,0.15)";
      ctx.lineWidth = 0.5;
      ctx.moveTo(0, mid);
      ctx.lineTo(canvas.width, mid);
      ctx.stroke();

      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={canvasRef} width={400} height={60} style={{ width: "100%", height: "60px", border: "1px solid rgba(0,255,136,0.15)" }} />;
}

function RadarSweep() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let angle = 0;
    let frame;
    const draw = () => {
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const r = Math.min(cx, cy) - 4;

      // Concentric circles
      ctx.strokeStyle = "rgba(0,255,136,0.12)";
      ctx.lineWidth = 0.5;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (r / 3) * i, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Cross lines
      ctx.beginPath();
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
      ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
      ctx.stroke();

      // Sweep
      const grad = ctx.createConicalGradient ? null : null;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + 0.5);
      ctx.closePath();
      ctx.fillStyle = "rgba(0,255,136,0.15)";
      ctx.fill();

      // Sweep line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      ctx.strokeStyle = "rgba(0,255,136,0.8)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      angle += 0.03;
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={canvasRef} width={120} height={120} style={{ width: "120px", height: "120px" }} />;
}

function latLngToVec3(lat, lng, r) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function Globe({ width, height, earthquakes }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const globeRef = useRef(null);
  const ringsRef = useRef([]);
  const markersRef = useRef([]);
  const prevEqCountRef = useRef(0);

  useEffect(() => {
    const w = width, h = height;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.z = 2.5;

    // Globe group - earthquake markers rotate with this
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeRef.current = globeGroup;

    const geo = new THREE.SphereGeometry(1, 64, 64);
    const mat = new THREE.MeshPhongMaterial({ color: 0x111111, emissive: 0x050505, shininess: 40 });
    const globe = new THREE.Mesh(geo, mat);
    globeGroup.add(globe);

    const wireMat = new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true, transparent: true, opacity: 0.15 });
    const wire = new THREE.Mesh(new THREE.SphereGeometry(1.001, 32, 32), wireMat);
    globeGroup.add(wire);

    const atmMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.03, side: THREE.BackSide });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.08, 64, 64), atmMat));

    scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(5, 3, 5);
    scene.add(dir);
    const rim = new THREE.DirectionalLight(0xaaaaaa, 0.3);
    rim.position.set(-5, -3, -5);
    scene.add(rim);

    const cities = [
      [51.5,-0.1],[40.7,-74.0],[48.8,2.3],[35.6,139.7],
      [37.6,-122.4],[22.3,114.2],[1.3,103.8],[25.2,55.3],
      [-33.9,18.4],[55.7,37.6],[-23.5,-46.6],[28.6,77.2],
    ];

    const dotGeo = new THREE.SphereGeometry(0.008, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    cities.forEach(([lat, lng]) => {
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(latLngToVec3(lat, lng, 1.01));
      globeGroup.add(dot);
    });

    const arcPairs = [[0,1],[2,3],[4,3],[5,6],[7,5],[8,0],[9,2],[10,1],[11,10]];
    arcPairs.forEach(([a, b]) => {
      if (!cities[a] || !cities[b]) return;
      const start = latLngToVec3(cities[a][0], cities[a][1], 1.01);
      const end = latLngToVec3(cities[b][0], cities[b][1], 1.01);
      const mid = start.clone().add(end).normalize().multiplyScalar(1.3);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(60));
      globeGroup.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 })));
    });

    const markerGeo = new THREE.SphereGeometry(0.02, 8, 8);
    const markers = arcPairs.slice(0, 6).map(([a, b]) => {
      if (!cities[a] || !cities[b]) return null;
      const start = latLngToVec3(cities[a][0], cities[a][1], 1.01);
      const end = latLngToVec3(cities[b][0], cities[b][1], 1.01);
      const mid = start.clone().add(end).normalize().multiplyScalar(1.3);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const marker = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      globeGroup.add(marker);
      return { marker, curve, t: Math.random() };
    }).filter(Boolean);

    let animFrame;
    const animate = () => {
      animFrame = requestAnimationFrame(animate);
      globeGroup.rotation.y += 0.001;

      markers.forEach(m => {
        m.t = (m.t + 0.003) % 1;
        m.marker.position.copy(m.curve.getPoint(m.t));
      });

      // Animate expanding shockwave rings
      ringsRef.current = ringsRef.current.filter(r => {
        r.scale += 0.015;
        r.opacity -= 0.004;
        r.mesh.scale.setScalar(r.scale);
        r.mesh.material.opacity = Math.max(0, r.opacity);
        if (r.opacity <= 0) {
          globeGroup.remove(r.mesh);
          return false;
        }
        return true;
      });

      // Pulse persistent markers
      const t = Date.now() * 0.003;
      markersRef.current.forEach(m => {
        const pulse = 0.5 + 0.5 * Math.sin(t + m.phase);
        m.mesh.material.opacity = 0.4 + pulse * 0.6;
        m.glow.material.opacity = 0.1 + pulse * 0.2;
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrame);
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [width, height]);

  // Add earthquake markers + shockwave rings when new earthquakes arrive
  useEffect(() => {
    if (!sceneRef.current || !globeRef.current || earthquakes.length === 0) return;
    if (earthquakes.length === prevEqCountRef.current) return;

    const newCount = earthquakes.length - prevEqCountRef.current;
    prevEqCountRef.current = earthquakes.length;
    const globeGroup = globeRef.current;

    // Process new earthquakes
    earthquakes.slice(0, Math.max(1, newCount)).forEach(eq => {
      if (!eq.latitude || !eq.longitude) return;

      const pos = latLngToVec3(eq.latitude, eq.longitude, 1.015);
      const mag = Math.max(1, eq.magnitude || 1);
      const ringColor = mag >= 5 ? 0xff3300 : mag >= 3 ? 0xff8800 : 0x00ff88;

      // Persistent glowing dot marker
      const dotSize = Math.max(0.012, mag * 0.008);
      const dotGeo = new THREE.SphereGeometry(dotSize, 12, 12);
      const dotMat = new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.9 });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pos);
      globeGroup.add(dot);

      // Glow sphere around marker
      const glowGeo = new THREE.SphereGeometry(dotSize * 3, 12, 12);
      const glowMat = new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.2 });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(pos);
      globeGroup.add(glow);

      markersRef.current.push({ mesh: dot, glow, phase: Math.random() * Math.PI * 2 });

      // Keep only last 30 markers
      if (markersRef.current.length > 30) {
        const old = markersRef.current.shift();
        globeGroup.remove(old.mesh);
        globeGroup.remove(old.glow);
      }

      // Expanding shockwave rings (3 concentric for dramatic effect)
      for (let i = 0; i < 3; i++) {
        const ringSize = mag * 0.03;
        const ringGeo = new THREE.RingGeometry(ringSize, ringSize * 1.3, 48);
        const ringMat = new THREE.MeshBasicMaterial({
          color: ringColor, transparent: true,
          opacity: 0.8 - i * 0.2, side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(pos);
        ring.lookAt(new THREE.Vector3(0, 0, 0));
        globeGroup.add(ring);

        ringsRef.current.push({
          mesh: ring,
          scale: 1 + i * 0.5,
          opacity: 0.8 - i * 0.2
        });
      }
    });
  }, [earthquakes]);

  return <div ref={mountRef} style={{ position: "absolute", inset: 0 }} />;
}

function SignalLine() {
  const canvasRef = useRef(null);
  const dataRef = useRef(Array.from({ length: 200 }, () => Math.random() * 30 + 20));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let frame;
    const draw = () => {
      dataRef.current.push(Math.random() * 30 + 10 + Math.sin(Date.now() / 300) * 15);
      dataRef.current.shift();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 1;
      dataRef.current.forEach((v, i) => {
        const x = (i / dataRef.current.length) * canvas.width;
        const y = canvas.height - (v / 70) * canvas.height;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={canvasRef} width={280} height={50} style={{ width: "100%", height: "50px" }} />;
}

export default function App() {
  const [trades, setTrades] = useState([]);
  const [prices, setPrices] = useState({});
  const [earthquakes, setEarthquakes] = useState([]);
  const [time, setTime] = useState(new Date());
  const mapW = window.innerWidth - 320;
  const mapH = window.innerHeight;

  // Binance WebSocket
  useEffect(() => {
    const ws = new WebSocket("ws://20.31.207.45/ws/trades");
    ws.onmessage = (event) => {
      const trade = JSON.parse(event.data);
      if (trade.type === "ping") return;
      trade.price = parseFloat(trade.price);
      trade.change = parseFloat(trade.change || 0);
      setTrades(prev => [trade, ...prev].slice(0, 60));
      setPrices(prev => ({ ...prev, [trade.symbol]: trade }));
      setTime(new Date());
    };
    return () => ws.close();
  }, []);

  // Earthquake WebSocket
  useEffect(() => {
    const ws = new WebSocket("ws://20.31.207.45/ws/earthquakes");
    ws.onmessage = (event) => {
      const eq = JSON.parse(event.data);
      if (eq.type === "ping") return;
      setEarthquakes(prev => [eq, ...prev].slice(0, 20));
    };
    return () => ws.close();
  }, []);

  return (
    <div style={{
      width:"100vw", height:"100vh", background:"#050505",
      display:"flex", fontFamily:"'Courier New', monospace",
      overflow:"hidden", position:"relative", color:"#fff"
    }}>
      <div style={{
        position:"absolute", inset:0, zIndex:20, pointerEvents:"none",
        background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px)"
      }}/>

      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
        <Globe width={mapW} height={mapH} earthquakes={earthquakes} />

        <div style={{
          position:"absolute", top:24, left:24, width:280,
          background:"rgba(5,5,5,0.75)", border:"1px solid rgba(255,255,255,0.1)",
          padding:"10px 14px", backdropFilter:"blur(8px)"
        }}>
          <div style={{ color:"rgba(255,255,255,0.3)", fontSize:8, letterSpacing:4, marginBottom:6 }}>SIGNAL / ACTIVITY</div>
          <SignalLine />
        </div>

        {/* Seismic Operations Panel - bottom left */}
        <div style={{
          position:"absolute", bottom:24, left:24, width:360,
          background:"rgba(0,8,2,0.88)", border:"1px solid rgba(0,255,136,0.2)",
          padding:"14px 18px", backdropFilter:"blur(12px)",
          boxShadow:"0 0 30px rgba(0,255,136,0.05), inset 0 0 60px rgba(0,255,136,0.02)"
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{
                color:"#00ff88", fontSize:8, letterSpacing:4, fontWeight:"bold",
                textShadow:"0 0 8px rgba(0,255,136,0.5)"
              }}>◆ SEISMIC OPERATIONS</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{
                width:5, height:5, borderRadius:"50%", background:"#00ff88",
                animation:"pulse 2s infinite", boxShadow:"0 0 6px #00ff88"
              }}/>
              <span style={{ color:"rgba(0,255,136,0.6)", fontSize:7, letterSpacing:2 }}>MONITORING</span>
            </div>
          </div>

          <SeismicWaveform earthquakes={earthquakes} />

          <div style={{ marginTop:10, display:"flex", gap:10 }}>
            <div style={{ flex:1 }}>
              <div style={{ color:"rgba(0,255,136,0.4)", fontSize:7, letterSpacing:2, marginBottom:6 }}>RECENT DETECTIONS</div>
              {earthquakes.slice(0, 5).map((eq, i) => {
                const threat = getThreatLevel(eq.magnitude);
                return (
                  <div key={i} style={{
                    display:"flex", justifyContent:"space-between", alignItems:"center",
                    padding:"4px 0", borderBottom:"1px solid rgba(0,255,136,0.08)",
                    opacity: 1 - i * 0.15
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{
                        width:4, height:4, borderRadius:"50%",
                        background: threat.color,
                        boxShadow: `0 0 4px ${threat.color}`,
                        animation: threat.blink ? "pulse 0.5s infinite" : "none"
                      }}/>
                      <span style={{ color:"rgba(0,255,136,0.7)", fontSize:9 }}>
                        {eq.place?.slice(0, 24) || "UNKNOWN SECTOR"}
                      </span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{
                        color: threat.color, fontSize:8, fontWeight:"bold",
                        textShadow: `0 0 4px ${threat.color}`,
                        letterSpacing:1
                      }}>{threat.label}</span>
                      <span style={{
                        color:"#fff", fontSize:10, fontWeight:"bold",
                        background:"rgba(0,255,136,0.1)", padding:"1px 5px",
                        border:"1px solid rgba(0,255,136,0.2)"
                      }}>M{eq.magnitude?.toFixed(1)}</span>
                    </div>
                  </div>
                );
              })}
              {earthquakes.length === 0 && (
                <div style={{ color:"rgba(0,255,136,0.3)", fontSize:9, fontStyle:"italic" }}>
                  ▌ Awaiting seismic intercepts...
                </div>
              )}
            </div>
          </div>

          <div style={{
            marginTop:10, paddingTop:8, borderTop:"1px solid rgba(0,255,136,0.1)",
            display:"flex", justifyContent:"space-between"
          }}>
            <span style={{ color:"rgba(0,255,136,0.3)", fontSize:7, letterSpacing:2 }}>
              EVENTS TRACKED: {earthquakes.length}
            </span>
            <span style={{ color:"rgba(0,255,136,0.3)", fontSize:7, letterSpacing:2 }}>
              STATUS: {earthquakes.length > 0 && earthquakes[0].magnitude >= 5 ? "⚠ ELEVATED" : "NOMINAL"}
            </span>
          </div>
        </div>

        {/* Radar + classification - bottom right of globe */}
        <div style={{
          position:"absolute", bottom:24, right:344, width:160,
          background:"rgba(0,8,2,0.85)", border:"1px solid rgba(0,255,136,0.15)",
          padding:"10px", backdropFilter:"blur(8px)", display:"flex", flexDirection:"column", alignItems:"center"
        }}>
          <div style={{ color:"rgba(0,255,136,0.4)", fontSize:7, letterSpacing:3, marginBottom:6 }}>THREAT RADAR</div>
          <RadarSweep />
          <div style={{ marginTop:8, width:"100%" }}>
            {[
              { label:"CRITICAL", color:"#ff2020", count: earthquakes.filter(e => e.magnitude >= 7).length },
              { label:"HIGH", color:"#ff6a00", count: earthquakes.filter(e => e.magnitude >= 5 && e.magnitude < 7).length },
              { label:"MODERATE", color:"#ffcc00", count: earthquakes.filter(e => e.magnitude >= 3 && e.magnitude < 5).length },
              { label:"LOW", color:"#00ff88", count: earthquakes.filter(e => e.magnitude < 3).length },
            ].map(t => (
              <div key={t.label} style={{ display:"flex", justifyContent:"space-between", padding:"2px 0" }}>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:6, height:3, background:t.color }}/>
                  <span style={{ color:"rgba(255,255,255,0.4)", fontSize:7 }}>{t.label}</span>
                </div>
                <span style={{ color:t.color, fontSize:8, fontWeight:"bold" }}>{t.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position:"absolute", top:24, right:344, textAlign:"right" }}>
          <div style={{ color:"rgba(255,255,255,0.2)", fontSize:8, letterSpacing:5 }}>GLOBAL LIVE FEED</div>
          <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:2, marginTop:4 }}>
            {time.toISOString().replace("T"," ").slice(0,19)} UTC
          </div>
          <div style={{ color:"rgba(0,255,136,0.3)", fontSize:7, letterSpacing:3, marginTop:4 }}>
            CLASSIFICATION: TOP SECRET // SCI
          </div>
        </div>
      </div>

      <div style={{
        width:320, height:"100vh", display:"flex", flexDirection:"column",
        background:"rgba(8,8,8,0.95)", borderLeft:"1px solid rgba(255,255,255,0.08)",
        backdropFilter:"blur(20px)"
      }}>
        <div style={{
          padding:"18px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)",
          display:"flex", justifyContent:"space-between", alignItems:"center"
        }}>
          <div>
            <div style={{ color:"rgba(255,255,255,0.3)", fontSize:8, letterSpacing:4 }}>MARKET INTELLIGENCE</div>
            <div style={{ color:"rgba(255,255,255,0.9)", fontSize:12, letterSpacing:3, marginTop:3 }}>CRYPTO — LIVE</div>
          </div>
          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#fff", opacity:0.9 }}/>
            <span style={{ color:"rgba(255,255,255,0.3)", fontSize:8, letterSpacing:2 }}>LIVE</span>
          </div>
        </div>

        <div style={{ padding:"14px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ color:"rgba(255,255,255,0.25)", fontSize:8, letterSpacing:3, marginBottom:10 }}>SPOT PRICES</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
            {SYMBOLS.slice(0,12).map(sym => {
              const p = prices[sym];
              const isUp = p?.change > 0;
              return (
                <div key={sym} style={{
                  border:"1px solid rgba(255,255,255,0.06)",
                  padding:"6px 10px", display:"flex", justifyContent:"space-between", alignItems:"center"
                }}>
                  <span style={{ color:"rgba(255,255,255,0.4)", fontSize:9, letterSpacing:1 }}>{sym}</span>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ color: p ? (isUp ? "#fff" : "rgba(255,255,255,0.5)") : "rgba(255,255,255,0.2)", fontSize:10, fontWeight:"bold" }}>
                      {p ? (p.price < 1 ? p.price.toFixed(4) : p.price.toLocaleString()) : "—"}
                    </div>
                    {p && (
                      <div style={{ color: isUp ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)", fontSize:8 }}>
                        {isUp ? "▲" : "▼"} {Math.abs(p.change).toFixed(2)}%
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ flex:1, overflow:"hidden", padding:"14px 16px" }}>
          <div style={{ color:"rgba(255,255,255,0.25)", fontSize:8, letterSpacing:3, marginBottom:10 }}>TRADE STREAM</div>
          <div style={{ display:"flex", flexDirection:"column", gap:1, overflow:"hidden", height:"calc(100% - 28px)" }}>
            {trades.slice(0,40).map((t, i) => (
              <div key={`${t.ts}-${i}`} style={{
                display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"3px 8px",
                borderLeft:`2px solid rgba(255,255,255,${t.side==="buy" ? 0.4 : 0.12})`,
                opacity: Math.max(0.1, 1 - i * 0.022),
              }}>
                <span style={{ color:"rgba(255,255,255,0.5)", fontSize:9, width:45 }}>{t.symbol}</span>
                <span style={{ color:`rgba(255,255,255,${t.side==="buy"?0.8:0.3})`, fontSize:9, width:24 }}>{t.side==="buy"?"B":"S"}</span>
                <span style={{ color:"rgba(255,255,255,0.8)", fontSize:9, fontWeight:"bold", textAlign:"right", flex:1 }}>
                  {t.price < 1 ? t.price.toFixed(4) : t.price.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          padding:"10px 20px", borderTop:"1px solid rgba(255,255,255,0.06)",
          display:"flex", justifyContent:"space-between"
        }}>
          <span style={{ color:"rgba(255,255,255,0.2)", fontSize:8, letterSpacing:2 }}>430 PAIRS</span>
          <span style={{ color:"rgba(0,255,136,0.4)", fontSize:8, letterSpacing:2 }}>{earthquakes.length} SEISMIC</span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
