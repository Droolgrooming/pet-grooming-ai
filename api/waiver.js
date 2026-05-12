const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const QUESTIONNAIRES_TABLE = 'tblqZiJuTUNbqoptR';
const PETS_TABLE = 'tblAMDOwnSChJCZ2s';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const data = req.body || {};
    if (!data.owner_name || !data.pet_name) {
      return res.status(400).json({ error: 'Owner name and pet name are required' });
    }

    // Step 1: Find or create the pet
    const petName = data.pet_name.trim();
    let petId = null;

    const searchRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${PETS_TABLE}?filterByFormula=${encodeURIComponent(`LOWER({Pet Name})="${petName.toLowerCase().replace(/"/g, '\\"')}"`)}`,
      { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const searchResult = await searchRes.json();

    if (searchResult.records && searchResult.records.length > 0) {
      petId = searchResult.records[0].id;
    } else {
      // Create the pet
      const createPetRes = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${PETS_TABLE}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              fldm0ikJ5EBIosJt3: petName,
              fld2k79Ss5bWDyRsM: data.breed || '',
              fldIb7pzbIYOVw05l: data.owner_name || ''
            }
          })
        }
      );
      const newPet = await createPetRes.json();
      if (createPetRes.ok) petId = newPet.id;
    }

    // Step 2: Create the waiver record in Questionnaires table
    const today = new Date().toISOString().split('T')[0];
    const title = `Waiver — ${data.pet_name} — ${new Date().toLocaleDateString('en-GB')}`;
    const host = req.headers.host || 'project-3kvtp.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';

    const waiverData = {
      owner_name: data.owner_name,
      phone: data.phone,
      pet_name: data.pet_name,
      breed: data.breed,
      age: data.age,
      pet_type: data.pet_type,
      health: data.health,
      behaviour: data.behaviour,
      vaccinations: data.vaccinations,
      no_aggression: data.no_aggression,
      stress_pause: data.stress_pause,
      aggression_termination: data.aggression_termination,
      photo_video: data.photo_video,
      marketing: data.marketing,
      full_name: data.full_name,
      agree_final: data.agree_final,
      signed_at: new Date().toISOString()
    };

    const fields = {
      fld7DfcCNsFnXf8jH: title,
      fld0KkqZYiBoQ4kR7: 'Completed',
      fldJ9txpb878bmnEI: today,
      fldOiH9bAL6dX1kVU: JSON.stringify(waiverData),
      fld74QIUYGa1IQsT8: data.owner_name || '',
      fldzVNW1nYk1yekvR: 'Waiver'
    };

    if (petId) {
      fields['fldyMH0z8cXA4aJfI'] = [petId];
    }

    const createRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${QUESTIONNAIRES_TABLE}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
      }
    );

    const createResult = await createRes.json();
    if (!createRes.ok) {
      return res.status(400).json({ error: 'Could not save waiver', details: createResult });
    }

    const recordId = createResult.id;
    const waiverUrl = `${protocol}://${host}/api/waiver-view?id=${recordId}`;

    await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${QUESTIONNAIRES_TABLE}/${recordId}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { flddUyGK9cWl0G9Xv: waiverUrl } })
      }
    );

    // Also update the Pet record with the waiver URL (overwrites previous waiver, always shows latest)
    if (petId) {
      await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${PETS_TABLE}/${petId}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { fldwKfXxRo2Vt946p: waiverUrl } })
        }
      );
    }

    return res.status(200).json({ success: true, recordId, waiverUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
