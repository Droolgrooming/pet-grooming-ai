const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const QUESTIONNAIRES_TABLE = 'tblqZiJuTUNbqoptR';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { formType, data } = req.body;
  const title = `${formType} — ${data.pet || 'Unknown'} — ${new Date().toLocaleDateString()}`;

  const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${QUESTIONNAIRES_TABLE}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        fld7DfcCNsFnXf8jH: title,
        fld0KkqZYiBoQ4kR7: 'Completed',
        fldJ9txpb878bmnEI: new Date().toISOString().split('T')[0],
        flddUyGK9cWl0G9Xv: `Form: ${formType} | Pet: ${data.pet || '—'} | Groomer: ${data.groomer || '—'}`
      }
    })
  });

  const result = await response.json();
  return res.status(response.ok ? 200 : 400).json(result);
};
