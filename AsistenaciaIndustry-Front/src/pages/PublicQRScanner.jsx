import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../services/apiService';
import { logoBase64 } from '../assets/logoBase64.js';

/* ── Google Fonts ── */
if (!document.getElementById('inter-font')) {
  const lk = document.createElement('link');
  lk.id = 'inter-font'; lk.rel = 'stylesheet';
  lk.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap';
  document.head.appendChild(lk);
}

const F = "'Inter','Helvetica Neue',Arial,sans-serif";

/*
  ══════════════════════════════════════════════════════════════════
  ESTRATEGIA: La tarjeta tiene dimensiones fijas 1076 × 636 px.
  El contenedor externo la escala con transform: scale() para que
  quepa en cualquier pantalla sin reorganizar nada.
  Todos los px son absolutos y exactos → idéntico a la referencia.
  ══════════════════════════════════════════════════════════════════
*/
const CARD_W = 1076;
const CARD_H = 636;

/* ── Hook para calcular el scale factor ── */
function useCardScale(padding = 64) {
  const [scale, setScale] = useState(1);
  const measure = useCallback(() => {
    const maxW = window.innerWidth  - padding;
    const maxH = window.innerHeight - padding;
    setScale(Math.min(maxW / CARD_W, maxH / CARD_H, 1));
  }, [padding]);
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);
  return scale;
}

/* ══════════════════════════════════════════════════════════════════
   AccessCard — dimensiones fijas 1076 × 636 px, escala externa
   ══════════════════════════════════════════════════════════════════ */
function AccessCard({
  currentTime = '', logoUrl = '',
  headerBrandText = null,
  title = '',
  showClock = true, showLogo = true,
  status = null, statusColor = '#3D9B35',
  personName = null,
  eventName = null, entryTime = null,
  g1 = '#FF7600', g2 = '#F94810', g3 = '#EE291B',
  cardBg = '#F7F4FA',
  textMain = '#29282D', textSub = '#45424A',
  d1 = '#FF7A17', d2 = '#FF5612', d3 = '#F64713',
  d4 = '#E82C18', d5 = '#D42417',
}) {
  const hasResult = status !== null;
  const HDR = 153; // altura encabezado en px

  const brandTextToDisplay = headerBrandText ? String(headerBrandText).trim() : '';

  return (
    <div style={{
      position:     'relative',
      width:        `${CARD_W}px`,
      height:       `${CARD_H}px`,
      borderRadius: '54px',
      overflow:     'hidden',
      fontFamily:   F,
      background:   cardBg,
      boxShadow:    '0 28px 70px rgba(50,15,0,.22), 0 8px 28px rgba(50,15,0,.12)',
      flexShrink:   0,
    }}>

      {/* ══ SVG: gradiente encabezado + figuras decorativas ══ */}
      <svg
        viewBox={`0 0 ${CARD_W} ${CARD_H}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', display:'block' }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="hG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor={g1}/>
            <stop offset="50%"  stopColor={g2}/>
            <stop offset="100%" stopColor={g3}/>
          </linearGradient>
        </defs>

        {/* ── Encabezado: esquinas superiores redondeadas, borde inferior recto ── */}
        <path fill="url(#hG)"
          d={`M54,0 L${CARD_W-54},0 Q${CARD_W},0 ${CARD_W},54
              L${CARD_W},${HDR} L0,${HDR} L0,54 Q0,0 54,0 Z`}/>

        {/* ══ FIGURA IZQUIERDA: 5 bandas curvas concéntricas ══ */}
        <path fill={d4} d={`M0,${HDR} C95,${HDR+10} 178,${HDR+127} 190,${HDR+247} C198,${HDR+337} 160,${HDR+412} 60,${CARD_H} L0,${CARD_H} Z`}/>
        <path fill={d3} d={`M0,${HDR} C72,${HDR+8}  138,${HDR+112} 148,${HDR+222} C156,${HDR+307} 122,${HDR+382} 30,${CARD_H} L0,${CARD_H} Z`}/>
        <path fill={d2} d={`M0,${HDR} C50,${HDR+6}  98,${HDR+95}  105,${HDR+195} C112,${HDR+277} 84,${HDR+349}  8,${CARD_H}  L0,${CARD_H} Z`}/>
        <path fill={d1} d={`M0,${HDR} C30,${HDR+4}  62,${HDR+77}  66,${HDR+167}  C70,${HDR+243} 50,${HDR+309}  0,${CARD_H-66} L0,${CARD_H} Z`}/>
        <path fill={d1} fillOpacity=".42"
              d={`M0,${HDR} C15,${HDR+3}  30,${HDR+56}  32,${HDR+132} C34,${HDR+203} 22,${HDR+258}  0,${CARD_H-142} L0,${CARD_H} Z`}/>

        {/* ══ FIGURA DERECHA: 5 bandas diagonales ascendentes ══ */}
        <path fill={d4} d={`M${CARD_W},248 C${CARD_W-80},318  ${CARD_W-180},400 ${CARD_W-258},${CARD_H} L${CARD_W},${CARD_H} Z`}/>
        <path fill={d3} d={`M${CARD_W},292 C${CARD_W-72},358  ${CARD_W-162},432 ${CARD_W-228},${CARD_H} L${CARD_W},${CARD_H} Z`}/>
        <path fill={d2} d={`M${CARD_W},334 C${CARD_W-64},390  ${CARD_W-142},464 ${CARD_W-198},${CARD_H} L${CARD_W},${CARD_H} Z`}/>
        <path fill={d1} d={`M${CARD_W},374 C${CARD_W-56},426  ${CARD_W-122},500 ${CARD_W-168},${CARD_H} L${CARD_W},${CARD_H} Z`}/>
        <path fill={d1} fillOpacity=".42"
              d={`M${CARD_W},412 C${CARD_W-48},460  ${CARD_W-102},530 ${CARD_W-138},${CARD_H} L${CARD_W},${CARD_H} Z`}/>
      </svg>

      {/* ══ ENCABEZADO HTML ══ */}
      <div style={{
        position:       'absolute',
        top: 0, left: 0, right: 0,
        height:         `${HDR}px`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '0 72px 0 120px',
        boxSizing:      'border-box',
        zIndex:         2,
      }}>
        {/* Reloj */}
        {showClock ? (
          <div style={{
            fontSize:      '78px',
            fontWeight:    700,
            color:         '#FFFFFF',
            letterSpacing: '-1.5px',
            lineHeight:    1,
            whiteSpace:    'nowrap',
            fontFamily:    F,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {currentTime}
          </div>
        ) : <div />}

        {/* Logo + Marca */}
        {showLogo && (
          <div style={{ display:'flex', alignItems:'center', gap:'18px', flexShrink:0 }}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="logo"
                style={{
                  maxHeight:'68px', maxWidth:'240px', height:'auto', width:'auto', objectFit:'contain', flexShrink:0, display:'block'
                }}
                onError={(e) => {
                  if (e.target.src !== logoBase64) {
                    e.target.src = logoBase64;
                  }
                }}
              />
            ) : null}
            {brandTextToDisplay ? (
              <div style={{ fontSize:'52px', lineHeight:1, color:'#FFFFFF',
                            whiteSpace:'nowrap', letterSpacing:'-0.5px', fontFamily:F }}>
                <span style={{ fontWeight:700 }}>{brandTextToDisplay}</span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ══ CUERPO CENTRAL HTML ══ */}
      <div style={{
        position:       'absolute',
        top:            `${HDR}px`,
        left:           '270px',
        right:          '215px',
        bottom:         0,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        textAlign:      'center',
        zIndex:         2,
        fontFamily:     F,
      }}>

        {!hasResult ? (
          <>
            {title ? (
              <div style={{ fontSize:'38px', fontWeight:400, color:textMain, lineHeight:1.3, marginBottom:'16px' }}>
                {title}
              </div>
            ) : null}
            <div style={{ fontSize:'24px', fontWeight:500, color:textSub, opacity:.5, lineHeight:1.3 }}>
              Listo para escanear
            </div>
          </>
        ) : (
          <>
            {/* 1. Título */}
            {title ? (
              <div style={{ fontSize:'40px', fontWeight:400, color:textMain, lineHeight:1.25, marginBottom:'4px' }}>
                {title}
              </div>
            ) : null}

            {/* 2. Estado */}
            <div style={{ fontSize:'31px', fontWeight:500, color:statusColor, lineHeight:1.25, marginBottom:'16px' }}>
              {status}
            </div>

            {/* 3. Nombre */}
            {personName && (
              <div style={{ fontSize:'44px', fontWeight:800, color:textMain,
                            lineHeight:1.15, letterSpacing:'-1px', marginBottom:'12px' }}>
                {personName}
              </div>
            )}

            {/* 5. Evento */}
            {eventName && (
              <div style={{ fontSize:'30px', fontWeight:600, color:textMain,
                            lineHeight:1.3, letterSpacing:'.3px', marginBottom:'20px' }}>
                {eventName}
              </div>
            )}

            {/* 6. Hora de ingreso */}
            {entryTime && (
              <div style={{
                display:'inline-flex', alignItems:'center',
                padding:'10px 36px', borderRadius:'999px',
                background:'rgba(255,255,255,.72)',
                border:'1.5px solid rgba(255,255,255,.90)',
                boxShadow:'0 2px 12px rgba(0,0,0,.06)',
                fontSize:'27px', fontWeight:500, color:textSub, whiteSpace:'nowrap',
              }}>
                {entryTime}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PublicQRScanner — lógica de evento y escaneo
   ══════════════════════════════════════════════════════════════════ */
export default function PublicQRScanner({ eventId: propEventId }) {
  const pathParts = window.location.pathname.split('/');
  const eventId   = propEventId || pathParts[pathParts.length - 1];

  const [eventData,   setEventData]   = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [qrInput,     setQrInput]     = useState('');
  const [processing,  setProcessing]  = useState(false);
  const [scanResult,  setScanResult]  = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const inputRef = useRef(null);

  /* Escala responsive */
  const scale = useCardScale(48);

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    api.public.getEvent(eventId)
      .then(r => { if (r.success) setEventData(r.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => {
    const f = () => inputRef.current?.focus();
    f(); const id = setInterval(f, 800); return () => clearInterval(id);
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!qrInput.trim() || processing || !eventId) return;
    const code = qrInput.trim();
    setQrInput(''); setProcessing(true);
    try {
      const result = await api.public.checkIn(eventId, code);
      if (!result.success && result.status_code === 'NOT_STARTED') {
         setScanResult(result);
      } else if (!result.success) {
         setScanResult({ success: false, status_code: result.status_code || 'INVALID', message: result.message || result.error || 'Código inválido' });
      } else {
         setScanResult(result);
      }
    } catch (err) {
      const msg = err.message || '';
      const isEarly = msg.includes('aún no ha iniciado') || msg.includes('programado para iniciar');
      setScanResult({ success:false, status_code: isEarly ? 'NOT_STARTED' : 'INVALID', message: msg });
    } finally {
      setProcessing(false); inputRef.current?.focus();
    }
  };

  if (loading) return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'#FBF8FD', fontFamily:F, fontSize:'1.1rem', fontWeight:600, color:'#29282D',
    }}>
      Cargando Control de Acceso…
    </div>
  );

  const cfg = eventData?.form_config || {};
  const sty = cfg.styling            || {};
  const HORA = currentTime.toLocaleTimeString('es-GT', { hour12: false });

  const ok   = !!scanResult;
  const win  = scanResult?.status_code === 'SUCCESS';
  const used = scanResult?.status_code === 'ALREADY_USED';
  const notStarted = scanResult?.status_code === 'NOT_STARTED';
  const wrongEvent = scanResult?.status_code === 'WRONG_EVENT';

  const STATUS_TEXT = ok
    ? (win  ? (cfg.status_label_success      || 'Entrada registrada')
    : used   ? (cfg.status_label_already_used || 'Entrada ya registrada')
    : notStarted ? 'Evento no iniciado'
    : wrongEvent ? 'Código de otro evento'
             : (cfg.status_label_invalid      || 'Código no válido'))
    : null;

  const STATUS_COLOR = ok
    ? (win ? (sty.status_color || '#3D9B35') : used ? '#D97706' : notStarted ? '#D97706' : wrongEvent ? '#D97706' : '#DC2626')
    : '#3D9B35';

  const NOMBRE = ok
    ? (scanResult.data?.full_name
       || `${scanResult.data?.first_name||''} ${scanResult.data?.last_name||''}`.trim() || null)
    : null;


  const fmtH = (iso) => {
    try { 
      const cleanIso = iso ? iso.split('.')[0].replace('Z', '').split('+')[0].replace(/-/g, '/').replace('T', ' ') : '';
      return new Date(cleanIso).toLocaleTimeString('es-GT',{hour:'2-digit',minute:'2-digit',hour12:false}); 
    }
    catch { return ''; }
  };

  const HORA_INGRESO = ok && win && scanResult.data?.check_in_time
    ? `Ingreso a las ${fmtH(scanResult.data.check_in_time)}` : null;

  const EVENTO = ok
    ? (cfg.event_tagline || (eventData?.name ? `${eventData.name}` : ''))
    : null;

  const resolveMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const apiBase = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' && window.location.port !== '5001'
      ? 'http://localhost:5001/api'
      : '/api');
    
    const serverHost = apiBase.startsWith('http') ? new URL(apiBase).origin : '';
    return `${serverHost}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const BG_VIDEO = sty.bg_video_url || '';
  const BG_IMAGE = sty.bg_image_url || '';
  const resolvedVideoUrl = resolveMediaUrl(BG_VIDEO);
  const resolvedImageUrl = resolveMediaUrl(BG_IMAGE);

  return (
    <div style={{
      position:   'relative',
      width:      '100vw',
      height:     '100vh',
      display:    'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: sty.background_color || '#FBF8FD',
      overflow:   'hidden',
    }}>
      {/* ── Foto de fondo (si está configurada y no hay video) ── */}
      {BG_IMAGE && !BG_VIDEO && (
        <div style={{
          position:           'absolute',
          inset:              0,
          backgroundImage:    `url(${resolvedImageUrl})`,
          backgroundSize:     'cover',
          backgroundPosition: 'center',
          zIndex:             0,
        }} />
      )}

      {/* ── Video de fondo (si está configurado) ── */}
      {BG_VIDEO && (
        <video
          key={resolvedVideoUrl}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          style={{
            position:   'absolute',
            inset:      0,
            width:      '100%',
            height:     '100%',
            objectFit:  'cover',
            zIndex:     0,
          }}
          src={resolvedVideoUrl}
        />
      )}

      {/* ── Overlay semitransparente sobre el video / imagen ── */}
      {(BG_VIDEO || BG_IMAGE) && (
        <div style={{
          position:        'absolute',
          inset:           0,
          backgroundColor: sty.bg_overlay_color || 'rgba(0,0,0,0.25)',
          zIndex:          1,
        }}/>
      )}

      {/* Lector USB invisible */}
      <form onSubmit={handleSubmit}
            style={{position:'absolute',opacity:0,pointerEvents:'none',zIndex:-1}}>
        <input ref={inputRef} value={qrInput}
               onChange={e => setQrInput(e.target.value)} autoFocus/>
      </form>

      {/* ── Tarjeta escalada ── */}
      <div style={{
        position:        'relative',
        zIndex:          2,
        transform:       `scale(${scale})`,
        transformOrigin: 'top left',
        top:             `${-(CARD_H * (1 - scale)) / 2}px`,
        left:            `${-(CARD_W * (1 - scale)) / 2}px`,
      }}>
        <AccessCard
          currentTime     = {HORA}
          logoUrl         = {resolveMediaUrl(cfg.header_logo_url || eventData?.logo_url || '')}
          headerBrandText = {cfg.header_brand_text}
          title           = {cfg.scanner_title !== undefined ? cfg.scanner_title : 'Control de Acceso'}
          showClock       = {cfg.show_clock !== false}
          showLogo        = {cfg.show_logo !== false}
          status          = {STATUS_TEXT}
          statusColor     = {STATUS_COLOR}
          personName      = {NOMBRE}
          eventName       = {EVENTO}
          entryTime       = {HORA_INGRESO}
          g1              = {sty.header_gradient_start  || '#FF7600'}
          g2              = {sty.header_gradient_middle || '#F94810'}
          g3              = {sty.header_gradient_end    || '#EE291B'}
          cardBg          = {sty.card_bg_color          || '#F7F4FA'}
          textMain        = {sty.text_color             || '#29282D'}
          textSub         = {sty.secondary_text_color   || '#45424A'}
          d1              = {sty.decor_1 || '#FF7A17'}
          d2              = {sty.decor_2 || '#FF5612'}
          d3              = {sty.decor_3 || '#F64713'}
          d4              = {sty.decor_4 || '#E82C18'}
          d5              = {sty.decor_5 || '#D42417'}
        />
      </div>
    </div>
  );
}

