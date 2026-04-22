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

  // Build full readable answers
  const skipFields = ['__submitted'];
  const lines = [];
  for (const [key, val] of Object.entries(data)) {
    if (skipFields.includes(key)) continue;
    if (Array.isArray(val) && val.length > 0) lines.push(`${key}: ${val.join(', ')}`);
    else if (val && !Array.isArray(val)) lines.push(`${key}: ${val}`);
  }
  const fullAnswers = lines.join('\n');

  try {
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
          fldOiH9bAL6dX1kVU: fullAnswers,
          fld74QIUYGa1IQsT8: data.groomer || '',
          fldzVNW1nYk1yekvR: formType
        }
      })
    });

    const result = await response.json();
    if (!response.ok) return res.status(400).json({ error: result });
    return res.status(200).json({ success: true, record: result.id });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
