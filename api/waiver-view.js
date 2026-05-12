const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const QUESTIONNAIRES_TABLE = 'tblqZiJuTUNbqoptR';

module.exports = async function handler(req, res) {
  const { id } = req.query || {};
  if (!id) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(400).send('<h1>Missing waiver ID</h1>');
  }

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${QUESTIONNAIRES_TABLE}/${id}`,
      { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const record = await response.json();
    if (!response.ok) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(404).send('<h1>Waiver not found</h1>');
    }

    const fields = record.fields || {};
    let d = {};
    try { d = JSON.parse(fields['fldOiH9bAL6dX1kVU'] || '{}'); } catch(e) {}

    const signedDate = d.signed_at ? new Date(d.signed_at) : new Date();
    const dateStr = signedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = signedDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const esc = s => s == null ? '' : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const check = v => v ? '✓' : '○';

    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Signed Waiver — ${esc(d.pet_name)}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#faf8f5;color:#1a1a18;line-height:1.6;}
.container{max-width:680px;margin:0 auto;padding:24px 20px 48px;}
.signed-badge{display:inline-block;padding:6px 14px;background:#4a4ad8;color:white;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:0.04em;margin-bottom:18px;}
.header{text-align:center;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #4a4ad8;}
.logo{font-size:22px;font-weight:600;color:#4a4ad8;letter-spacing:0.02em;}
.subtitle{font-size:12px;color:#5a5a56;margin-top:4px;letter-spacing:0.08em;text-transform:uppercase;}
.title{font-size:24px;font-weight:600;text-align:center;margin-bottom:6px;}
.subtitle-italic{font-size:13px;color:#5a5a56;text-align:center;font-style:italic;margin-bottom:24px;}
h2{font-size:16px;font-weight:600;margin:28px 0 14px;color:#4a4ad8;}
.field-grid{display:grid;grid-template-columns:1fr 2fr;gap:8px 16px;background:#fff;padding:16px 18px;border-radius:12px;border:1px solid rgba(0,0,0,0.08);}
.field-grid .k{font-size:13px;color:#5a5a56;font-weight:500;}
.field-grid .v{font-size:14px;color:#1a1a18;}
.consent-row{display:flex;gap:12px;padding:12px 16px;background:#fff;border-radius:10px;border:1px solid rgba(0,0,0,0.08);margin-bottom:8px;}
.consent-row .mark{flex-shrink:0;font-size:18px;color:#4a4ad8;font-weight:600;}
.consent-row .text{font-size:13px;color:#1a1a18;line-height:1.5;}
.marketing-choice{padding:14px 18px;background:#d5d5fd;color:#4a4ad8;border-radius:12px;font-size:14px;font-weight:500;}
.signature-box{padding:18px 20px;background:#4a4ad8;color:white;border-radius:12px;text-align:center;margin-top:20px;}
.signature-box .sig{font-family:'Brush Script MT','Lucida Handwriting',cursive;font-size:28px;margin:8px 0;}
.signature-box .meta{font-size:12px;opacity:0.85;margin-top:8px;}
.print-btn{display:block;width:100%;margin-top:24px;padding:12px;background:#fff;border:1.5px solid #4a4ad8;color:#4a4ad8;border-radius:10px;font-size:14px;font-weight:500;cursor:pointer;}
.footer{text-align:center;font-size:11px;color:#9a9a94;margin-top:28px;font-style:italic;}
@media print { .print-btn { display: none; } body { background: white; } }
</style></head><body><div class="container">

<div style="text-align:center;"><span class="signed-badge">✓ SIGNED &amp; CONFIRMED</span></div>

<div class="header">
  <div class="logo">YALLA CARE</div>
</div>

<div class="title">Client Agreement</div>
<div class="subtitle-italic">Signed copy</div>

<h2>About You &amp; Your Pet</h2>
<div class="field-grid">
  <div class="k">Owner Name</div><div class="v">${esc(d.owner_name)}</div>
  <div class="k">Phone / WhatsApp</div><div class="v">${esc(d.phone)}</div>
  <div class="k">Pet Name</div><div class="v">${esc(d.pet_name)}</div>
  <div class="k">Breed</div><div class="v">${esc(d.breed)}</div>
  <div class="k">Age</div><div class="v">${esc(d.age) || '—'}</div>
  <div class="k">Type</div><div class="v">${esc(d.pet_type)}</div>
  <div class="k">Health conditions</div><div class="v">${esc(d.health) || 'None disclosed'}</div>
  <div class="k">Behavioural concerns</div><div class="v">${esc(d.behaviour) || 'None disclosed'}</div>
</div>

<h2>Consent Confirmed</h2>
<div class="consent-row"><span class="mark">${check(d.vaccinations)}</span><span class="text">Pet is in good health and up to date with required vaccinations under UAE law.</span></div>
<div class="consent-row"><span class="mark">${check(d.no_aggression)}</span><span class="text">Confirms pet has not previously injured a groomer or professional without provocation.</span></div>
<div class="consent-row"><span class="mark">${check(d.stress_pause)}</span><span class="text">Agrees Yalla Care may pause or end a session if pet shows significant stress or discomfort.</span></div>
<div class="consent-row"><span class="mark">${check(d.aggression_termination)}</span><span class="text">Accepts that aggressive behaviour endangering team will result in immediate termination, no refund.</span></div>
<div class="consent-row"><span class="mark">${check(d.photo_video)}</span><span class="text">Authorises photography and video during sessions for progress tracking and owner updates.</span></div>

<h2>Marketing Use</h2>
<div class="marketing-choice">${esc(d.marketing) || '—'}</div>

<h2>A Few Things to Know</h2>
<div style="font-size:13px;color:#5a5a56;line-height:1.7;background:#fff;padding:14px 18px;border-radius:12px;border:1px solid rgba(0,0,0,0.08);">
  Client has acknowledged that (a) Yalla Care is not liable for aggravation of undisclosed conditions; (b) Yalla Care may seek emergency veterinary care at the owner's expense if the owner cannot be reached in an emergency; (c) all information provided is truthful and complete, and Yalla Care accepts no liability for incidents arising from withheld or inaccurate information.
</div>

<div class="signature-box">
  <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.8;">Signed by</div>
  <div class="sig">${esc(d.full_name)}</div>
  <div class="meta">Agreement accepted electronically on ${dateStr} at ${timeStr}</div>
</div>

<button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>

<div class="footer">This is a legally valid electronic signature</div>

</div></body></html>`);
  } catch (err) {
    res.setHeader('Content-Type', 'text/html');
    res.status(500).send('<h1>Error</h1><p>' + err.message + '</p>');
  }
};
