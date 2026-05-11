const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const PETS_TABLE = 'tblAMDOwnSChJCZ2s';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${PETS_TABLE}?pageSize=100`,
      { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await response.json();
    if (!response.ok) return res.status(400).json({ error: data });

    const pets = (data.records || []).map(r => ({
      id: r.id,
      name: r.fields['Pet Name'] || '—',
      breed: r.fields['Breed'] || '',
      owner: r.fields['Owner Name'] || '',
      plan: r.fields['Plan Type'] || '',
      target: r.fields['Target Outcome'] || '',
      totalSessions: r.fields['Total Sessions'] || 0,
      lastSession: r.fields['Last Session Date'] || null,
      latestScore: r.fields['Latest AI Progress Score'] || null
    }));

    return res.status(200).json({ pets });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
