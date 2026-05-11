import React, { useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIStore } from '../../store/aiStore';

/**
 * RAFIQ AI – v4
 * ✅ Neon-ring face exactly like reference
 * ✅ Refined color palette (deep navy / sky-cyan)
 * ✅ Particle waves locked to the very bottom
 */

// ─── Color palette ────────────────────────────────────────────────────────────
const PALETTE = {
  bg:          '#050c1a',
  idle:        '#00b4d8',   // soft sky-cyan
  listening:   '#06d6a0',   // mint-teal
  speaking:    '#06d6a0',
  thinking:    '#4895ef',   // periwinkle-blue
  sleep:       '#2d4263',
  offline:     '#3d5a80',
  warning:     '#f4a261',
  emergency:   '#e63946',
};

const useColor = (s) => useMemo(() => PALETTE[s] ?? PALETTE.idle, [s]);

// ─── Root ─────────────────────────────────────────────────────────────────────
const RAFIQInterface = () => {
  const { aiState, speakingText } = useAIStore();

  return (
    <div style={{ position:'relative', width:'100%', height:'100%',
                  overflow:'hidden', backgroundColor: PALETTE.bg }}>
      <AmbientGlow  aiState={aiState} />
      <Header />
      <FaceScene    aiState={aiState} />
      <SpeakingArea aiState={aiState} speakingText={speakingText} />
      <BottomDots   aiState={aiState} />
      <BottomWaves />
    </div>
  );
};

export default RAFIQInterface;

// ─── Ambient background glow ──────────────────────────────────────────────────
const AmbientGlow = ({ aiState }) => {
  const c = useColor(aiState);
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
      {/* Big centre radial */}
      <motion.div
        style={{
          position:'absolute', borderRadius:'50%',
          width:500, height:500,
          left:'50%', top:'42%',
          marginLeft:-250, marginTop:-250,
          background:`radial-gradient(circle, ${c}18 0%, transparent 65%)`,
          filter:'blur(60px)',
        }}
        animate={{ opacity:[0.55, 1, 0.55], scale:[1, 1.08, 1] }}
        transition={{ duration:4, repeat:Infinity, ease:'easeInOut' }}
      />
      {/* Top vignette tint */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:180,
        background:`radial-gradient(ellipse at 50% 0%, ${c}10 0%, transparent 70%)`,
      }} />
    </div>
  );
};

// ─── Header ───────────────────────────────────────────────────────────────────
const Header = () => (
  <motion.div
    style={{ position:'absolute', top:38, left:0, right:0,
             textAlign:'center', zIndex:20 }}
    initial={{ opacity:0, y:-18 }}
    animate={{ opacity:1, y:0 }}
    transition={{ duration:0.9, ease:'easeOut' }}
  >
    <span style={{
      fontSize:24, fontWeight:700, letterSpacing:7,
      color:'#ffffff', textTransform:'uppercase',
    }}>
      RAFIQ
    </span>
    <span style={{
      fontSize:24, fontWeight:300, letterSpacing:7,
      color:'#00b4d8', marginLeft:6,
    }}>
      AI
    </span>
  </motion.div>
);

// ─── Face scene: orbit rings + neon orb, all centred ─────────────────────────
const ORB_R     = 82;          // orb radius (164px diameter)
const RINGS     = [
  { r: 122, nParticles: 2, speed: 18, dash: false },
  { r: 148, nParticles: 3, speed: 28, dash: false },
  { r: 174, nParticles: 4, speed: 40, dash: true  },
];
const SCENE_R   = RINGS[RINGS.length - 1].r + 18;  // half of scene box
const SCENE_BOX = SCENE_R * 2;

const FaceScene = ({ aiState }) => {
  const c       = useColor(aiState);
  const active  = aiState !== 'sleep' && aiState !== 'offline';
  const speedM  = aiState === 'speaking' || aiState === 'listening' ? 0.5
                : aiState === 'thinking'                            ? 0.65
                : aiState === 'emergency'                           ? 0.3 : 1;

  return (
    <motion.div
      style={{
        position:'absolute', zIndex:10,
        width: SCENE_BOX, height: SCENE_BOX,
        left:'50%', top:'43%',
        marginLeft: -SCENE_R,
        marginTop:  -SCENE_R,
      }}
      initial={{ opacity:0, scale:0.82 }}
      animate={{ opacity:1, scale:1 }}
      transition={{ duration:1.1, delay:0.25, ease:[0.34,1.56,0.64,1] }}
    >
      {/* Orbit rings + particles */}
      {active && RINGS.map((ring, i) => (
        <OrbitRing key={i} ring={ring} color={c} speedMult={speedM} sceneR={SCENE_R} />
      ))}

      {/* Outer diffuse glow */}
      <motion.div
        style={{
          position:'absolute',
          left: SCENE_R - ORB_R - 40, top: SCENE_R - ORB_R - 40,
          width: (ORB_R + 40) * 2, height: (ORB_R + 40) * 2,
          borderRadius:'50%',
          background:`radial-gradient(circle, ${c}22 30%, transparent 70%)`,
          filter:'blur(28px)',
          pointerEvents:'none',
        }}
        animate={{ opacity:[0.5, 1, 0.5], scale:[1, 1.12, 1] }}
        transition={{ duration:3, repeat:Infinity, ease:'easeInOut' }}
      />

      {/* THE ORB */}
      <NeonOrb aiState={aiState} color={c} active={active} />
    </motion.div>
  );
};

// ─── Neon orb ─────────────────────────────────────────────────────────────────
const NeonOrb = ({ aiState, color, active }) => {
  const D = ORB_R * 2;   // diameter

  // Build multi-layer neon box-shadow to replicate the reference glow ring
  const glow = (c) => [
    `0 0 0 2px ${c}`,           // sharp ring
    `0 0 12px 2px ${c}cc`,      // inner bloom
    `0 0 30px 6px ${c}66`,      // mid bloom
    `0 0 60px 12px ${c}33`,     // outer haze
    `inset 0 0 40px 8px ${c}15`,// inner tint
  ].join(', ');

  return (
    <motion.div
      style={{
        position:'absolute',
        left: SCENE_R - ORB_R, top: SCENE_R - ORB_R,
        width: D, height: D,
        borderRadius:'50%',
        /* Dark inner gradient – matches reference */
        background:'radial-gradient(circle at 45% 38%, #0a1f3a 0%, #05101e 55%, #030a14 100%)',
        boxShadow: glow(color),
      }}
      animate={aiState === 'speaking' ? { scale:[1, 1.03, 1] } : {}}
      transition={{ duration:0.3, repeat: aiState === 'speaking' ? Infinity : 0 }}
    >
      {/* Fine specular */}
      <div style={{
        position:'absolute', borderRadius:'50%',
        width:'22%', height:'11%', top:'14%', left:'18%',
        background:'linear-gradient(135deg, rgba(255,255,255,0.38) 0%, transparent 100%)',
        filter:'blur(3px)', pointerEvents:'none',
      }} />

      <FaceFeatures aiState={aiState} color={color} active={active} />
    </motion.div>
  );
};

// ─── Face features (eyes + mouth) ────────────────────────────────────────────
const FaceFeatures = ({ aiState, color, active }) => {
  const talking = aiState === 'speaking' || aiState === 'listening';
  const D       = ORB_R * 2;

  // Eyes – white discs with glow
  const EYE_SIZE  = 11;
  const EYE_GAPX  = 26;   // distance from centre to each eye
  const EYE_Y     = D * 0.38;

  // Mouth origin
  const MOUTH_Y   = D * 0.61;

  return (
    <div style={{ position:'absolute', inset:0 }}>

      {/* ── Eyes ─────────────────────────────── */}
      {[-1, 1].map(side => (
        <motion.div
          key={side}
          style={{
            position:'absolute',
            width: EYE_SIZE, height: EYE_SIZE,
            borderRadius:'50%',
            backgroundColor: active ? '#ffffff' : '#3d5a7a',
            boxShadow: active
              ? `0 0 8px #ffffff, 0 0 16px ${color}90`
              : 'none',
            left: D / 2 + side * EYE_GAPX - EYE_SIZE / 2,
            top:  EYE_Y - EYE_SIZE / 2,
          }}
          animate={
            aiState === 'listening' ? { scaleY:[1, 0.06, 1], scaleX:[1, 1.4, 1] }
          : aiState === 'thinking'  ? { opacity:[1, 0.4, 1] }
          : {}
          }
          transition={{
            duration: aiState === 'listening' ? 0.16 : 1.8,
            repeat:(aiState === 'listening' || aiState === 'thinking') ? Infinity : 0,
            delay: side === 1 ? 0.05 : 0,
          }}
        />
      ))}

      {/* ── Mouth ────────────────────────────── */}
      <div style={{
        position:'absolute',
        left: D / 2, top: MOUTH_Y,
        transform:'translate(-50%, -50%)',
      }}>
        <AnimatePresence mode="wait">
          {talking ? (
            /* Open oval when speaking/listening */
            <motion.div
              key="open"
              style={{
                width:24, height:15, borderRadius:'50%',
                backgroundColor: color,
                boxShadow:`0 0 14px ${color}`,
                opacity:0.9,
              }}
              animate={{ height:[15, 23, 15], opacity:[0.8, 1, 0.8] }}
              transition={{ duration:0.2, repeat:Infinity }}
              initial={{ opacity:0, scale:0.4 }}
              exit={{ opacity:0, scale:0.4 }}
            />
          ) : (
            /* Curved smile */
            <motion.div key="smile" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
              <svg width="48" height="18" viewBox="0 0 48 18" overflow="visible">
                <motion.path
                  d="M 4 4 Q 24 18 44 4"
                  fill="none"
                  stroke={active ? '#ffffff' : '#3d5a7a'}
                  strokeWidth={active ? 2.5 : 1.8}
                  strokeLinecap="round"
                  style={{ filter: active ? `drop-shadow(0 0 5px ${color})` : 'none' }}
                  animate={
                    aiState === 'thinking'
                      ? { d:['M 4 4 Q 24 18 44 4','M 4 4 Q 24 22 44 4','M 4 4 Q 24 18 44 4'] }
                      : {}
                  }
                  transition={{ duration:2, repeat: aiState === 'thinking' ? Infinity : 0 }}
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};

// ─── Orbit ring with orbiting particles ───────────────────────────────────────
const OrbitRing = ({ ring, color, speedMult, sceneR }) => {
  const dur  = ring.speed / speedMult;
  const { r, nParticles, dash } = ring;

  const angles = useMemo(
    () => Array.from({ length: nParticles }, (_, i) => (360 / nParticles) * i + 20),
    [nParticles]
  );

  return (
    /* Spinning container → ring + particles orbit for free */
    <motion.div
      style={{
        position:'absolute',
        left: sceneR - r, top: sceneR - r,
        width: r * 2, height: r * 2,
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: dur, repeat:Infinity, ease:'linear' }}
    >
      {/* Ring border */}
      <div style={{
        position:'absolute', inset:0,
        borderRadius:'50%',
        border: dash
          ? `0.5px dashed ${color}28`
          : `0.7px solid  ${color}${toHex(0.22)}`,
      }} />

      {/* Glowing particles on the ring */}
      {angles.map((deg, i) => {
        const rad = deg * Math.PI / 180;
        const cx  = r + Math.cos(rad) * r;
        const cy  = r + Math.sin(rad) * r;
        const sz  = ring === RINGS[0] ? 5 : ring === RINGS[1] ? 4 : 3.5;

        return (
          <motion.div
            key={i}
            style={{
              position:'absolute',
              left: cx - sz / 2, top: cy - sz / 2,
              width: sz, height: sz,
              borderRadius:'50%',
              backgroundColor: color,
              boxShadow:`0 0 6px ${color}, 0 0 12px ${color}80`,
            }}
            animate={{ opacity:[0.45, 1, 0.45] }}
            transition={{ duration:1.6, repeat:Infinity,
                          delay: i * 0.35, ease:'easeInOut' }}
          />
        );
      })}
    </motion.div>
  );
};

// ─── Speaking area ────────────────────────────────────────────────────────────
const SpeakingArea = ({ aiState, speakingText }) => {
  const isSpeaking = aiState === 'speaking' && speakingText;
  return (
    <div style={{
      position:'absolute', top:'73%',
      left:28, right:28, textAlign:'center', zIndex:10,
    }}>
      <AnimatePresence mode="wait">
        {isSpeaking ? (
          <motion.p key="sp"
            style={{ fontSize:16, color:'#ffffff', margin:0, lineHeight:1.55,
                     textShadow:'0 0 18px rgba(0,180,216,0.6)' }}
            initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-8 }} transition={{ duration:0.28 }}
          >
            {speakingText}
          </motion.p>
        ) : (
          <motion.p key="id"
            style={{ fontSize:16, color:'rgba(255,255,255,0.58)', margin:0 }}
            initial={{ opacity:0 }} animate={{ opacity:1 }}
            exit={{ opacity:0 }} transition={{ duration:0.45 }}
          >
            How can I{' '}
            <span style={{ color:'#00b4d8', fontWeight:500 }}>assist</span>
            {' '}you today?
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Thinking dots (ONLY visible during thinking state) ──────────────────────
const BottomDots = ({ aiState }) => {
  const isThinking = aiState === 'thinking';

  return (
    <AnimatePresence>
      {isThinking && (
        <motion.div
          style={{
            position:'absolute', bottom:'18%',
            left:0, right:0, zIndex:10,
            display:'flex', justifyContent:'center', gap:10,
          }}
          initial={{ opacity:0, y:10 }}
          animate={{ opacity:1, y:0 }}
          exit={{ opacity:0, y:10 }}
          transition={{ duration:0.3 }}
        >
          {[0,1,2].map(i => (
            <motion.div
              key={i}
              style={{
                width: 8, height: 8,
                borderRadius:'50%',
                backgroundColor: '#4895ef',
                boxShadow: '0 0 8px #4895ef, 0 0 16px rgba(72,149,239,0.5)',
              }}
              animate={{
                opacity:[0.3, 1, 0.3],
                scale:[0.8, 1.3, 0.8],
              }}
              transition={{
                duration:0.7,
                repeat:Infinity,
                delay: i * 0.12,
                ease:'easeInOut'
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Bottom waves (canvas, locked to very bottom) ────────────────────────────
const BottomWaves = () => {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let t = 0;

    const setSize = () => {
      canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    setSize();
    window.addEventListener('resize', setSize);

    /*
      Two main waves (like the reference image):
        Wave A – higher, brighter, thinner
        Wave B – lower, dimmer, broader
      Both carry a field of small glowing particles.
    */
    const WAVES = [
      { yFrac:0.28, amp:28, freq:1.6,  spd:0.55, rgb:'0,180,216', lineA:0.5,  fillA:0.10 },
      { yFrac:0.52, amp:20, freq:2.1,  spd:0.80, rgb:'0,140,190', lineA:0.30, fillA:0.06 },
      { yFrac:0.72, amp:13, freq:1.35, spd:0.45, rgb:'0,100,170', lineA:0.18, fillA:0.04 },
    ];

    // Pre-build particles per wave
    const PARTS = WAVES.flatMap((w, wi) =>
      Array.from({ length: 70 }, (_, i) => ({
        xN:     i / 70,
        phase:  Math.random() * Math.PI * 2,
        drift:  0.0012 + Math.random() * 0.0025,
        sz:     0.7 + Math.random() * 2.2,
        bright: 0.35 + Math.random() * 0.65,
        wi,
      }))
    );

    const wY = (w, x, T) =>
      Math.sin(x * w.freq * 0.01 + T * w.spd)        * w.amp +
      Math.sin(x * w.freq * 0.007 + T * w.spd * 1.4) * w.amp * 0.35;

    const draw = () => {
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);

      WAVES.forEach(w => {
        const by = H * w.yFrac;

        // Filled body below wave
        ctx.beginPath();
        for (let x=0; x<=W; x+=3) {
          const y = by + wY(w, x, t);
          x===0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
        const gd = ctx.createLinearGradient(0, by - w.amp, 0, H);
        gd.addColorStop(0, `rgba(${w.rgb}, ${w.fillA})`);
        gd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gd; ctx.fill();

        // Bright wave line
        ctx.beginPath();
        for (let x=0; x<=W; x+=3) {
          const y = by + wY(w, x, t);
          x===0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${w.rgb}, ${w.lineA})`;
        ctx.lineWidth = 1.5; ctx.stroke();

        // Glow halo on line
        ctx.lineWidth = 5;
        ctx.strokeStyle = `rgba(${w.rgb}, ${w.lineA * 0.2})`;
        ctx.stroke();
      });

      // Particles
      PARTS.forEach(p => {
        const w   = WAVES[p.wi];
        const by  = canvas.offsetHeight * w.yFrac;
        const rx  = ((p.xN + t * p.drift) % 1) * W;
        const ry  = by + wY(w, rx, t);
        const al  = p.bright * (0.38 + 0.62 * Math.sin(t * 2.2 + p.phase));

        ctx.beginPath(); ctx.arc(rx, ry, p.sz, 0, Math.PI*2);
        ctx.fillStyle = `rgba(${w.rgb}, ${al})`; ctx.fill();

        if (p.sz > 1.4) {
          const h = ctx.createRadialGradient(rx, ry, 0, rx, ry, p.sz * 5.5);
          h.addColorStop(0, `rgba(${w.rgb}, ${al * 0.5})`);
          h.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.beginPath(); ctx.arc(rx, ry, p.sz * 5.5, 0, Math.PI*2);
          ctx.fillStyle = h; ctx.fill();
        }
      });

      t += 0.016;
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener('resize', setSize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:'absolute',
        /* Only occupies the bottom 30% – waves are right at the bottom */
        bottom:0, left:0, right:0,
        height:'30%', width:'100%',
        pointerEvents:'none',
        opacity:0.88,
      }}
    />
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toHex = (o) => Math.round(o * 255).toString(16).padStart(2, '0');