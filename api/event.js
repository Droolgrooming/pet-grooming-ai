const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const EVENT_LEADS_TABLE = 'tblRq3FgOkfvXjp0r';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const d = req.body || {};
    if (!d.owner_name || !d.pet_name) {
      return res.status(400).json({ error: 'Owner name and pet name are required' });
    }

    const host = req.headers.host || 'project-3kvtp.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const today = new Date().toISOString().split('T')[0];

    const assessmentJSON = JSON.stringify({
      owner_name: d.owner_name,
      phone: d.phone,
      area: d.area,
      pet_name: d.pet_name,
      breed: d.breed,
      age: d.age,
      coat: d.coat,
      matting: d.matting,
      shedding: d.shedding,
      concerns: d.concerns || [],
      behaviour: d.behaviour,
      programme: d.programme,
      frequency: d.frequency,
      notes: d.notes,
      created_at: new Date().toISOString()
    });

    // Use field IDs for maximum reliability
    const createRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${EVENT_LEADS_TABLE}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            fldqZfkPr3r4jeAIg: d.pet_name,          // Name (primary)
            fldYQ1PmnKwKHoII8: d.pet_name,          // Pet Name
            fldN47lxreUuAJqQZ: d.owner_name,        // Owner Name
            fld9VO471alfF5cNO: d.phone,             // Phone
            fld0yogd1GaxEV4kE: d.area,              // Area
            fldFv2nakVkYWxt2w: d.breed,             // Breed
            fldvJWQBR7gBpgS0G: d.age || '',         // Age
            fldDP3ck17iedn43r: d.coat || '',        // Coat Condition
            fldRfT8kP7tkadAen: d.matting || '',     // Matting
            fldALscFpTQKeMuez: d.shedding || '',    // Shedding
            flduM6L47IPWjVt1K: d.behaviour || '',   // Behaviour
            fldVa8v949TlByZFA: d.programme || '',   // Recommended Programme
            fldj0D0ojLZcgjimf: d.frequency || '',   // Recommended Frequency
            fld3WaLyBIA8dd24i: (d.concerns || []).join(', '),  // Concerns
            flduuh4pebsMcTM6L: d.notes || '',       // Notes
            flddojqz2Ds8SLucT: today,               // Date
            fldF0eKqOq50NYgzd: assessmentJSON       // Assessment Data
          }
        })
      }
    );

    const result = await createRes.json();
    if (!createRes.ok) {
      return res.status(400).json({ error: 'Airtable save failed', details: result });
    }

    const recordId = result.id;
    const planUrl = `${protocol}://${host}/api/event-plan?id=${recordId}`;

    await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${EVENT_LEADS_TABLE}/${recordId}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { fldU1xKesBwsd3hgF: planUrl } })  // Plan URL
      }
    );

    return res.status(200).json({ success: true, recordId, planUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
