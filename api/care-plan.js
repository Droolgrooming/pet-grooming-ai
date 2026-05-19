const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const PETS_TABLE = 'tblAMDOwnSChJCZ2s';

module.exports = async function handler(req, res) {
  const { id } = req.query || {};
  if (!id) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(400).send('<h1>Missing pet ID</h1>');
  }

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${PETS_TABLE}/${id}`,
      { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const record = await response.json();
    if (!response.ok) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(404).send('<h1>Pet not found</h1>');
    }

    const f = record.fields || {};
    const esc = s => s == null ? '' : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const petName = f['Pet Name'] || 'Pet';
    const breed = f['Breed'] || '';
    const age = f['Age'] || '';
    const owner = f['Owner Name'] || '';
    const programme = f['Plan Type'] || 'Hygiene';
    const programmeDisplay = programme === 'Hygiene+Deshedding' ? 'Hygiene + Deshedding' : programme;
    const assessment = f['Assessment Results'] || '';
    const frequency = f['Touch-up Frequency'] || '';
    const vanDate = f['Van Maintenance Approximate Planned Date'] || '';

    const lastModified = record.createdTime;
    const updatedDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    // Calculate days until van maintenance
    let vanDateDisplay = '—';
    let daysUntil = '';
    if (vanDate) {
      const d = new Date(vanDate);
      vanDateDisplay = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      const now = new Date();
      const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
      if (diff > 0) daysUntil = `~ ${diff} day${diff !== 1 ? 's' : ''}`;
      else if (diff === 0) daysUntil = 'Today';
      else daysUntil = `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''} overdue`;
    }

    // Frequency display
    const freqNumber = frequency ? frequency.split('x')[0] : '—';
    const freqLabel = frequency ? 'per week' : '';

    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${esc(petName)} — Care Plan</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#faf8f5;color:#1a1a18;line-height:1.6;}
.container{max-width:540px;margin:0 auto;padding:20px 16px 40px;}
.card{background:#fff;border-radius:16px;padding:22px 24px;border:1px solid rgba(0,0,0,0.08);}
.header{text-align:center;padding-bottom:14px;border-bottom:2px solid #4a4ad8;margin-bottom:20px;}
.logo{font-size:20px;font-weight:500;color:#4a4ad8;letter-spacing:0.04em;}
.title{font-size:20px;font-weight:500;text-align:center;}
.title-sub{font-size:11px;color:#9a9a94;font-style:italic;text-align:center;margin-top:2px;}
.pet-card{background:#d5d5fd;border-radius:10px;padding:14px 16px;margin:18px 0;}
.pet-name{font-size:24px;font-weight:500;color:#4a4ad8;}
.pet-meta{font-size:12px;color:#4a4ad8;opacity:0.8;margin-top:2px;}
.label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9a9a94;margin-bottom:6px;}
.section{margin-bottom:18px;}
.prog-box{padding:10px 14px;background:#f5f5f4;border-radius:10px;font-size:14px;font-weight:500;}
.assessment-text{font-size:13px;color:#5a5a56;line-height:1.6;}
.frequency{display:flex;align-items:baseline;gap:8px;}
.freq-num{font-size:26px;font-weight:500;color:#4a4ad8;}
.freq-lbl{font-size:13px;color:#5a5a56;}
.van-box{background:#f5f5f4;border-radius:10px;padding:12px 14px;}
.van-date{font-size:16px;font-weight:500;margin-top:2px;}
.van-countdown{font-size:11px;color:#5a5a56;margin-top:4px;}
.update-note{margin-top:18px;padding:10px 14px;background:#d5d5fd;color:#4a4ad8;border-radius:10px;font-size:11px;text-align:center;line-height:1.5;}
.print-btn{display:block;width:100%;margin-top:16px;padding:12px;background:#fff;border:1.5px solid #4a4ad8;color:#4a4ad8;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;}
.print-btn:hover{background:#4a4ad8;color:#fff;}
@media print { .print-btn{display:none;} body{background:white;} .card{border:none;padding:10px;} }
</style></head><body><div class="container"><div class="card">

<div class="header">
  <div class="logo">YALLA CARE</div>
</div>

<div class="title">Personalised Care Plan</div>
<div class="title-sub">Last updated ${updatedDate}</div>

<div class="pet-card">
  <div class="pet-name">${esc(petName)}</div>
  <div class="pet-meta">${esc(breed)}${age ? ' · ' + esc(age) : ''}${owner ? ' · Owner: ' + esc(owner) : ''}</div>
</div>

<div class="section">
  <div class="label">Programme</div>
  <div class="prog-box">${esc(programmeDisplay)}</div>
</div>

${assessment ? `<div class="section">
  <div class="label">Assessment results</div>
  <div class="assessment-text">${esc(assessment)}</div>
</div>` : ''}

${frequency ? `<div class="section">
  <div class="label">Touch-up frequency</div>
  <div class="frequency">
    <span class="freq-num">${esc(freqNumber)}x</span>
    <span class="freq-lbl">${esc(freqLabel)}</span>
  </div>
</div>` : ''}

${vanDate ? `<div class="van-box">
  <div class="label" style="margin-bottom:0;">Van maintenance approximate planned date</div>
  <div class="van-date">${vanDateDisplay}</div>
  ${daysUntil ? `<div class="van-countdown">${daysUntil}</div>` : ''}
</div>` : ''}

<div class="update-note">Your plan updates after every visit.</div>

<button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>

</div></div></body></html>`);
  } catch (err) {
    res.setHeader('Content-Type', 'text/html');
    res.status(500).send('<h1>Error</h1><p>' + err.message + '</p>');
  }
};
