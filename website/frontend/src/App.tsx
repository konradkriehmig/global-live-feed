import { useState, useEffect, useRef, CSSProperties } from "react";
import * as THREE from "three";

const SYMBOLS = [
  "BTC","ETH","BNB","SOL","XRP","ADA","DOGE","AVAX","DOT","LINK",
  "MATIC","UNI","ATOM","LTC","BCH","NEAR","APT","ARB","OP","INJ"
];

interface Trade {
  symbol: string;
  price: number;
  change: number;
  side: "buy" | "sell";
  ts: number | string;
  type?: string;
}

interface RawTrade extends Omit<Trade, "price" | "change"> {
  price: string | number;
  change?: string | number;
}

interface Earthquake {
  place?: string;
  magnitude?: number;
  latitude?: number;
  longitude?: number;
  type?: string;
}

interface RawMetrics {
  metrics: Record<string, number>;
  type?: string;
}

interface ComputedMetrics {
  memUsedPct: string;
  swapUsedPct: string;
  temp: number;
  load1: string;
  load5: string;
  load15: string;
  procsRunning: number;
  procsBlocked: number;
  cpuCores: number[];
  rxKBs: string;
  txKBs: string;
  rxPkts: number;
  txPkts: number;
  diskReadKBs: string;
  diskWriteKBs: string;
  diskIoPct: string;
  ctxPerSec: number;
  intrPerSec: number;
}

function getMagColor(mag: number): string {
  if (mag >= 7) return "#ff2020";
  if (mag >= 5) return "#ff6a00";
  if (mag >= 3) return "#ffcc00";
  return "rgba(255,255,255,0.4)";
}

function latLngToVec3(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function computeMetrics(current: RawMetrics, previous: RawMetrics | null): ComputedMetrics {
  const m = current.metrics;
  const p = previous?.metrics || {};

  const memTotal = m["node_memory_MemTotal_bytes"] || 1;
  const memAvailable = m["node_memory_MemAvailable_bytes"] || 0;
  const memUsedPct = ((memTotal - memAvailable) / memTotal * 100).toFixed(1);

  const swapTotal = m["node_memory_SwapTotal_bytes"] || 1;
  const swapFree = m["node_memory_SwapFree_bytes"] || swapTotal;
  const swapUsedPct = ((swapTotal - swapFree) / swapTotal * 100).toFixed(1);

  const temp = m['node_hwmon_temp_celsius{chip="platform_coretemp_0",sensor="temp2"}'] || 0;
  const load1 = (m["node_load1"] || 0).toFixed(2);
  const load5 = (m["node_load5"] || 0).toFixed(2);
  const load15 = (m["node_load15"] || 0).toFixed(2);
  const procsRunning = m["node_procs_running"] || 0;
  const procsBlocked = m["node_procs_blocked"] || 0;

  const cpuCores: number[] = [];
  for (let i = 0; i < 4; i++) {
    const idle = m[`node_cpu_seconds_total{cpu="${i}",mode="idle"}`] || 0;
    const user = m[`node_cpu_seconds_total{cpu="${i}",mode="user"}`] || 0;
    const system = m[`node_cpu_seconds_total{cpu="${i}",mode="system"}`] || 0;
    const iowait = m[`node_cpu_seconds_total{cpu="${i}",mode="iowait"}`] || 0;
    const pIdle = p[`node_cpu_seconds_total{cpu="${i}",mode="idle"}`] || idle;
    const pUser = p[`node_cpu_seconds_total{cpu="${i}",mode="user"}`] || user;
    const pSystem = p[`node_cpu_seconds_total{cpu="${i}",mode="system"}`] || system;
    const pIowait = p[`node_cpu_seconds_total{cpu="${i}",mode="iowait"}`] || iowait;
    const deltaIdle = idle - pIdle;
    const deltaTotal = (idle + user + system + iowait) - (pIdle + pUser + pSystem + pIowait);
    const usage = deltaTotal > 0 ? ((1 - deltaIdle / deltaTotal) * 100).toFixed(1) : "0";
    cpuCores.push(parseFloat(usage));
  }

  const rxNow = m['node_network_receive_bytes_total{device="enp0s31f6"}'] || 0;
  const txNow = m['node_network_transmit_bytes_total{device="enp0s31f6"}'] || 0;
  const rxKBs = ((rxNow - (p['node_network_receive_bytes_total{device="enp0s31f6"}'] || rxNow)) / 1024).toFixed(1);
  const txKBs = ((txNow - (p['node_network_transmit_bytes_total{device="enp0s31f6"}'] || txNow)) / 1024).toFixed(1);

  const rxPktsNow = m['node_network_receive_packets_total{device="enp0s31f6"}'] || 0;
  const txPktsNow = m['node_network_transmit_packets_total{device="enp0s31f6"}'] || 0;
  const rxPkts = rxPktsNow - (p['node_network_receive_packets_total{device="enp0s31f6"}'] || rxPktsNow);
  const txPkts = txPktsNow - (p['node_network_transmit_packets_total{device="enp0s31f6"}'] || txPktsNow);

  const diskReadNow = m['node_disk_read_bytes_total{device="nvme0n1"}'] || 0;
  const diskWriteNow = m['node_disk_written_bytes_total{device="nvme0n1"}'] || 0;
  const diskReadKBs = ((diskReadNow - (p['node_disk_read_bytes_total{device="nvme0n1"}'] || diskReadNow)) / 1024).toFixed(1);
  const diskWriteKBs = ((diskWriteNow - (p['node_disk_written_bytes_total{device="nvme0n1"}'] || diskWriteNow)) / 1024).toFixed(1);

  const diskIoNow = m['node_disk_io_time_seconds_total{device="nvme0n1"}'] || 0;
  const diskIoPct = ((diskIoNow - (p['node_disk_io_time_seconds_total{device="nvme0n1"}'] || diskIoNow)) * 100).toFixed(1);

  const ctxNow = m["node_context_switches_total"] || 0;
  const ctxPerSec = Math.round(ctxNow - (p["node_context_switches_total"] || ctxNow));

  const intrNow = m["node_intr_total"] || 0;
  const intrPerSec = Math.round(intrNow - (p["node_intr_total"] || intrNow));

  return {
    memUsedPct, swapUsedPct, temp, load1, load5, load15,
    procsRunning, procsBlocked, cpuCores,
    rxKBs, txKBs, rxPkts, txPkts,
    diskReadKBs, diskWriteKBs, diskIoPct,
    ctxPerSec, intrPerSec
  };
}

type BasicMesh<G extends THREE.BufferGeometry> = THREE.Mesh<G, THREE.MeshBasicMaterial>;

interface EqMarker {
  mesh: BasicMesh<THREE.SphereGeometry>;
  glow: BasicMesh<THREE.SphereGeometry>;
  phase: number;
}

interface RippleRing {
  mesh: BasicMesh<THREE.RingGeometry>;
  scale: number;
  opacity: number;
}

interface PathMarker {
  marker: BasicMesh<THREE.SphereGeometry>;
  curve: THREE.QuadraticBezierCurve3;
  t: number;
}

interface GlobeProps {
  width: number;
  height: number;
  earthquakes: Earthquake[];
}

function Globe({ width, height, earthquakes }: GlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const globeRef = useRef<THREE.Group | null>(null);
  const ringsRef = useRef<RippleRing[]>([]);
  const markersRef = useRef<EqMarker[]>([]);
  const prevEqCountRef = useRef(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const w = width, h = height;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.z = 2.5;

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeRef.current = globeGroup;

    globeGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), new THREE.MeshPhongMaterial({ color: 0x111111, emissive: 0x050505, shininess: 40 })));
    globeGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.001, 32, 32), new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true, transparent: true, opacity: 0.15 })));
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.08, 64, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.03, side: THREE.BackSide })));

    scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(5, 3, 5);
    scene.add(dir);

    const cities: [number, number][] = [
      [51.5,-0.1],[40.7,-74.0],[48.8,2.3],[35.6,139.7],
      [37.6,-122.4],[22.3,114.2],[1.3,103.8],[25.2,55.3],
      [-33.9,18.4],[55.7,37.6],[-23.5,-46.6],[28.6,77.2],
    ];

    cities.forEach(([lat, lng]) => {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      dot.position.copy(latLngToVec3(lat, lng, 1.01));
      globeGroup.add(dot);
    });

    const arcPairs: [number, number][] = [[0,1],[2,3],[4,3],[5,6],[7,5],[8,0],[9,2],[10,1],[11,10]];
    const pathMarkers = arcPairs.slice(0, 6).map(([a, b]): PathMarker | null => {
      if (!cities[a] || !cities[b]) return null;
      const start = latLngToVec3(cities[a][0], cities[a][1], 1.01);
      const end = latLngToVec3(cities[b][0], cities[b][1], 1.01);
      const mid = start.clone().add(end).normalize().multiplyScalar(1.3);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      globeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 })));
      const marker = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      globeGroup.add(marker);
      return { marker, curve, t: Math.random() };
    }).filter((m): m is PathMarker => m !== null);

    let animFrame: number;
    const animate = () => {
      animFrame = requestAnimationFrame(animate);
      globeGroup.rotation.y += 0.001;
      pathMarkers.forEach(m => { m.t = (m.t + 0.003) % 1; m.marker.position.copy(m.curve.getPoint(m.t)); });
      ringsRef.current = ringsRef.current.filter(r => {
        r.scale += 0.015; r.opacity -= 0.004;
        r.mesh.scale.setScalar(r.scale);
        r.mesh.material.opacity = Math.max(0, r.opacity);
        if (r.opacity <= 0) { globeGroup.remove(r.mesh); return false; }
        return true;
      });
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
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [width, height]);

  useEffect(() => {
    if (!sceneRef.current || !globeRef.current || earthquakes.length === 0) return;
    if (earthquakes.length === prevEqCountRef.current) return;
    const newCount = earthquakes.length - prevEqCountRef.current;
    prevEqCountRef.current = earthquakes.length;
    const globeGroup = globeRef.current;
    earthquakes.slice(0, Math.max(1, newCount)).forEach(eq => {
      if (!eq.latitude || !eq.longitude) return;
      const pos = latLngToVec3(eq.latitude, eq.longitude, 1.015);
      const mag = Math.max(1, eq.magnitude || 1);
      const ringColor = mag >= 5 ? 0xff3300 : mag >= 3 ? 0xff8800 : 0x00ff88;
      const dotSize = Math.max(0.012, mag * 0.008);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(dotSize, 12, 12), new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.9 }));
      dot.position.copy(pos); globeGroup.add(dot);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(dotSize * 3, 12, 12), new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.2 }));
      glow.position.copy(pos); globeGroup.add(glow);
      markersRef.current.push({ mesh: dot, glow, phase: Math.random() * Math.PI * 2 });
      if (markersRef.current.length > 30) {
        const old = markersRef.current.shift();
        if (old) { globeGroup.remove(old.mesh); globeGroup.remove(old.glow); }
      }
      for (let i = 0; i < 3; i++) {
        const ringSize = mag * 0.03;
        const ring = new THREE.Mesh(new THREE.RingGeometry(ringSize, ringSize * 1.3, 48), new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.8 - i * 0.2, side: THREE.DoubleSide }));
        ring.position.copy(pos); ring.lookAt(new THREE.Vector3(0, 0, 0)); globeGroup.add(ring);
        ringsRef.current.push({ mesh: ring, scale: 1 + i * 0.5, opacity: 0.8 - i * 0.2 });
      }
    });
  }, [earthquakes]);

  return <div ref={mountRef} style={{ position: "absolute", inset: 0 }} />;
}

function SignalLine() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<number[]>(Array.from({ length: 200 }, () => Math.random() * 30 + 20));
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame: number;
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

function MiniBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct > 80 ? "#ff4444" : pct > 50 ? "#ffaa00" : "#fff";
  return (
    <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 2, marginTop: 2 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.3s" }} />
    </div>
  );
}

function Row({ label, val }: { label: string; val: string | number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0" }}>
      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 8, letterSpacing: 1 }}>{label}</span>
      <span style={{ color: "#fff", fontSize: 9, fontWeight: "bold" }}>{val}</span>
    </div>
  );
}

const fp: CSSProperties = {
  position: "absolute",
  left: 24,
  background: "rgba(5,5,5,0.55)",
  border: "1px solid rgba(255,255,255,0.1)",
  backdropFilter: "blur(12px)",
  padding: "10px 14px",
  width: 200,
};

export default function App() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [prices, setPrices] = useState<Record<string, Trade>>({});
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [sysMetrics, setSysMetrics] = useState<ComputedMetrics | null>(null);
  const prevMetricsRef = useRef<RawMetrics | null>(null);
  const [time, setTime] = useState(new Date());
  const mapW = window.innerWidth - 640;
  const mapH = window.innerHeight;

  useEffect(() => {
    const ws = new WebSocket("ws://20.31.207.45/ws/binance");
    ws.onmessage = (event: MessageEvent<string>) => {
      const raw: RawTrade = JSON.parse(event.data);
      if (raw.type === "ping") return;
      const trade: Trade = {
        ...raw,
        price: parseFloat(String(raw.price)),
        change: parseFloat(String(raw.change || 0)),
      };
      setTrades(prev => [trade, ...prev].slice(0, 60));
      setPrices(prev => ({ ...prev, [trade.symbol]: trade }));
      setTime(new Date());
    };
    return () => ws.close();
  }, []);

  useEffect(() => {
    const ws = new WebSocket("ws://20.31.207.45/ws/earthquakes");
    ws.onmessage = (event: MessageEvent<string>) => {
      const eq: Earthquake = JSON.parse(event.data);
      if (eq.type === "ping") return;
      setEarthquakes(prev => [eq, ...prev].slice(0, 60));
    };
    return () => ws.close();
  }, []);

  useEffect(() => {
    const ws = new WebSocket("ws://20.31.207.45/ws/thinkcentre");
    ws.onmessage = (event: MessageEvent<string>) => {
      const data: RawMetrics = JSON.parse(event.data);
      if (data.type === "ping") return;
      const computed = computeMetrics(data, prevMetricsRef.current);
      prevMetricsRef.current = data;
      setSysMetrics(computed);
    };
    return () => ws.close();
  }, []);

  // Calculate cumulative top offset for stacked panels
  const signalHeight = 90;
  const cpuPanelTop = 24 + signalHeight + 8;
  const cpuPanelHeight = sysMetrics ? (4 * 32 + 8 + 7 * 18 + 16) : 0;
  const telemetryPanelTop = cpuPanelTop + cpuPanelHeight + 8;

  return (
    <div style={{ width:"100vw", height:"100vh", background:"#050505", display:"flex", fontFamily:"'Courier New', monospace", overflow:"hidden", position:"relative", color:"#fff" }}>
      <div style={{ position:"absolute", inset:0, zIndex:20, pointerEvents:"none", background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px)" }}/>

      {/* LEFT — Earthquake panel */}
      <div style={{ width:320, height:"100vh", display:"flex", flexDirection:"column", background:"rgba(8,8,8,0.95)", borderRight:"1px solid rgba(255,255,255,0.08)", backdropFilter:"blur(20px)" }}>
        <div style={{ padding:"18px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ color:"rgba(255,255,255,0.3)", fontSize:8, letterSpacing:4 }}>SEISMIC ACTIVITY</div>
            <div style={{ color:"rgba(255,255,255,0.9)", fontSize:12, letterSpacing:3, marginTop:3 }}>USGS</div>
          </div>
          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#fff", opacity:0.9 }}/>
            <span style={{ color:"rgba(255,255,255,0.3)", fontSize:8, letterSpacing:2 }}>LIVE</span>
          </div>
        </div>
        <div style={{ flex:1, overflow:"hidden", padding:"14px 16px" }}>
          <div style={{ color:"rgba(255,255,255,0.25)", fontSize:8, letterSpacing:3, marginBottom:10 }}>EVENT STREAM</div>
          <div style={{ display:"flex", flexDirection:"column", gap:1, overflow:"hidden", height:"calc(100% - 28px)" }}>
            {earthquakes.slice(0,40).map((eq, i) => {
              const mag = eq.magnitude || 0;
              const color = getMagColor(mag);
              return (
                <div key={`${eq.place}-${i}`} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"3px 8px", borderLeft:`2px solid ${color}`, opacity: Math.max(0.1, 1 - i * 0.022) }}>
                  <span style={{ color:"rgba(255,255,255,0.55)", fontSize:9, flex:1, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis", marginRight:8 }}>{eq.place || "UNKNOWN"}</span>
                  <span style={{ color, fontSize:10, fontWeight:"bold", whiteSpace:"nowrap" }}>M{mag.toFixed(1)}</span>
                </div>
              );
            })}
            {earthquakes.length === 0 && <div style={{ color:"rgba(255,255,255,0.2)", fontSize:9 }}>Awaiting events...</div>}
          </div>
        </div>
        <div style={{ padding:"10px 20px", borderTop:"1px solid rgba(255,255,255,0.06)", display:"flex", justifyContent:"space-between" }}>
          <span style={{ color:"rgba(255,255,255,0.2)", fontSize:8, letterSpacing:2 }}>USGS STREAM</span>
          <span style={{ color:"rgba(255,255,255,0.4)", fontSize:8, letterSpacing:2 }}>{earthquakes.length} EVENTS</span>
        </div>
      </div>

      {/* CENTER — Globe + stacked left overlays */}
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
        <Globe width={mapW} height={mapH} earthquakes={earthquakes} />

        {/* Signal monitor */}
        <div style={{ ...fp, top: 24 }}>
          <div style={{ color:"rgba(255,255,255,0.3)", fontSize:8, letterSpacing:4, marginBottom:6 }}>SIGNAL / ACTIVITY</div>
          <SignalLine />
        </div>

        {/* CPU panel */}
        {sysMetrics && (
          <div style={{ ...fp, top: cpuPanelTop }}>
            <div style={{ color:"rgba(255,255,255,0.3)", fontSize:8, letterSpacing:3, marginBottom:8 }}>CPU — M710Q</div>
            {sysMetrics.cpuCores.map((pct, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ color:"rgba(255,255,255,0.3)", fontSize:7, letterSpacing:1 }}>CORE {i}</span>
                  <span style={{ color:"#fff", fontSize:8, fontWeight:"bold" }}>{pct}%</span>
                </div>
                <MiniBar value={pct} />
              </div>
            ))}
            <div style={{ borderTop:"1px solid rgba(255,255,255,0.08)", marginTop:8, paddingTop:8 }}>
              <Row label="LOAD 1m" val={sysMetrics.load1} />
              <Row label="LOAD 5m" val={sysMetrics.load5} />
              <Row label="LOAD 15m" val={sysMetrics.load15} />
              <Row label="PROCS" val={sysMetrics.procsRunning} />
              <Row label="BLOCKED" val={sysMetrics.procsBlocked} />
              <Row label="CTX/s" val={sysMetrics.ctxPerSec.toLocaleString()} />
              <Row label="INT/s" val={sysMetrics.intrPerSec.toLocaleString()} />
            </div>
          </div>
        )}

        {/* System telemetry panel — stacked below CPU */}
        {sysMetrics && (
          <div style={{ ...fp, top: telemetryPanelTop }}>
            <div style={{ color:"rgba(255,255,255,0.3)", fontSize:8, letterSpacing:3, marginBottom:8 }}>SYSTEM TELEMETRY</div>
            <Row label="MEMORY" val={`${sysMetrics.memUsedPct}%`} />
            <div style={{ marginBottom:6 }}><MiniBar value={parseFloat(sysMetrics.memUsedPct)} /></div>
            <Row label="SWAP" val={`${sysMetrics.swapUsedPct}%`} />
            <div style={{ marginBottom:6 }}><MiniBar value={parseFloat(sysMetrics.swapUsedPct)} /></div>
            <Row label="TEMP" val={`${sysMetrics.temp}°C`} />
            <div style={{ borderTop:"1px solid rgba(255,255,255,0.08)", margin:"8px 0" }} />
            <Row label="NET ↓" val={`${sysMetrics.rxKBs} KB/s`} />
            <Row label="NET ↑" val={`${sysMetrics.txKBs} KB/s`} />
            <Row label="PKT ↓" val={sysMetrics.rxPkts} />
            <Row label="PKT ↑" val={sysMetrics.txPkts} />
            <div style={{ borderTop:"1px solid rgba(255,255,255,0.08)", margin:"8px 0" }} />
            <Row label="DISK R" val={`${sysMetrics.diskReadKBs} KB/s`} />
            <Row label="DISK W" val={`${sysMetrics.diskWriteKBs} KB/s`} />
            <Row label="DISK IO" val={`${sysMetrics.diskIoPct}%`} />
          </div>
        )}

        {/* Timestamp top right */}
        <div style={{ position:"absolute", top:24, right:24, textAlign:"right" }}>
          <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:2 }}>
            {time.toISOString().replace("T"," ").slice(0,19)} UTC
          </div>
        </div>
      </div>

      {/* RIGHT — Market panel */}
      <div style={{ width:320, height:"100vh", display:"flex", flexDirection:"column", background:"rgba(8,8,8,0.95)", borderLeft:"1px solid rgba(255,255,255,0.08)", backdropFilter:"blur(20px)" }}>
        <div style={{ padding:"18px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ color:"rgba(255,255,255,0.3)", fontSize:8, letterSpacing:4 }}>TICK STREAM FEED</div>
            <div style={{ color:"rgba(255,255,255,0.9)", fontSize:12, letterSpacing:3, marginTop:3 }}>BINANCE</div>
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
              const p: Trade | undefined = prices[sym];
              const isUp = (p?.change ?? 0) > 0;
              return (
                <div key={sym} style={{ border:"1px solid rgba(255,255,255,0.06)", padding:"6px 10px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ color:"rgba(255,255,255,0.4)", fontSize:9, letterSpacing:1 }}>{sym}</span>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ color: p ? (isUp ? "#fff" : "rgba(255,255,255,0.5)") : "rgba(255,255,255,0.2)", fontSize:10, fontWeight:"bold" }}>
                      {p ? (p.price < 1 ? p.price.toFixed(4) : p.price.toLocaleString()) : "—"}
                    </div>
                    {p && <div style={{ color: isUp ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)", fontSize:8 }}>{isUp ? "▲" : "▼"} {Math.abs(p.change).toFixed(2)}%</div>}
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
              <div key={`${t.ts}-${i}`} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"3px 8px", borderLeft:`2px solid rgba(255,255,255,${t.side==="buy" ? 0.4 : 0.12})`, opacity: Math.max(0.1, 1 - i * 0.022) }}>
                <span style={{ color:"rgba(255,255,255,0.5)", fontSize:9, width:45 }}>{t.symbol}</span>
                <span style={{ color:`rgba(255,255,255,${t.side==="buy"?0.8:0.3})`, fontSize:9, width:24 }}>{t.side==="buy"?"B":"S"}</span>
                <span style={{ color:"rgba(255,255,255,0.8)", fontSize:9, fontWeight:"bold", textAlign:"right", flex:1 }}>{t.price < 1 ? t.price.toFixed(4) : t.price.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding:"10px 20px", borderTop:"1px solid rgba(255,255,255,0.06)", display:"flex", justifyContent:"space-between" }}>
          <span style={{ color:"rgba(255,255,255,0.2)", fontSize:8, letterSpacing:2 }}>430 PAIRS</span>
          <span style={{ color:"rgba(0,255,136,0.4)", fontSize:8, letterSpacing:2 }}>{earthquakes.length} SEISMIC</span>
        </div>
      </div>
    </div>
  );
}
