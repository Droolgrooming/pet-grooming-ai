const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const QUESTIONNAIRES_TABLE = 'tblqZiJuTUNbqoptR';
const PETS_TABLE = 'tblAMDOwnSChJCZ2s';
const ATTACHMENTS_FIELD = 'flddn7mmPfFCmact1';

// ------ CARE PLAN AUTO-GENERATION ------

function buildAssessment(data) {
  const parts = [];
  const petName = data.pet || 'Your pet';
  const breed = data.breed || '';

  // Coat description based on plan + observations
  if (data.plan === 'Hygiene + Deshedding' || data.shed_vol) {
    let coatLine = `${petName} has a coat that needs regular care to stay healthy`;
    if (data.shed_vol === 'Heavy') coatLine += ' and sheds heavily';
    else if (data.shed_vol === 'Moderate') coatLine += ' and has moderate shedding';
    if (data.undercoat === 'Very dense, tightly packed' || data.undercoat === 'Very dense') {
      coatLine += '. The undercoat is very dense';
    } else if (data.undercoat === 'Dense' || data.undercoat === 'Dense but some give') {
      coatLine += '. The undercoat is dense';
    }
    coatLine += '.';
    parts.push(coatLine);
  } else {
    parts.push(`${petName} has a coat we'll be caring for through regular hygiene sessions.`);
  }

  // Matting
  if (data.matting && data.matting !== 'None') {
    const mattingMap = {
      'Light tangles': 'some light tangles',
      'Moderate mats': 'moderate matting',
      'Severe mats': 'significant matting'
    };
    let mattingLine = `During our foundational assessment we found ${mattingMap[data.matting] || data.matting.toLowerCase()}`;
    if (data.mat_loc && data.mat_loc.length) {
      const locs = data.mat_loc.map(l => l.toLowerCase()).join(', ');
      mattingLine += ` in the following areas: ${locs}`;
    }
    mattingLine += ' — all areas we\'ll work on consistently.';
    parts.push(mattingLine);
  }

  // Hygiene issues — softened for client
  const hygiene = data.hygiene_issues || data.hygiene || [];
  if (Array.isArray(hygiene) && hygiene.length) {
    const friendly = hygiene.map(h => {
      if (h === 'Ear wax or odour') return 'some ear cleaning needs';
      if (h === 'Eye discharge') return 'some eye discharge';
      if (h === 'Tear staining') return 'tear staining';
      if (h === 'Teeth buildup or gum redness') return 'teeth buildup';
      if (h === 'Body odour') return 'mild body odour';
      if (h === 'Skin redness or flaking') return 'some skin sensitivity';
      if (h === 'Paw grime or irritation') return 'paw care needed';
      return h.toLowerCase();
    });
    if (friendly.length) {
      parts.push(`We also noticed ${friendly.join(', ')}, which we'll address with regular care.`);
    }
  }

  // Behaviour
  if (data.behaviour === 'Very calm' || data.behaviour === 'Mostly calm') {
    parts.push(`${petName} was ${data.behaviour.toLowerCase()} during the session, which makes our work much easier.`);
  } else if (data.behaviour === 'Unsettled') {
    parts.push(`${petName} can feel a little unsettled during sessions. Our team uses gentle, patient handling to help build comfort gradually.`);
  } else if (data.behaviour === 'Difficult') {
    parts.push(`${petName} can feel anxious during sessions and needs gentle, patient handling. We're working on building comfort gradually so they feel safe and at ease.`);
  }

  return parts.join('\n\n');
}

function buildRecommendations(data) {
  const recs = [];

  // Dental
  const hygiene = data.hygiene_issues || data.hygiene || [];
  if (Array.isArray(hygiene)) {
    if (hygiene.includes('Teeth buildup or gum redness') || hygiene.includes('Teeth buildup')) {
      recs.push('amber|dental|Dental check recommended|Some teeth buildup observed — a vet dental check would be ideal in the coming weeks.');
    }
    if (hygiene.includes('Tear staining') || hygiene.includes('Tear staining moderate+')) {
      recs.push("amber|eye|Tear staining noted|We'll continue cleaning at each session. Let us know if it worsens.");
    }
    if (hygiene.includes('Lump, bump, or unusual') || hygiene.includes('Lump or bump')) {
      recs.push('amber|alert|Lump noted — vet check advised|We noticed something that should be looked at by your vet for peace of mind.');
    }
    if (hygiene.includes('Skin redness or flaking')) {
      recs.push("amber|skin|Skin sensitivity noted|We'll use gentle products and keep an eye on this. Let your vet know if it persists.");
    }
    if (hygiene.includes('Ear wax or odour')) {
      recs.push("amber|ear|Ear care recommended|We'll clean carefully at each session. A vet check may be worthwhile.");
    }
  }

  // Behaviour
  if (data.behaviour === 'Difficult' || data.behaviour === 'Unsettled') {
    recs.push("purple|heart|Gentle handling for anxiety|We use slow, patient handling to help build comfort gradually.");
  }

  // Matting
  if (data.matting === 'Severe mats') {
    recs.push("amber|scissors|Significant matting being addressed|We're working through this carefully — frequency may be higher initially.");
  }

  return recs.join('\n');
}

function determineFrequency(data) {
  // Recommended frequency from foundational form
  if (data.freq) return data.freq;

  // Or infer from severity
  if (data.matting === 'Severe mats' || data.matting === 'Moderate mats') return '3x per week';
  if (data.plan === 'Hygiene + Deshedding') return '3x per week';
  return '2x per week';
}

function computeVanDate() {
  // Default: 14 days from today
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().split('T')[0];
}

async function autoGenerateCarePlan(petId, formType, data, host, protocol) {
  // Only auto-generate after Foundational sessions
  if (formType !== 'Foundational') return;
  if (!petId) return;

  try {
    // Check what's already on the pet record — don't overwrite manual edits
    const petRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${PETS_TABLE}/${petId}`,
      { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const petRecord = await petRes.json();
    if (!petRes.ok) return;

    const existing = petRecord.fields || {};
    const updates = {};

    // Client-Facing Assessment — only fill if empty
    if (!existing['Client-Facing Assessment']) {
      updates['fldvBVsTx87YAgOFs'] = buildAssessment(data);
    }

    // Key Recommendations — only fill if empty
    if (!existing['Key Recommendations']) {
      const recs = buildRecommendations(data);
      if (recs) updates['fldKnOXTd7E0uoH9J'] = recs;
    }

    // Touch-up Frequency — only fill if empty
    if (!existing['Touch-up Frequency']) {
      updates['fld7FOan1NW21nQjU'] = determineFrequency(data);
    }

    // Van Maintenance Date — only fill if empty
    if (!existing['Van Maintenance Approximate Planned Date']) {
      updates['fldZH7IzWdhxV7x7v'] = computeVanDate();
    }

    // Care Plan URL — always set (overwrite if needed)
    updates['fld8BlMseqbleVBVy'] = `${protocol}://${host}/api/care-plan?id=${petId}`;

    // Also save plan type if not set
    if (!existing['Plan Type'] && data.plan) {
      const planValue = data.plan === 'Hygiene + Deshedding' ? 'Hygiene+Deshedding' : 'Hygien';
      updates['fld1tFXaLLvP2PLAS'] = planValue;
    }

    // Save Assessment Results too (raw, from groomer's eyes)
    if (!existing['Assessment Results']) {
      const rawParts = [];
      if (data.coat_notes) rawParts.push('Coat notes: ' + data.coat_notes);
      if (data.undercoat_notes) rawParts.push('Undercoat: ' + data.undercoat_notes);
      if (data.beh_detail) rawParts.push('Behaviour notes: ' + data.beh_detail);
      if (data.handling) rawParts.push('Handling: ' + data.handling);
      if (rawParts.length) updates['fldG5L98JbK9nzkXz'] = rawParts.join('\n\n');
    }

    if (Object.keys(updates).length > 0) {
      await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${PETS_TABLE}/${petId}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: updates })
        }
      );
    }
  } catch (err) {
    console.error('Auto-generate care plan failed:', err);
  }
}

// ------ MAIN HANDLER ------

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { formType, data, photos } = req.body;
    if (!formType || !data) return res.status(400).json({ error: 'Missing formType or data' });

    const title = `${formType} — ${data.pet || 'Unknown'} — ${new Date().toLocaleDateString('en-GB')}`;
    const today = new Date().toISOString().split('T')[0];
    const host = req.headers.host || 'project-3kvtp.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';

    const dataWithPhotos = { ...data, _photos: photos || [] };
    const dataJSON = JSON.stringify(dataWithPhotos);

    const attachments = (photos || []).map(p => ({ url: p.url, filename: p.label || 'photo.jpg' }));

    const fields = {
      fld7DfcCNsFnXf8jH: title,
      fld0KkqZYiBoQ4kR7: 'Completed',
      fldJ9txpb878bmnEI: today,
      fldOiH9bAL6dX1kVU: dataJSON.substring(0, 95000),
      fld74QIUYGa1IQsT8: data.groomer || '',
      fldzVNW1nYk1yekvR: formType
    };

    if (attachments.length > 0) {
      fields[ATTACHMENTS_FIELD] = attachments;
    }

    if (data._petId) {
      fields['fldyMH0z8cXA4aJfI'] = [data._petId];
    }

    const createRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${QUESTIONNAIRES_TABLE}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });

    const createResult = await createRes.json();
    if (!createRes.ok) {
      return res.status(400).json({ error: 'Airtable create failed', details: createResult });
    }

    const recordId = createResult.id;
    const reportUrl = `${protocol}://${host}/api/report?id=${recordId}`;

    await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${QUESTIONNAIRES_TABLE}/${recordId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { flddUyGK9cWl0G9Xv: reportUrl } })
    });

    // Auto-generate care plan if this is a Foundational session
    await autoGenerateCarePlan(data._petId, formType, data, host, protocol);

    return res.status(200).json({ success: true, recordId, reportUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
