const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const QUESTIONNAIRES_TABLE = 'tblqZiJuTUNbqoptR';

module.exports = async function handler(req, res) {
  const { id } = req.query || {};
  if (!id) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(400).send('<h1>Missing report ID</h1>');
  }

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${QUESTIONNAIRES_TABLE}/${id}`,
      { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const record = await response.json();
    
    if (!response.ok) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(404).send(`<h1>Report not found</h1><pre>${JSON.stringify(record, null, 2)}</pre>`);
    }

    const fields = record.fields || {};
    const rawData = fields['fldOiH9bAL6dX1kVU'] || fields['Full Answers'] || '';
    const formType = fields['fldzVNW1nYk1yekvR'] || fields['Form Type'] || 'Session';
    const groomer = fields['fld74QIUYGa1IQsT8'] || fields['Groomer'] || '';
    const dateSubmitted = fields['fldJ9txpb878bmnEI'] || fields['Date Submitted'] || '';

    let data = {};
    let parseError = null;
    if (rawData) {
      try { 
        data = JSON.parse(rawData); 
      } catch(e) { 
        parseError = e.message;
        data = { _raw: rawData };
      }
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(generateHTML(data, formType, groomer, dateSubmitted, fields, parseError));
  } catch (err) {
    res.setHeader('Content-Type', 'text/html');
    res.status(500).send(`<h1>Error loading report</h1><pre>${err.message}\n${err.stack}</pre>`);
  }
};

function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function row(label, value, color) {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length)) return '';
  const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
  return `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0ede8;gap:12px;">
    <div style="font-size:13px;color:#5a5a56;flex-shrink:0;font-weight:500;">${esc(label)}</div>
    <div style="font-size:13px;color:#1a1a18;text-align:right;">${esc(displayValue)}</div>
  </div>`;
}

function section(title, color, rows) {
  const nonEmpty = rows.filter(r => r && r.length > 0);
  if (!nonEmpty.length) return '';
  const colors = {
    purple: { border: '#534AB7', bg: '#EEEDFE', text: '#534AB7' },
    green:  { border: '#1D9E75', bg: '#E1F5EE', text: '#0F6E56' },
    blue:   { border: '#185FA5', bg: '#E6F1FB', text: '#185FA5' },
    amber:  { border: '#BA7517', bg: '#FAEEDA', text: '#854F0B' },
    red:    { border: '#D85A30', bg: '#FAECE7', text: '#A32D2D' },
    gray:   { border: '#888780', bg: '#F1EFE8', text: '#5F5E5A' },
    pink:   { border: '#D4537E', bg: '#FBEAF0', text: '#993556' },
  };
  const c = colors[color] || colors.gray;
  return `<div style="margin-bottom:16px;border-radius:12px;overflow:hidden;border:1px solid rgba(0,0,0,0.08);background:#fff;">
    <div style="padding:10px 16px;background:${c.bg};border-bottom:2px solid ${c.border};">
      <span style="font-size:12px;font-weight:600;color:${c.text};letter-spacing:0.02em;">${title}</span>
    </div>
    <div style="padding:4px 16px;">${nonEmpty.join('')}</div>
  </div>`;
}

function note(label, text) {
  if (!text) return '';
  return `<div style="padding:10px 0;border-bottom:1px solid #f0ede8;">
    <div style="font-size:13px;color:#5a5a56;font-weight:500;margin-bottom:6px;">${esc(label)}</div>
    <div style="font-size:13px;color:#1a1a18;line-height:1.5;background:#f9f9f7;padding:10px;border-radius:8px;">${esc(text)}</div>
  </div>`;
}

function generateHTML(d, formType, groomer, dateSubmitted, fields, parseError) {
  const isFound = formType === 'Foundational';
  const isTouch = formType === 'Touch-up';
  const typeColor = isFound ? '#534AB7' : isTouch ? '#1D9E75' : '#185FA5';
  const typeBg = isFound ? '#EEEDFE' : isTouch ? '#E1F5EE' : '#E6F1FB';

  let sections = '';

  if (parseError) {
    sections += `<div style="background:#FCEBEB;color:#A32D2D;padding:16px;border-radius:12px;margin-bottom:16px;">
      <strong>Data parse error:</strong> ${esc(parseError)}<br><br>
      <strong>Raw data:</strong><pre style="white-space:pre-wrap;word-break:break-all;font-size:11px;">${esc(d._raw || '')}</pre>
    </div>`;
  }

  sections += section('Session info', 'purple', [
    row('Pet name', d.pet),
    row('Breed', d.breed),
    row('Age', d.age),
    row('Owner', d.owner),
    row('Groomer', d.groomer || groomer),
    row('Plan type', d.plan),
    row('Owner home?', d.owner_home),
  ]);

  // Coat condition (before)
  sections += section('Coat — before', 'pink', [
    row('Comb test', d.comb_before || d.comb),
    row('Coat appearance', d.coat_before || d.coat_look),
    row('Matting', d.matting || d.mat_before),
    row('Matting locations', d.mat_loc),
    note('Coat notes', d.coat_notes),
  ]);

  // Coat condition (after)
  sections += section('Coat — after', 'green', [
    row('Comb test', d.comb_after),
    row('Coat appearance', d.coat_after),
  ]);

  // Services
  sections += section('Services performed', 'green', [
    row('Services', d.services),
    row('Anything not completed?', d.incomplete),
    note('Not completed details', d.inc_detail),
  ]);

  // Hygiene
  const hygieneIssues = d.hygiene_issues || d.hygiene || [];
  sections += section('Hygiene', 'blue', [
    hygieneIssues.length ? row('Issues noted', hygieneIssues) : row('Hygiene check', '✓ All clear — no issues'),
    note('Hygiene details', d.hygiene_detail || d.hyg_detail),
    row('Severity', d.hyg_sev),
  ]);

  // Post-wash skin check (van)
  sections += section('Post-wash skin check', 'blue', [
    row('Anything visible on skin?', d.skin_post),
    note('Skin details', d.skin_detail),
  ]);

  // Nails
  sections += section('Nails', 'gray', [
    row('Nail condition', d.nails),
    note('Nail details', d.nail_detail),
  ]);

  // Deshedding
  sections += section('Deshedding', 'amber', [
    row('Undercoat density', d.undercoat),
    row('Shedding volume', d.shed_vol),
    row('Tool used', d.shed_tool),
    row('Time spent', d.shed_time),
    note('Undercoat notes', d.undercoat_notes),
  ]);

  // Products used (van)
  sections += section('Products used', 'blue', [
    row('Products', d.products),
    note('Other products', d.prod_other),
  ]);

  // Behaviour
  sections += section('Behaviour', 'red', [
    row('Overall temperament', d.behaviour),
    note('Behaviour details', d.beh_detail),
    note('Handling notes', d.handling),
  ]);

  // Target outcome (foundational)
  if (isFound) {
    sections += section('Target outcome & plan', 'purple', [
      note('Target outcome', d.target),
      row('Recommended frequency', d.freq),
      note('Phase 1 (Weeks 1–2)', d.phase1),
      note('Phase 2 (Weeks 3–4)', d.phase2),
      note('Phase 3 (Week 5)', d.phase3),
      note('Products to use', d.products_text || d.products),
    ]);
    sections += section('Owner & access notes', 'gray', [
      note('Notes for the team', d.owner_notes),
    ]);
  }

  // Forward planning (van)
  sections += section('Forward planning', 'purple', [
    row('Focus for next period', d.focus),
    note('Note for senior', d.senior_note),
  ]);

  // Incident
  if (d.incident === 'Yes') {
    sections += section('⚠️ Incident reported', 'red', [
      note('What happened', d.inc_what),
      row('Pet injured', d.pet_inj),
      row('Groomer injured', d.grm_inj),
      row('Owner informed', d.owner_inf),
    ]);
  }

  // If still no sections (edge case), dump raw data
  if (!sections.trim()) {
    sections = `<div style="background:#FAEEDA;color:#854F0B;padding:16px;border-radius:12px;">
      <strong>No form data found.</strong><br><br>
      <pre style="white-space:pre-wrap;word-break:break-all;font-size:11px;">${esc(JSON.stringify(d, null, 2))}</pre>
    </div>`;
  }

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${esc(d.pet || 'Pet')} — ${esc(formType)}</title><style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#eeecea;color:#1a1a18;min-height:100vh;}.container{max-width:560px;margin:0 auto;padding:16px 12px 48px;}</style></head><body><div class="container">
    <div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:16px;border:1px solid rgba(0,0,0,0.08);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <span style="padding:5px 14px;border-radius:20px;background:${typeBg};color:${typeColor};font-size:12px;font-weight:600;border:1px solid ${typeColor}40;">${esc(formType)}</span>
        <span style="font-size:12px;color:#9a9a94;">${esc(dateSubmitted)}</span>
      </div>
      <div style="font-size:26px;font-weight:600;color:#1a1a18;margin-bottom:4px;">${esc(d.pet || '—')}</div>
      <div style="font-size:14px;color:#5a5a56;">${esc(d.breed || '')}${d.age ? ' · ' + esc(d.age) : ''}</div>
      <div style="margin-top:16px;padding:14px;border-radius:10px;background:#F1EFE8;border:1px dashed #B4B2A9;text-align:center;">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#888780;margin-bottom:2px;">AI Progress Score</div>
        <div style="font-size:28px;font-weight:700;color:#B4B2A9;">— / 100</div>
        <div style="font-size:11px;color:#9a9a94;">Coming soon</div>
      </div>
    </div>
    ${sections}
  </div></body></html>`;
}
