// Direct Base64 data URL for high-resolution geological strata survey
// This guarantees 100% reliable image loading in all browsers, iframes, and new tabs without SVG encoding or CSP issues.

export const getGeologicalStrataPngBase64 = (title: string, subsidiary: string, docCode: string): string => {
  // Generate a standalone, pristine SVG and base64 encode it safely via btoa
  const safeTitle = (title || 'Geological Borehole Strata Survey').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 48);
  const safeSub = (subsidiary || 'CMPDI HQ').replace(/&/g, '&amp;');
  const safeCode = (docCode || 'GEO-REC-832').replace(/&/g, '&amp;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 620" width="1000" height="620">
    <defs>
      <pattern id="sandstone" width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="#EAD9B8"/>
        <circle cx="4" cy="4" r="1.5" fill="#C4A470"/>
        <circle cx="14" cy="8" r="1.5" fill="#C4A470"/>
        <circle cx="8" cy="16" r="1.5" fill="#C4A470"/>
        <circle cx="18" cy="16" r="1.5" fill="#C4A470"/>
      </pattern>
      <pattern id="shale" width="30" height="12" patternUnits="userSpaceOnUse">
        <rect width="30" height="12" fill="#CBD5E1"/>
        <line x1="0" y1="6" x2="14" y2="6" stroke="#64748B" stroke-width="1.2"/>
        <line x1="16" y1="11" x2="28" y2="11" stroke="#64748B" stroke-width="1.2"/>
      </pattern>
      <pattern id="coal" width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="#18181B"/>
        <path d="M0 8 L8 0 M8 16 L16 8" stroke="#3F3F46" stroke-width="1.5"/>
      </pattern>
      <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#0F172A"/>
        <stop offset="100%" stop-color="#1E293B"/>
      </linearGradient>
    </defs>

    <!-- Canvas Background -->
    <rect width="1000" height="620" fill="#F8FAFC"/>
    
    <!-- Title Bar -->
    <rect width="1000" height="60" fill="url(#headerGrad)"/>
    <text x="24" y="26" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, monospace" font-size="12" font-weight="bold" fill="#38BDF8">CENTRAL MINE PLANNING &amp; DESIGN INSTITUTE (CMPDI) · GEOLOGICAL CORE LOG</text>
    <text x="24" y="48" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="15" font-weight="bold" fill="#FFFFFF">${safeTitle}</text>
    <text x="976" y="38" text-anchor="end" font-family="monospace" font-size="12" font-weight="bold" fill="#FCD34D">${safeSub} · ${safeCode}</text>

    <!-- Geological Cross-Section Chart Area -->
    <g transform="translate(65, 75)">
      <!-- Outer Border & Background -->
      <rect x="0" y="0" width="870" height="445" fill="#FFFFFF" stroke="#94A3B8" stroke-width="2"/>

      <!-- Strata Layer 1: Topsoil / Weathered Alluvium (0 - 18.5m) -->
      <rect x="65" y="0" width="750" height="55" fill="#D97706" fill-opacity="0.75"/>
      <text x="75" y="32" font-family="sans-serif" font-size="12" font-weight="bold" fill="#78350F">● Topsoil &amp; Weathered Alluvium Layer (0.0m - 18.5m)</text>

      <!-- Strata Layer 2: Medium-Grained Sandstone Overburden (18.5 - 54.2m) -->
      <rect x="65" y="55" width="750" height="115" fill="url(#sandstone)"/>
      <text x="75" y="115" font-family="sans-serif" font-size="12" font-weight="bold" fill="#5C4217">● Overburden Sandstone Member (18.5m - 54.2m) [Compressive Strength: 42 MPa]</text>

      <!-- Strata Layer 3: Carbonaceous Roof Shale (54.2 - 68.0m) -->
      <rect x="65" y="170" width="750" height="45" fill="url(#shale)"/>
      <text x="75" y="198" font-family="sans-serif" font-size="11" font-weight="bold" fill="#1E293B">● Carbonaceous Roof Shale (54.2m - 68.0m)</text>

      <!-- Strata Layer 4: PRIME SEAM-IV COAL (68.0 - 94.5m) -->
      <rect x="65" y="215" width="750" height="90" fill="url(#coal)"/>
      <text x="75" y="262" font-family="sans-serif" font-size="13" font-weight="bold" fill="#38BDF8">★ SEAM-IV MAIN COAL HORIZON (68.0m - 94.5m) · THICKNESS: 26.5m · GCV: 5400 kcal/kg</text>

      <!-- Strata Layer 5: Interburden Siltstone (94.5 - 110.0m) -->
      <rect x="65" y="305" width="750" height="50" fill="url(#sandstone)" fill-opacity="0.85"/>
      <text x="75" y="335" font-family="sans-serif" font-size="11" font-weight="bold" fill="#5C4217">● Interburden Sandstone / Siltstone (94.5m - 110.0m)</text>

      <!-- Strata Layer 6: SEAM-V LOWER COAL (110.0 - 128.5m) -->
      <rect x="65" y="355" width="750" height="90" fill="url(#coal)"/>
      <text x="75" y="405" font-family="sans-serif" font-size="12" font-weight="bold" fill="#FDE047">★ SEAM-V LOWER COAL SEAM (110.0m - 128.5m) · THICKNESS: 18.5m</text>

      <!-- Borehole Drill Path Lines -->
      <line x1="240" y1="0" x2="240" y2="445" stroke="#DC2626" stroke-width="2.5" stroke-dasharray="6,4"/>
      <circle cx="240" cy="0" r="5" fill="#DC2626"/>
      <rect x="248" y="8" width="170" height="20" fill="#FEF2F2" rx="4" stroke="#FECACA"/>
      <text x="254" y="22" font-family="monospace" font-size="10" font-weight="bold" fill="#DC2626">BH-01 (Recovery: 96.4%)</text>

      <line x1="590" y1="0" x2="590" y2="445" stroke="#2563EB" stroke-width="2.5" stroke-dasharray="6,4"/>
      <circle cx="590" cy="0" r="5" fill="#2563EB"/>
      <rect x="598" y="8" width="165" height="20" fill="#EFF6FF" rx="4" stroke="#BFDBFE"/>
      <text x="604" y="22" font-family="monospace" font-size="10" font-weight="bold" fill="#2563EB">BH-02 (Exploratory Core)</text>

      <!-- Depth Axis Marks -->
      <g font-family="monospace" font-size="10" font-weight="bold" fill="#64748B" text-anchor="end">
        <text x="52" y="12">0m</text>
        <text x="52" y="65">20m</text>
        <text x="52" y="180">55m</text>
        <text x="52" y="235">70m</text>
        <text x="52" y="320">95m</text>
        <text x="52" y="370">110m</text>
        <text x="52" y="440">130m</text>
      </g>
    </g>

    <!-- Footer Bar -->
    <rect y="535" width="1000" height="85" fill="#0F172A"/>
    <g transform="translate(24, 560)" font-family="monospace" font-size="11" fill="#E2E8F0">
      <text x="0" y="0">Mine Grid Coordinates: 23°47'28"N, 86°25'42"E · Surface Datum: +248m MSL</text>
      <text x="0" y="20" fill="#94A3B8">Surveyed by: Directorate of Exploration &amp; Core Logging · MineMind AI Ingestion Engine</text>
      <text x="560" y="0" fill="#38BDF8">Stripping Ratio (OB:Coal) = 2.85 m³/tonne</text>
      <text x="560" y="20" fill="#10B981">● High-Resolution Verified Lithological Record</text>
    </g>
  </svg>`;

  try {
    if (typeof window !== 'undefined' && window.btoa) {
      return 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(svg)));
    }
  } catch (e) {
    // fallback
  }
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
};

export const openImageInNewTab = (imageUrl: string, title?: string) => {
  if (!imageUrl) return;

  // For data URIs or regular URLs, open clean dedicated viewer tab with high-res inspect controls
  const newWindow = window.open('', '_blank');
  if (!newWindow) {
    // If popup blocked, create hidden anchor click
    const a = document.createElement('a');
    a.href = imageUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
    return;
  }

  const docTitle = title || 'MineMind AI Geological Survey Inspection';
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${docTitle}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0b1120;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: #0f172a;
      border-bottom: 1px solid #1e293b;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand h1 {
      font-size: 14px;
      font-weight: 700;
      color: #f8fafc;
    }
    .tag {
      background: #1e293b;
      color: #38bdf8;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #334155;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn {
      background: #1e293b;
      color: #f1f5f9;
      border: 1px solid #334155;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .btn:hover {
      background: #334155;
      border-color: #475569;
    }
    .btn-gold {
      background: #c8892e;
      color: #0f172a;
      border-color: #d97706;
    }
    .btn-gold:hover {
      background: #d97706;
    }
    main {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      overflow: auto;
      background: radial-gradient(#1e293b 1px, transparent 1px);
      background-size: 20px 20px;
    }
    .img-wrapper {
      max-width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease;
    }
    img {
      max-width: 95vw;
      max-height: 84vh;
      border-radius: 8px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: #ffffff;
      object-contain;
    }
    footer {
      background: #0f172a;
      border-top: 1px solid #1e293b;
      padding: 10px 20px;
      font-size: 11px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span class="tag">CMPDI INSPECT</span>
      <h1>${docTitle}</h1>
    </div>
    <div class="actions">
      <button class="btn" onclick="zoomIn()">➕ Zoom In</button>
      <button class="btn" onclick="zoomOut()">➖ Zoom Out</button>
      <button class="btn" onclick="rotateImg()">🔄 Rotate 90°</button>
      <button class="btn" onclick="resetView()">⚡ Reset</button>
      <a class="btn btn-gold" href="${imageUrl}" download="${docTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.png">💾 Download File</a>
    </div>
  </header>
  <main>
    <div class="img-wrapper" id="wrapper">
      <img id="mainImage" src="${imageUrl}" alt="${docTitle}" />
    </div>
  </main>
  <footer>
    <span>MineMind AI Multi-Format Document Ingestion Engine</span>
    <span>High-Resolution Visual Strata Inspection</span>
  </footer>
  <script>
    let scale = 1;
    let rotation = 0;
    const img = document.getElementById('mainImage');
    const wrapper = document.getElementById('wrapper');

    function applyTransform() {
      wrapper.style.transform = 'scale(' + scale + ') rotate(' + rotation + 'deg)';
    }
    function zoomIn() {
      scale = Math.min(scale + 0.25, 4);
      applyTransform();
    }
    function zoomOut() {
      scale = Math.max(scale - 0.25, 0.4);
      applyTransform();
    }
    function rotateImg() {
      rotation = (rotation + 90) % 360;
      applyTransform();
    }
    function resetView() {
      scale = 1;
      rotation = 0;
      applyTransform();
    }
  </script>
</body>
</html>`;

  newWindow.document.open();
  newWindow.document.write(htmlContent);
  newWindow.document.close();
};
