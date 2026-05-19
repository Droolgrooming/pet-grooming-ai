const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const PETS_TABLE = 'tblAMDOwnSChJCZ2s';
const QUESTIONNAIRES_TABLE = 'tblqZiJuTUNbqoptR';

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
    const assessment = f['Client-Facing Assessment'] || f['Assessment Results'] || '';
    const frequency = f['Touch-up Frequency'] || '';
    const previousFreq = f['Previous Frequency'] || '';
    const freqChangedDate = f['Frequency Changed Date'] || '';
    const vanDate = f['Van Maintenance Approximate Planned Date'] || '';
    const keyRecsRaw = f['Key Recommendations'] || '';
    const linkedQuestionnaires = f['Questionnaires'] || [];

    // Fetch all linked questionnaires to find Van + latest session
    const sessions = [];
    for (const qid of linkedQuestionnaires) {
      try {
        const qRes = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${QUESTIONNAIRES_TABLE}/${qid}`,
          { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
        );
        const qData = await qRes.json();
        if (qRes.ok && qData.fields) {
          let answers = {};
          try { answers = JSON.parse(qData.fields['Full Answers'] || '{}'); } catch(e) {}
          sessions.push({
            id: qData.id,
            formType: qData.fields['Form Type'] || '',
            date: qData.fields['Date Submitted'] || '',
            answers
          });
        }
      } catch(e) {}
    }

    // Sort sessions: most recent first, exclude waivers
    const groomingSessions = sessions
      .filter(s => s.formType !== 'Waiver')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Find most recent Van Maintenance
    const lastVan = sessions.find(s => s.formType === 'Van maintenance');
    const vanCompletedDate = lastVan ? lastVan.date : null;

    // Find most recent session for "Latest from last session"
    const latestSession = groomingSessions[0];
    const latestCoatCondition = latestSession?.answers?.coat_after || latestSession?.answers?.coat_look || '';
    const latestMatting = latestSession?.answers?.mat_before || latestSession?.answers?.matting || '';
    const latestBehaviour = latestSession?.answers?.behaviour || '';
    const latestDate = latestSession?.date;

    // Colour-code latest values
    function coatBadge(value) {
      if (!value) return { bg: '#f5f5f4', color: '#5a5a56' };
      if (value === 'Bright, healthy shine') return { bg: '#E1F5EE', color: '#0F6E56' };
      if (value === 'Clean, normal sheen') return { bg: '#E6F1FB', color: '#185FA5' };
      if (value === 'Slightly dull') return { bg: '#FAEEDA', color: '#854F0B' };
      return { bg: '#FCEBEB', color: '#A32D2D' };
    }
    function mattingBadge(value) {
      if (!value) return { bg: '#f5f5f4', color: '#5a5a56' };
      if (value === 'None') return { bg: '#E1F5EE', color: '#0F6E56' };
      if (value === 'Light tangles') return { bg: '#E6F1FB', color: '#185FA5' };
      if (value === 'Moderate mats') return { bg: '#FAEEDA', color: '#854F0B' };
      return { bg: '#FCEBEB', color: '#A32D2D' };
    }
    function behaviourBadge(value) {
      if (!value) return { bg: '#f5f5f4', color: '#5a5a56' };
      if (value === 'Very calm') return { bg: '#E1F5EE', color: '#0F6E56' };
      if (value === 'Mostly calm') return { bg: '#E6F1FB', color: '#185FA5' };
      if (value === 'Unsettled') return { bg: '#FAEEDA', color: '#854F0B' };
      return { bg: '#FCEBEB', color: '#A32D2D' };
    }
    function softenBehaviour(value) {
      if (value === 'Difficult') return 'Anxious — working on it';
      if (value === 'Unsettled') return 'A little unsettled';
      return value;
    }

    const updatedDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    // Build Key Recommendations cards
    let recsHTML = '';
    if (keyRecsRaw) {
      const lines = keyRecsRaw.split('\n').filter(l => l.trim());
      const cards = lines.map(line => {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length < 3) return '';
        const [color, icon, title, body = ''] = parts;
        const colors = {
          amber: { bg: '#fef3c7', border: '#d97706', titleColor: '#92400e', bodyColor: '#78350f' },
          purple: { bg: '#d5d5fd', border: '#4a4ad8', titleColor: '#4a4ad8', bodyColor: '#4a4ad8' },
          green: { bg: '#E1F5EE', border: '#0F6E56', titleColor: '#0F6E56', bodyColor: '#0a4d3c' }
        };
        const c = colors[color] || colors.amber;
        return `<div class="rec-card" style="background:${c.bg};border-left:3px solid ${c.border};">
          <div>
            <div style="font-size:13px;font-weight:500;color:${c.titleColor};">${esc(title)}</div>
            ${body ? `<div style="font-size:12px;color:${c.bodyColor};opacity:0.85;margin-top:2px;line-height:1.5;">${esc(body)}</div>` : ''}
          </div>
        </div>`;
      }).filter(Boolean).join('');
      if (cards) {
        recsHTML = `<div class="section">
          <div class="label" style="color:#d97706;">⚠ Key recommendations</div>
          <div class="rec-list">${cards}</div>
        </div>`;
      }
    }

    // Latest from last session panel
    let latestHTML = '';
    if (latestSession && (latestCoatCondition || latestMatting || latestBehaviour)) {
      const latestDateStr = latestDate ? new Date(latestDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      const cb = coatBadge(latestCoatCondition);
      const mb = mattingBadge(latestMatting);
      const bb = behaviourBadge(latestBehaviour);
      latestHTML = `<div class="latest-panel">
        <div class="latest-header">
          <span class="label" style="margin:0;">Latest from last session</span>
          <span class="latest-date">${esc(latestDateStr)}</span>
        </div>
        ${latestCoatCondition ? `<div class="latest-row"><span class="latest-k">Coat condition</span><span class="chip" style="background:${cb.bg};color:${cb.color};">${esc(latestCoatCondition)}</span></div>` : ''}
        ${latestMatting ? `<div class="latest-row"><span class="latest-k">Matting</span><span class="chip" style="background:${mb.bg};color:${mb.color};">${esc(latestMatting)}</span></div>` : ''}
        ${latestBehaviour ? `<div class="latest-row"><span class="latest-k">Behaviour</span><span class="chip" style="background:${bb.bg};color:${bb.color};">${esc(softenBehaviour(latestBehaviour))}</span></div>` : ''}
      </div>`;
    }

    // Frequency change indicator
    let freqChangeHTML = '';
    if (previousFreq && previousFreq !== frequency && frequency) {
      const prevNum = parseInt(previousFreq);
      const newNum = parseInt(frequency);
      const direction = newNum < prevNum ? 'reduced' : 'increased';
      const arrow = newNum < prevNum ? '↓' : '↑';
      const dateStr = freqChangedDate ? new Date(freqChangedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : '';
      freqChangeHTML = `<div class="freq-change">
        ${arrow} ${direction} from ${esc(previousFreq)}${dateStr ? ' after Van session on ' + dateStr : ''}
      </div>`;
    }

    // Van card
    let vanCardHTML = '';
    if (vanCompletedDate) {
      const d = new Date(vanCompletedDate);
      const completedStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      vanCardHTML = `<div class="van-box completed">
        <div class="label" style="margin-bottom:4px;">Van maintenance</div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="check-badge">✓ Completed</span>
          <span class="van-date-inline">${completedStr}</span>
        </div>
      </div>`;
    } else if (vanDate) {
      const d = new Date(vanDate);
      const vanStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      const now = new Date();
      const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
      let countdown = '';
      if (diff > 0) countdown = `~ ${diff} day${diff !== 1 ? 's' : ''}`;
      else if (diff === 0) countdown = 'Today';
      else countdown = `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''} overdue`;

      vanCardHTML = `<div class="van-box">
        <div class="label" style="margin-bottom:0;">Van maintenance approximate planned date</div>
        <div class="van-date">${vanStr}</div>
        <div class="van-countdown">${countdown}</div>
      </div>`;
    }

    const freqNumber = frequency ? frequency.split('x')[0] : '—';

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
.assessment-text{font-size:13px;color:#5a5a56;line-height:1.7;white-space:pre-line;}
.rec-list{display:flex;flex-direction:column;gap:8px;}
.rec-card{padding:10px 12px;border-radius:6px;}
.latest-panel{margin-bottom:18px;background:#f9f9f7;border-radius:10px;padding:14px 16px;}
.latest-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;}
.latest-date{font-size:10px;color:#9a9a94;font-style:italic;}
.latest-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;}
.latest-k{font-size:12px;color:#5a5a56;}
.chip{font-size:12px;font-weight:500;padding:3px 10px;border-radius:10px;}
.frequency{display:flex;align-items:baseline;gap:8px;}
.freq-num{font-size:26px;font-weight:500;color:#4a4ad8;}
.freq-lbl{font-size:13px;color:#5a5a56;}
.freq-change{font-size:11px;color:#0F6E56;background:#E1F5EE;padding:5px 10px;border-radius:6px;display:inline-block;margin-top:6px;}
.van-box{background:#f5f5f4;border-radius:10px;padding:12px 14px;}
.van-box.completed{background:#e1f5ee;}
.van-date{font-size:16px;font-weight:500;margin-top:2px;}
.van-countdown{font-size:11px;color:#5a5a56;margin-top:4px;}
.van-date-inline{font-size:14px;font-weight:500;color:#1a1a18;}
.check-badge{display:inline-block;padding:3px 10px;background:#0F6E56;color:#fff;border-radius:12px;font-size:11px;font-weight:600;}
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
  <div class="pet-meta">${esc(breed)}${age ? ' · ' + esc(age) + ' years' : ''}${owner ? ' · Owner: ' + esc(owner) : ''}</div>
</div>

<div class="section">
  <div class="label">Programme</div>
  <div class="prog-box">${esc(programmeDisplay)}</div>
</div>

${assessment ? `<div class="section">
  <div class="label">Assessment</div>
  <div class="assessment-text">${esc(assessment)}</div>
</div>` : ''}

${recsHTML}

${latestHTML}

${frequency ? `<div class="section">
  <div class="label">Touch-up frequency</div>
  <div class="frequency">
    <span class="freq-num">${esc(freqNumber)}x</span>
    <span class="freq-lbl">per week</span>
  </div>
  ${freqChangeHTML}
</div>` : ''}

${vanCardHTML}

<div class="update-note">Your plan updates after every visit.</div>

<button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>

</div></div></body></html>`);
  } catch (err) {
    res.setHeader('Content-Type', 'text/html');
    res.status(500).send('<h1>Error</h1><p>' + err.message + '</p>');
  }
};
