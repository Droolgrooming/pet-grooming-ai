const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const QUESTIONNAIRES_TABLE = 'tblqZiJuTUNbqoptR';

module.exports = async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).send('Missing report ID');

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${QUESTIONNAIRES_TABLE}/${id}`,
      { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const record = await response.json();
    if (!response.ok) return res.status(404).send('Report not found');

    const fields = record.fields;
    let data = {};
    let photos = [];
    try { data = JSON.parse(fields['fldOiH9bAL6dX1kVU'] || '{}'); } catch(e) {}
    try { photos = JSON.parse(fields['fldQj73GyFTkP4DrB'] || '[]'); } catch(e) {}

    const formType = fields['fldzVNW1nYk1yekvR'] || 'Session';

    res.setHeader('Content-Type', 'text/html');
    res.send(generateHTML(data, formType, photos, fields));
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
};

function badge(label, value, color) {
  if (!value || (Array.isArray(value) && !value.length)) return '';
  const c = { purple:{bg:'#EEEDFE',text:'#534AB7',border:'#AFA9EC'}, green:{bg:'#E1F5EE',text:'#0F6E56',border:'#5DCAA5'}, blue:{bg:'#E6F1FB',text:'#185FA5',border:'#85B7EB'}, amber:{bg:'#FAEEDA',text:'#854F0B',border:'#EF9F27'}, red:{bg:'#FCEBEB',text:'#A32D2D',border:'#F09595'}, gray:{bg:'#F1EFE8',text:'#5F5E5A',border:'#B4B2A9'}, pink:{bg:'#FBEAF0',text:'#993556',border:'#ED93B1'} }[color] || {bg:'#F1EFE8',text:'#5F5E5A',border:'#B4B2A9'};
  return `<div style="margin-bottom:10px;"><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:${c.text};margin-bottom:4px;opacity:0.7;">${label}</div><div style="display:inline-block;padding:6px 12px;border-radius:20px;background:${c.bg};color:${c.text};border:1px solid ${c.border};font-size:13px;font-weight:500;">${Array.isArray(value)?value.join(' · '):value}</div></div>`;
}

function sec(title, color, content) {
  if (!content.trim()) return '';
  const c = { purple:{b:'#534AB7',bg:'#EEEDFE',t:'#534AB7'}, green:{b:'#1D9E75',bg:'#E1F5EE',t:'#1D9E75'}, blue:{b:'#185FA5',bg:'#E6F1FB',t:'#185FA5'}, amber:{b:'#BA7517',bg:'#FAEEDA',t:'#BA7517'}, red:{b:'#D85A30',bg:'#FAECE7',t:'#D85A30'}, gray:{b:'#888780',bg:'#F1EFE8',t:'#5F5E5A'}, pink:{b:'#D4537E',bg:'#FBEAF0',t:'#D4537E'} }[color] || {b:'#888780',bg:'#F1EFE8',t:'#5F5E5A'};
  return `<div style="margin-bottom:16px;border-radius:12px;overflow:hidden;border:1px solid rgba(0,0,0,0.08);"><div style="padding:10px 16px;background:${c.bg};border-bottom:2px solid ${c.b};"><span style="font-size:12px;font-weight:600;color:${c.t};">${title}</span></div><div style="padding:16px;background:#fff;">${content}</div></div>`;
}

function chips(items, color) {
  if (!items || !items.length) return '';
  const c = { green:{bg:'#E1F5EE',text:'#0F6E56',border:'#5DCAA5'}, amber:{bg:'#FAEEDA',text:'#854F0B',border:'#EF9F27'}, purple:{bg:'#EEEDFE',text:'#534AB7',border:'#AFA9EC'} }[color] || {bg:'#F1EFE8',text:'#5F5E5A',border:'#B4B2A9'};
  return `<div style="display:flex;flex-wrap:wrap;gap:8px;">${items.map(s=>`<span style="padding:5px 12px;border-radius:16px;background:${c.bg};color:${c.text};border:1px solid ${c.border};font-size:12px;font-weight:500;">${s}</span>`).join('')}</div>`;
}

function note(text) {
  if (!text) return '';
  return `<div style="font-size:13px;color:#5a5a56;background:#f5f5f4;padding:10px 12px;border-radius:8px;margin-top:8px;line-height:1.5;">${text}</div>`;
}

function generateHTML(data, formType, photos, fields) {
  const isFound = formType === 'Foundational';
  const typeColor = isFound ? '#534AB7' : formType === 'Touch-up' ? '#1D9E75' : '#185FA5';
  const typeBg = isFound ? '#EEEDFE' : formType === 'Touch-up' ? '#E1F5EE' : '#E6F1FB';

  let photoHTML = '';
  if (photos && photos.length) {
    photoHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">` +
      photos.map(p => `<div><img src="${p.url}" style="width:100%;border-radius:10px;object-fit:cover;max-height:240px;display:block;"/><div style="font-size:11px;color:#9a9a94;margin-top:4px;text-align:center;">${p.label}</div></div>`).join('') +
      `</div>`;
  }

  const hygieneIssues = data.hygiene_issues || data.hygiene || [];

  let sections = '';

  // Coat
  let coat = badge('Comb test (before)', data.comb_before || data.comb, 'pink') +
    (data.comb_after ? badge('Comb test (after)', data.comb_after, 'green') : '') +
    badge('Coat look (before)', data.coat_before || data.coat_look, 'pink') +
    (data.coat_after ? badge('Coat look (after)', data.coat_after, 'green') : '') +
    badge('Matting', data.matting || data.mat_before, 'amber') +
    ((data.mat_loc||[]).length ? badge('Matting locations', data.mat_loc, 'amber') : '') +
    note(data.coat_notes);
  sections += sec('Coat condition', isFound ? 'green' : 'pink', coat);

  // Services
  if ((data.services||[]).length) {
    let svc = chips(data.services, 'green');
    if (data.incomplete === 'Yes' && data.inc_detail) svc += `<div style="margin-top:10px;padding:8px 12px;border-radius:8px;background:#FCEBEB;color:#A32D2D;font-size:13px;"><strong>Not completed:</strong> ${data.inc_detail}</div>`;
    sections += sec('Services performed', 'green', svc);
  }

  // Hygiene
  let hyg = hygieneIssues.length
    ? chips(hygieneIssues, 'amber') + note(data.hygiene_detail || data.hyg_detail) + badge('Severity', data.hyg_sev, data.hyg_sev === 'Needs senior review' ? 'red' : 'amber')
    : `<div style="color:#0F6E56;font-size:13px;font-weight:500;">✓ All clear — no issues noted</div>`;
  sections += sec('Hygiene', 'blue', hyg);

  // Behaviour
  let beh = badge('Behaviour', data.behaviour, data.behaviour === 'Very calm' ? 'green' : data.behaviour === 'Difficult' ? 'red' : 'amber') + note(data.beh_detail) + (data.handling ? `<div style="margin-top:8px;font-size:13px;color:#5a5a56;"><strong>Handling notes:</strong> ${data.handling}</div>` : '');
  sections += sec('Behaviour', 'red', beh);

  // Nails
  if (data.nails) sections += sec('Nails', 'gray', badge('Condition', data.nails, 'gray'));

  // Deshedding
  if (data.shed_vol || data.undercoat) {
    sections += sec('Deshedding', 'amber',
      badge('Volume', data.shed_vol, 'amber') + badge('Undercoat', data.undercoat, 'amber') +
      badge('Tool', data.shed_tool, 'gray') + badge('Time', data.shed_time, 'gray') + note(data.undercoat_notes));
  }

  // Products (van)
  if ((data.products||[]).length || data.prod_other) {
    sections += sec('Products used', 'blue', chips(data.products, 'green') + note(data.prod_other));
  }

  // Target & plan (foundational)
  if (isFound && data.target) {
    let plan = `<div style="font-size:14px;font-weight:500;color:#1a1a18;background:#EEEDFE;padding:12px;border-radius:8px;margin-bottom:12px;line-height:1.5;">"${data.target}"</div>`;
    plan += badge('Frequency', data.freq, 'purple');
    if (data.phase1) plan += `<div style="margin-bottom:8px;"><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#534AB7;margin-bottom:4px;opacity:0.7;">Phase 1 (Weeks 1–2)</div><div style="font-size:13px;color:#5a5a56;">${data.phase1}</div></div>`;
    if (data.phase2) plan += `<div style="margin-bottom:8px;"><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#534AB7;margin-bottom:4px;opacity:0.7;">Phase 2 (Weeks 3–4)</div><div style="font-size:13px;color:#5a5a56;">${data.phase2}</div></div>`;
    if (data.phase3) plan += `<div style="margin-bottom:8px;"><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#534AB7;margin-bottom:4px;opacity:0.7;">Phase 3 (Week 5)</div><div style="font-size:13px;color:#5a5a56;">${data.phase3}</div></div>`;
    if (data.products_text) plan += `<div><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#534AB7;margin-bottom:4px;opacity:0.7;">Products</div><div style="font-size:13px;color:#5a5a56;white-space:pre-line;">${data.products_text}</div></div>`;
    sections += sec('Target outcome & plan', 'purple', plan);
  }

  // Forward planning (van)
  if ((data.focus||[]).length) {
    let fwd = chips(data.focus, 'purple');
    if (data.senior_note) fwd += `<div style="margin-top:10px;padding:10px;border-radius:8px;background:#FAEEDA;color:#854F0B;font-size:13px;"><strong>Note for senior:</strong> ${data.senior_note}</div>`;
    sections += sec('Forward planning', 'purple', fwd);
  }

  // Owner notes
  if (data.owner_notes) sections += sec('Owner & access notes', 'gray', `<div style="font-size:13px;color:#5a5a56;line-height:1.5;">${data.owner_notes}</div>`);

  // Incident
  if (data.incident === 'Yes') {
    sections += sec('⚠️ Incident reported', 'red',
      `<div style="padding:10px;border-radius:8px;background:#FCEBEB;color:#A32D2D;font-size:13px;margin-bottom:8px;">${data.inc_what||'—'}</div>` +
      badge('Pet injured', data.pet_inj, data.pet_inj==='Yes'?'red':'green') +
      badge('Groomer injured', data.grm_inj, data.grm_inj==='Yes'?'red':'green') +
      badge('Owner informed', data.owner_inf, 'gray'));
  }

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${data.pet||'Pet'} — ${formType}</title><style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#eeecea;color:#1a1a18;min-height:100vh;}.container{max-width:560px;margin:0 auto;padding:16px 12px 48px;}</style></head><body><div class="container">
  <div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:16px;border:1px solid rgba(0,0,0,0.08);">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <span style="padding:5px 14px;border-radius:20px;background:${typeBg};color:${typeColor};font-size:12px;font-weight:600;border:1px solid ${typeColor}40;">${formType}</span>
      <span style="font-size:12px;color:#9a9a94;">${fields['fldJ9txpb878bmnEI']||''}</span>
    </div>
    <div style="font-size:26px;font-weight:600;color:#1a1a18;margin-bottom:4px;">${data.pet||'—'}</div>
    <div style="font-size:14px;color:#5a5a56;">${data.breed||''}${data.age?' · '+data.age:''}</div>
    <div style="margin-top:12px;display:flex;gap:20px;flex-wrap:wrap;">
      ${data.groomer?`<div style="font-size:13px;color:#5a5a56;"><span style="color:#9a9a94;">Groomer</span> · <strong>${data.groomer}</strong></div>`:''}
      ${data.owner?`<div style="font-size:13px;color:#5a5a56;"><span style="color:#9a9a94;">Owner</span> · ${data.owner}</div>`:''}
      ${data.plan?`<div style="font-size:13px;color:#5a5a56;"><span style="color:#9a9a94;">Plan</span> · ${data.plan}</div>`:''}
    </div>
    <div style="margin-top:16px;padding:14px;border-radius:10px;background:#F1EFE8;border:1px dashed #B4B2A9;text-align:center;">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#888780;margin-bottom:2px;">AI Progress Score</div>
      <div style="font-size:28px;font-weight:700;color:#B4B2A9;">— / 100</div>
      <div style="font-size:11px;color:#9a9a94;">Coming soon</div>
    </div>
  </div>
  ${photoHTML ? `<div style="background:#fff;border-radius:16px;padding:16px;margin-bottom:16px;border:1px solid rgba(0,0,0,0.08);"><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9a9a94;margin-bottom:12px;">Photos</div>${photoHTML}</div>` : ''}
  ${sections}
</div></body></html>`;
}
