/**
 * BPEM SAP OData Proxy Server
 * ----------------------------
 * Deployed on SAP BTP Cloud Foundry alongside index.html.
 * Forwards /sap/** requests to the backend S4 system server-side,
 * so the browser never hits the S4 host directly (no CORS issue).
 *
 * Deploy steps:
 *   1. npm install
 *   2. cf push   (uses manifest.yml)
 *
 * Once deployed, your HTML on the same BTP app calls /sap/... directly.
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

// BTP sets PORT via env; fallback to 3000 locally
const PORT = process.env.PORT || 3000;

// ── SAP S4 backend target ──
const SAP_TARGET = 'https://utg-webdisp.utegration.com:44317';

// Serve index.html as static files from same folder
app.use(express.static(path.join(__dirname)));

// ── Proxy: /sap/** → S4 system ──
app.use(
  '/sap',
  createProxyMiddleware({
    target: SAP_TARGET,
    changeOrigin: true,   // rewrites Host header to S4 host
    secure: false,        // allow self-signed SAP certificates
    on: {
      proxyReq: (proxyReq, req) => {
        // Pass Authorization header from browser through to S4
        const auth = req.headers['authorization'];
        if (auth) proxyReq.setHeader('Authorization', auth);
        proxyReq.setHeader('Accept', 'application/json');
        console.log(`[proxy] → ${req.method} ${SAP_TARGET}${req.url}`);
      },
      proxyRes: (proxyRes, req) => {
        console.log(`[proxy] ← ${proxyRes.statusCode} ${req.url}`);
      },
      error: (err, req, res) => {
        console.error('[proxy] error:', err.message);
        res.status(502).json({ error: 'Proxy error', detail: err.message });
      },
    },
  })
);

app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log(`   SAP target : ${SAP_TARGET}`);
  console.log(`   Open       : http://localhost:${PORT}/index.html\n`);
});
