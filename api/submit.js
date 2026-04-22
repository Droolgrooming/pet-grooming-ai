const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const QUESTIONNAIRES_TABLE = 'tblqZiJuTUNbqoptR';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { formType, data, photos } = req.body;
  if (!formType || !data) return res.status(400).json({ error: 'Missing formType or data' });

  const title = `${formType} — ${data.pet || 'Unknown'} — ${new Date().toLocaleDateString('en-GB')}`;
  const today = new Date().toISOString().split('T')[0];
  const host = req.headers.host || 'project-3kvtp.vercel.app';
  const protocol = host.includes('localhost') ? 'http' : 'https';

  try {
    const airtableRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${QUESTIONNAIRES_TABLE}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          fld7DfcCNsFnXf8jH: title,
          fld0KkqZYiBoQ4kR7: 'Completed',
          fldJ9txpb878bmnEI: today,
          fldOiH9bAL6dX1kVU: JSON.stringify(data),
          fldQj73GyFTkP4DrB: JSON.stringify(photos || []),
          fld74QIUYGa1IQsT8: data.groomer || '',
          fldzVNW1nYk1yekvR: formType
        }
      })
    });

    const result = await airtableRes.json();
    if (!airtableRes.ok) return res.status(400).json({ error: result });

    const recordId = result.id;
    const reportUrl = `${protocol}://${host}/api/report?id=${recordId}`;

    await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${QUESTIONNAIRES_TABLE}/${recordId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { flddUyGK9cWl0G9Xv: reportUrl } })
    });

    return res.status(200).json({ success: true, recordId, reportUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
