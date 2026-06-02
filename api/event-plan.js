const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const EVENT_LEADS_TABLE = 'tblRq3FgOkfvXjp0r';
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '971582645050';

module.exports = async function handler(req, res) {
  const { id } = req.query || {};
  if (!id) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(400).send('<h1>Missing ID</h1>');
  }

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${EVENT_LEADS_TABLE}/${id}`,
      { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const record = await response.json();
    if (!response.ok) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(404).send('<h1>Plan not found</h1>');
    }

    const f = record.fields || {};
    let d = {};
    try { d = JSON.parse(f['Assessment Data'] || '{}'); } catch(e) {}

    const esc = s => s == null ? '' : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const petName = d.pet_name || f['Pet Name'] || 'Your pet';
    const breed = d.breed || f['Breed'] || '';
    const age = d.age || f['Age'] || '';
    const ownerName = d.owner_name || f['Owner Name'] || '';
    const programme = d.programme || f['Recommended Programme'] || '';
    const frequency = d.frequency || f['Recommended Frequency'] || '';

    const summaryParts = [];
    if (d.coat) summaryParts.push(`Coat condition: ${d.coat.toLowerCase()}`);
    if (d.matting && d.matting !== 'None') summaryParts.push(`matting: ${d.matting.toLowerCase()}`);
    if (d.shedding && d.shedding !== 'Minimal') summaryParts.push(`shedding: ${d.shedding.toLowerCase()}`);
    if (d.behaviour) summaryParts.push(`behaviour: ${d.behaviour.toLowerCase()}`);
    const summary = summaryParts.length ? `We observed ${summaryParts.join(', ')}.` : '';

    let concernsHTML = '';
    if (d.concerns && d.concerns.length) {
      const chips = d.concerns.map(c => `<span class="chip">${esc(c)}</span>`).join('');
      concernsHTML = `<div class="section">
        <div class="label">Areas we'd focus on</div>
        <div class="chip-row">${chips}</div>
      </div>`;
    }

    const programmeBullets = programme === 'Hygiene + Deshedding'
      ? ['Touch-up sessions at home (' + frequency + ')', 'Deshedding to keep the coat healthy', 'Van maintenance every 2 weeks with full wash + treatments']
      : ['Touch-up sessions at home (' + frequency + ')', 'Regular hygiene care (ears, eyes, paws, teeth)', 'Van maintenance every 2 weeks with full wash'];

    const freqNumber = frequency ? frequency.split('x')[0] : '—';

    const msg = encodeURIComponent(`Hi! I'd like to book a foundational session for ${petName} after our assessment at the event today.`);
    const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;

    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${esc(petName)} — Quick Care Plan</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#faf8f5;color:#1a1a18;line-height:1.6;}
.container{max-width:520px;margin:0 auto;padding:20px 16px 32px;}
.card{background:#fff;border-radius:16px;padding:22px 24px;border:1px solid rgba(0,0,0,0.08);}
.header{text-align:center;padding-bottom:12px;border-bottom:2px solid #4a4ad8;margin-bottom:18px;}
.logo{font-size:20px;font-weight:500;color:#4a4ad8;letter-spacing:0.04em;}
.event-badge{display:inline-block;padding:4px 12px;background:#d5d5fd;color:#4a4ad8;border-radius:14px;font-size:11px;font-weight:600;letter-spacing:0.04em;margin-bottom:14px;}
.title{font-size:20px;font-weight:500;text-align:center;}
.title-sub{font-size:11px;color:#9a9a94;font-style:italic;text-align:center;margin-top:2px;}
.pet-card{background:#d5d5fd;border-radius:10px;padding:14px 16px;margin:16px 0;}
.pet-name{font-size:24px;font-weight:500;color:#4a4ad8;}
.pet-meta{font-size:12px;color:#4a4ad8;opacity:0.8;margin-top:2px;}
.label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9a9a94;margin-bottom:6px;}
.section{margin-bottom:16px;}
.prog-box{padding:10px 14px;background:#f5f5f4;border-radius:10px;font-size:14px;font-weight:500;}
.assessment-text{font-size:13px;color:#5a5a56;line-height:1.7;}
.chip-row{display:flex;flex-wrap:wrap;gap:6px;}
.chip{padding:5px 11px;background:#fef3c7;color:#92400e;border-radius:12px;font-size:12px;font-weight:500;border:1px solid #f0d770;}
.frequency{display:flex;align-items:baseline;gap:8px;}
.freq-num{font-size:26px;font-weight:500;color:#4a4ad8;}
.freq-lbl{font-size:13px;color:#5a5a56;}
.bullet-list{list-style:none;padding:0;margin:0;}
.bullet-list li{padding:8px 0 8px 22px;position:relative;font-size:13px;color:#5a5a56;line-height:1.5;}
.bullet-list li::before{content:'✓';position:absolute;left:0;top:8px;color:#4a4ad8;font-weight:600;}
.cta-box{margin-top:20px;padding:16px 18px;background:#4a4ad8;border-radius:12px;text-align:center;}
.cta-box .cta-title{font-size:15px;font-weight:500;color:#fff;margin-bottom:4px;}
.cta-box .cta-sub{font-size:12px;color:#d5d5fd;margin-bottom:12px;}
.cta-btn{display:inline-block;background:#fff;color:#4a4ad8;padding:11px 22px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;}
.expiry{text-align:center;margin-top:14px;font-size:11px;color:#9a9a94;font-style:italic;}
.print-btn{display:block;width:100%;margin-top:14px;padding:11px;background:#fff;border:1.5px solid #4a4ad8;color:#4a4ad8;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;}
@media print { .print-btn,.cta-btn{display:none;} body{background:white;} .card{border:none;padding:10px;} }
</style></head><body><div class="container"><div class="card">

<div style="text-align:center;"><span class="event-badge">EVENT ASSESSMENT</span></div>

<div class="header">
  <div class="logo">YALLA CARE</div>
</div>

<div class="title">Your Quick Care Plan</div>
<div class="title-sub">Based on our 15-min assessment</div>

<div class="pet-card">
  <div class="pet-name">${esc(petName)}</div>
  <div class="pet-meta">${esc(breed)}${age ? ' · ' + esc(age) : ''}${ownerName ? ' · Owner: ' + esc(ownerName) : ''}</div>
</div>

${summary ? `<div class="section">
  <div class="label">What we found</div>
  <div class="assessment-text">${esc(summary)}</div>
</div>` : ''}

${concernsHTML}

${programme ? `<div class="section">
  <div class="label">Recommended programme</div>
  <div class="prog-box">${esc(programme)}</div>
</div>` : ''}

${frequency ? `<div class="section">
  <div class="label">Touch-up frequency</div>
  <div class="frequency">
    <span class="freq-num">${esc(freqNumber)}x</span>
    <span class="freq-lbl">per week</span>
  </div>
</div>` : ''}

<div class="section">
  <div class="label">What your subscription looks like</div>
  <ul class="bullet-list">
    ${programmeBullets.map(b => `<li>${esc(b)}</li>`).join('')}
  </ul>
</div>

<div class="cta-box">
  <div class="cta-title">Ready to start ${esc(petName)}'s care?</div>
  <div class="cta-sub">Book your foundational session — first step of the programme</div>
  <a href="${whatsappLink}" class="cta-btn">Book on WhatsApp →</a>
</div>

<div class="expiry">This assessment is valid for 14 days.</div>

<button class="print-btn" onclick="window.print()">🖨️ Save as PDF</button>

</div></div></body></html>`);
  } catch (err) {
    res.setHeader('Content-Type', 'text/html');
    res.status(500).send('<h1>Error</h1><p>' + err.message + '</p>');
  }
};
