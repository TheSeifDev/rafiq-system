'use client';

import { Lock, Shield, Key, Eye, Wifi, Database, AlertTriangle, CheckCircle } from 'lucide-react';
import SectionHeader from '@/src/features/rafiq/shared/components/SectionHeader';
import ArchCard from '@/src/features/rafiq/shared/components/ArchCard';
import InfraPanel from '@/src/features/rafiq/shared/components/InfraPanel';
import DataTable from '@/src/features/rafiq/shared/components/DataTable';
import CodeBlock from '@/src/features/rafiq/shared/components/CodeBlock';

const SECURITY_CONTROLS = [
  { layer: 'REST API',     control: 'JWT Authentication',     impl: 'RS256, 15min access + 7d refresh',    strength: 'High'     },
  { layer: 'REST API',     control: 'Rate Limiting',           impl: '100 req/min per IP, burst 20',         strength: 'Medium'   },
  { layer: 'REST API',     control: 'Input Validation',        impl: 'Pydantic schemas, strict typing',      strength: 'High'     },
  { layer: 'REST API',     control: 'CORS Policy',             impl: 'Allowlist: localhost + mobile app',    strength: 'High'     },
  { layer: 'MQTT',         control: 'TLS 1.3',                 impl: 'Client certificates, CA pinning',      strength: 'High'     },
  { layer: 'MQTT',         control: 'ACL Authorization',       impl: 'Per-client topic allowlist',           strength: 'High'     },
  { layer: 'WebSocket',    control: 'JWT Upgrade Validation',  impl: 'Token checked on HTTP→WS upgrade',     strength: 'High'     },
  { layer: 'Data at Rest', control: 'SQLite Encryption',       impl: 'SQLCipher AES-256 (planned: v2.2)',    strength: 'Planned'  },
  { layer: 'Data at Rest', control: 'Supabase RLS',            impl: 'Row-Level Security on all tables',     strength: 'High'     },
  { layer: 'Network',      control: 'TLS for all sync',        impl: 'TLS 1.3 on Supabase, MQTT, HA API',   strength: 'High'     },
  { layer: 'Device',       control: 'Device Fingerprint',      impl: 'MAC + firmware hash for BLE pairing', strength: 'Medium'   },
  { layer: 'Emergency',    control: 'Fail-Secure Bypass',      impl: 'Auth bypassed on /emergency/* routes', strength: 'By-Design'},
];

const THREAT_MODEL = [
  { threat: 'Unauthorized API Access',    likelihood: 'Medium', mitigation: 'JWT RS256, rate limiting, input validation',   risk: 'Low'    },
  { threat: 'MQTT Topic Spoofing',         likelihood: 'Low',    mitigation: 'Client certificates, TLS 1.3, ACL policy',    risk: 'Low'    },
  { threat: 'Local SQLite Theft',          likelihood: 'Low',    mitigation: 'SQLCipher (planned), full-disk encryption',   risk: 'Medium' },
  { threat: 'Cloud Data Exfiltration',     likelihood: 'Low',    mitigation: 'Supabase RLS, encrypted transit',             risk: 'Low'    },
  { threat: 'BLE Spoofing (Wearable)',     likelihood: 'Low',    mitigation: 'Device fingerprint, pairing ceremony',        risk: 'Low'    },
  { threat: 'Emergency Override Abuse',    likelihood: 'Very Low','mitigation': 'Network isolation, alert on emergency use', risk: 'Low'    },
  { threat: 'Secrets in Source Code',      likelihood: 'Low',    mitigation: 'Env vars, .env file, no code commits',        risk: 'Low'    },
];

const JWT_MIDDLEWARE = `# FastAPI JWT validation middleware
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
import jwt

security = HTTPBearer()

async def get_current_user(token = Depends(security)):
    try:
        payload = jwt.decode(
            token.credentials,
            settings.JWT_PUBLIC_KEY,
            algorithms=["RS256"],
            options={"verify_exp": True}
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Emergency bypass — safety > security
async def get_user_or_emergency(request: Request, token = Depends(security)):
    if request.url.path.startswith("/api/v1/emergency"):
        # Allow local network requests without auth
        if request.client.host in settings.LOCAL_SUBNET:
            return {"role": "emergency_bypass"}
    return await get_current_user(token)`;

const MQTT_TLS = `# Mosquitto TLS configuration
# /etc/mosquitto/conf.d/rafiq.conf

listener 1883 localhost          # Plain — local only
listener 8883                    # TLS — external clients
cafile   /certs/ca.crt
certfile /certs/server.crt
keyfile  /certs/server.key
tls_version tlsv1.3
require_certificate true         # Client certs required

# ACL file
acl_file /etc/mosquitto/acl

# acl (per-client topic allowlist)
user wearable-001
topic read rafiq/wearable/watch-001/#
topic write rafiq/wearable/watch-001/#

user rafiq-core
topic readwrite rafiq/#`;

const STRENGTH_COLOR: Record<string, string> = {
  High:       'text-emerald-400/80',
  Medium:     'text-amber-400/80',
  Low:        'text-white/40',
  Planned:    'text-blue-400/70',
  'By-Design':'text-[#FF3B3B]/70',
};

const RISK_COLOR: Record<string, string> = {
  Low:    'text-emerald-400/80',
  Medium: 'text-amber-400/80',
  High:   'text-[#FF3B3B]/80',
};

export default function SecurityPage() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-10">

        <SectionHeader
          eyebrow="Security Layer"
          title="Security Architecture"
          description="Multi-layer security designed for a medical edge system where safety is paramount. One critical design decision: emergency routes bypass authentication to guarantee life-safety actions are never blocked by auth failures."
          status="online"
          layer="Security Layer"
          version="v2.1"
          metrics={[
            { label: 'Encryption', value: 'AES-256' },
            { label: 'JWT Alg.', value: 'RS256' },
            { label: 'TLS', value: '1.3' },
          ]}
        />

        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: <Key size={15} strokeWidth={1.5} />, title: 'JWT Engine', sublabel: 'RS256 · 15min access · 7d refresh', description: 'RSA-256 signed JWTs for all API access. Short-lived access tokens prevent replay attacks. Refresh tokens rotated on use.', status: 'online' as const, accent: 'red' as const },
            { icon: <Wifi size={15} strokeWidth={1.5} />, title: 'TLS Layer', sublabel: 'TLS 1.3 · Client certificates', description: 'All external connections encrypted with TLS 1.3. MQTT requires client certificates. Supabase and HA API over HTTPS.', status: 'online' as const, accent: 'blue' as const },
            { icon: <Lock size={15} strokeWidth={1.5} />, title: 'MQTT ACL', sublabel: 'Per-client topic policy', description: 'Mosquitto ACL file restricts each client to specific topic patterns. Wearable can only publish to its own device subtree.', status: 'online' as const, accent: 'red' as const },
            { icon: <Database size={15} strokeWidth={1.5} />, title: 'Supabase RLS', sublabel: 'Row-Level Security · PostgreSQL', description: 'All Supabase tables have RLS policies. Data is only accessible to the authenticated patient owner or admin role.', status: 'online' as const, accent: 'blue' as const },
            { icon: <Shield size={15} strokeWidth={1.5} />, title: 'Device Trust', sublabel: 'BLE fingerprint · MAC binding', description: 'Wearable pairing requires physical proximity ceremony. MAC address + firmware hash bound to patient record.', status: 'online' as const, accent: 'red' as const },
            { icon: <AlertTriangle size={15} strokeWidth={1.5} />, title: 'Fail-Secure Bypass', sublabel: 'Safety overrides auth', description: 'Emergency API routes accept unauthenticated requests from local subnet. Safety is non-negotiable — auth is not.', status: 'active' as const, accent: 'blue' as const },
          ].map((card, i) => <ArchCard key={card.title} {...card} delay={i * 0.05} />)}
        </div>

        
        <InfraPanel title="Authentication Flow" subtitle="Device → JWT → API → Resource" glow="red">
          <div className="overflow-x-auto p-5">
            <div className="flex min-w-max items-center gap-1.5">
              {[
                { label: 'Client', sub: 'Mobile / API' },
                { label: '→' },
                { label: 'POST /auth/token', sub: 'credentials' },
                { label: '→' },
                { label: 'JWT Issuer', sub: 'RS256 sign' },
                { label: '→' },
                { label: 'Access Token', sub: '15min TTL' },
                { label: '→' },
                { label: 'API Call', sub: 'Bearer header' },
                { label: '→' },
                { label: 'Middleware', sub: 'Verify + decode' },
                { label: '→' },
                { label: 'Resource', sub: 'Authorized' },
              ].map((s, i) => (
                <div key={i} className={s.label === '→' ? 'font-mono text-white/20 text-sm px-0.5' : 'rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 font-mono'}>
                  {s.label === '→' ? '→' : (
                    <>
                      <div className="text-[10px] font-bold text-white/60">{s.label}</div>
                      {'sub' in s && <div className="text-[9px] text-white/25">{s.sub}</div>}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </InfraPanel>

        
        <div>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">Security Controls Matrix</h2>
          <DataTable
            columns={[
              { key: 'layer', label: 'Layer' },
              { key: 'control', label: 'Control', className: 'min-w-[180px]' },
              { key: 'impl', label: 'Implementation', className: 'min-w-[240px]' },
              { key: 'strength', label: 'Strength', align: 'center', render: (row) => <span className={STRENGTH_COLOR[String(row.strength)]}>{String(row.strength)}</span> },
            ]}
            data={SECURITY_CONTROLS}
          />
        </div>

        
        <div>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">Threat Model</h2>
          <DataTable
            columns={[
              { key: 'threat', label: 'Threat', className: 'min-w-[200px]' },
              { key: 'likelihood', label: 'Likelihood' },
              { key: 'mitigation', label: 'Mitigation', className: 'min-w-[260px]' },
              { key: 'risk', label: 'Residual Risk', align: 'center', render: (row) => <span className={RISK_COLOR[String(row.risk)]}>{String(row.risk)}</span> },
            ]}
            data={THREAT_MODEL}
          />
        </div>

        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">JWT Middleware</h2>
            <CodeBlock code={JWT_MIDDLEWARE} language="python" title="auth/middleware.py" />
          </div>
          <div>
            <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">MQTT TLS Config</h2>
            <CodeBlock code={MQTT_TLS} language="bash" title="mosquitto/rafiq.conf" />
          </div>
        </div>

      </div>
    </div>
  );
}
