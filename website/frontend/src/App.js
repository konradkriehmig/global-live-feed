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

const generateTrade = () => {
  const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const base = BASE_PRICES[symbol] || 1;
  const price = parseFloat((base * (1 + (Math.random() - 0.5) * 0.002)).toFixed(base < 1 ? 4 : 2));
  const change = (Math.random() - 0.5) * 2;
  return { symbol, price, change, side: Math.random() > 0.5 ? "BUY" : "SELL", ts: Date.now() };
};

function Globe({ width, height }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const w = width, h = height;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.z = 2.5;

    // Globe sphere
    const geo = new THREE.SphereGeometry(1, 64, 64);
    const mat = new THREE.MeshPhongMaterial({
      color: 0x111111,
      emissive: 0x050505,
      shininess: 40,
      wireframe: false,
    });
    const globe = new THREE.Mesh(geo, mat);
    scene.add(globe);

    // Wireframe overlay
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true, transparent: true, opacity: 0.15 });
    const wireGeo = new THREE.SphereGeometry(1.001, 32, 32);
    const wire = new THREE.Mesh(wireGeo, wireMat);
    scene.add(wire);

    // Atmosphere glow
    const atmGeo = new THREE.SphereGeometry(1.08, 64, 64);
    const atmMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.03,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(atmGeo, atmMat));

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(5, 3, 5);
    scene.add(dir);
    const rim = new THREE.DirectionalLight(0xaaaaaa, 0.3);
    rim.position.set(-5, -3, -5);
    scene.add(rim);

    // City dots
    const cities = [
      [51.5,-0.1],[40.7,-74.0],[48.8,2.3],[35.6,139.7],
      [37.6,-122.4],[22.3,114.2],[1.3,103.8],[25.2,55.3],
      [-33.9,18.4],[55.7,37.6],[-23.5,-46.6],[28.6,77.2],
      [19.4,-99.1],[-34.6,-58.4],[52.5,13.4],[41.9,12.5]
    ];

    function latLngToVec3(lat, lng, r) {
      const phi = (90 - lat) * Math.PI / 180;
      const theta = (lng + 180) * Math.PI / 180;
      return new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    }

    const dotGeo = new THREE.SphereGeometry(0.008, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    cities.forEach(([lat, lng]) => {
      const dot = new THREE.Mesh(dotGeo, dotMat);
      const v = latLngToVec3(lat, lng, 1.01);
      dot.position.copy(v);
      scene.add(dot);
    });

    // Arc lines between cities
    const arcPairs = [
      [0,1],[2,3],[4,3],[5,6],[7,5],[8,0],[9,2],[10,1],[11,10],[12,1],[13,1],[14,2]
    ];
    arcPairs.forEach(([a, b]) => {
      if (!cities[a] || !cities[b]) return;
      const start = latLngToVec3(cities[a][0], cities[a][1], 1.01);
      const end = latLngToVec3(cities[b][0], cities[b][1], 1.01);
      const mid = start.clone().add(end).normalize().multiplyScalar(1.3);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const pts = curve.getPoints(60);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 });
      scene.add(new THREE.Line(lineGeo, lineMat));
    });

    // Animated marker
    const markerGeo = new THREE.SphereGeometry(0.02, 8, 8);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const markers = arcPairs.slice(0, 6).map(([a, b]) => {
      if (!cities[a] || !cities[b]) return null;
      const start = latLngToVec3(cities[a][0], cities[a][1], 1.01);
      const end = latLngToVec3(cities[b][0], cities[b][1], 1.01);
      const mid = start.clone().add(end).normalize().multiplyScalar(1.3);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const marker = new THREE.Mesh(markerGeo, markerMat.clone());
      scene.add(marker);
      return { marker, curve, t: Math.random() };
    }).filter(Boolean);

    let animFrame;
    const animate = () => {
      animFrame = requestAnimationFrame(animate);
      globe.rotation.y += 0.001;
      wire.rotation.y += 0.001;
      markers.forEach(m => {
        m.t = (m.t + 0.003) % 1;
        const pos = m.curve.getPoint(m.t);
        m.marker.position.copy(pos);
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
  const [time, setTime] = useState(new Date());
  const mapW = window.innerWidth - 320;
  const mapH = window.innerHeight;

  useEffect(() => {
    const iv = setInterval(() => {
      const t = generateTrade();
      setTrades(prev => [t, ...prev].slice(0, 60));
      setPrices(prev => ({ ...prev, [t.symbol]: t }));
      setTime(new Date());
    }, 100);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{
      width:"100vw", height:"100vh", background:"#050505",
      display:"flex", fontFamily:"'Courier New', monospace",
      overflow:"hidden", position:"relative", color:"#fff"
    }}>
      {/* Scanlines */}
      <div style={{
        position:"absolute", inset:0, zIndex:20, pointerEvents:"none",
        background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px)"
      }}/>

      {/* GLOBE AREA */}
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
        <Globe width={mapW} height={mapH} />

        {/* Signal top-left */}
        <div style={{
          position:"absolute", top:24, left:24, width:280,
          background:"rgba(5,5,5,0.75)", border:"1px solid rgba(255,255,255,0.1)",
          padding:"10px 14px", backdropFilter:"blur(8px)"
        }}>
          <div style={{ color:"rgba(255,255,255,0.3)", fontSize:8, letterSpacing:4, marginBottom:6 }}>
            SIGNAL / ACTIVITY
          </div>
          <SignalLine />
        </div>

        {/* Status bottom-left */}
        <div style={{ position:"absolute", bottom:24, left:24, display:"flex", gap:10 }}>
          {[
            { label:"AIRCRAFT", count:6 },
            { label:"VESSELS", count:3 },
            { label:"FEEDS", count:430 },
          ].map(b => (
            <div key={b.label} style={{
              background:"rgba(5,5,5,0.8)", border:"1px solid rgba(255,255,255,0.1)",
              padding:"6px 14px", display:"flex", gap:8, alignItems:"center",
              backdropFilter:"blur(8px)"
            }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:"#fff", opacity:0.8 }} />
              <span style={{ color:"rgba(255,255,255,0.6)", fontSize:9, letterSpacing:2 }}>
                {b.count} {b.label}
              </span>
            </div>
          ))}
        </div>

        {/* Top right timestamp */}
        <div style={{ position:"absolute", top:24, right:24, textAlign:"right" }}>
          <div style={{ color:"rgba(255,255,255,0.2)", fontSize:8, letterSpacing:5 }}>GLOBAL LIVE FEED</div>
          <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:2, marginTop:4 }}>
            {time.toISOString().replace("T"," ").slice(0,19)} UTC
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{
        width:320, height:"100vh", display:"flex", flexDirection:"column",
        background:"rgba(8,8,8,0.95)", borderLeft:"1px solid rgba(255,255,255,0.08)",
        backdropFilter:"blur(20px)"
      }}>
        {/* Header */}
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

        {/* Price grid */}
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

        {/* Trade stream */}
        <div style={{ flex:1, overflow:"hidden", padding:"14px 16px" }}>
          <div style={{ color:"rgba(255,255,255,0.25)", fontSize:8, letterSpacing:3, marginBottom:10 }}>
            TRADE STREAM
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:1, overflow:"hidden", height:"calc(100% - 28px)" }}>
            {trades.slice(0,40).map((t, i) => (
              <div key={`${t.ts}-${i}`} style={{
                display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"3px 8px",
                borderLeft:`2px solid rgba(255,255,255,${t.side==="BUY" ? 0.4 : 0.12})`,
                opacity: Math.max(0.1, 1 - i * 0.022),
              }}>
                <span style={{ color:"rgba(255,255,255,0.5)", fontSize:9, width:45 }}>{t.symbol}</span>
                <span style={{ color:`rgba(255,255,255,${t.side==="BUY"?0.8:0.3})`, fontSize:9, width:24 }}>{t.side==="BUY"?"B":"S"}</span>
                <span style={{ color:"rgba(255,255,255,0.8)", fontSize:9, fontWeight:"bold", textAlign:"right", flex:1 }}>
                  {t.price < 1 ? t.price.toFixed(4) : t.price.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding:"10px 20px", borderTop:"1px solid rgba(255,255,255,0.06)",
          display:"flex", justifyContent:"space-between"
        }}>
          <span style={{ color:"rgba(255,255,255,0.2)", fontSize:8, letterSpacing:2 }}>430 PAIRS</span>
          <span style={{ color:"rgba(255,255,255,0.2)", fontSize:8, letterSpacing:2 }}>BINANCE WSS</span>
        </div>
      </div>
    </div>
  );
}
