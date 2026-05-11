const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const PETS_TABLE = 'tblAMDOwnSChJCZ2s';
const QUESTIONNAIRES_TABLE = 'tblqZiJuTUNbqoptR';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { petId } = req.query || {};
  if (!petId) return res.status(400).json({ error: 'Missing petId' });

  try {
    // Fetch pet record
    const petRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${PETS_TABLE}/${petId}`,
      { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const petData = await petRes.json();
    if (!petRes.ok) return res.status(404).json({ error: petData });

    const f = petData.fields;
    const pet = {
      id: petData.id,
      name: f['Pet Name'] || '—',
      breed: f['Breed'] || '',
      owner: f['Owner Name'] || '',
      phone: f['Phone Number'] || '',
      plan: f['Plan Type'] || '',
      target: f['Target Outcome'] || '',
      totalSessions: f['Total Sessions'] || 0,
      lastSession: f['Last Session Date'] || null,
      latestScore: f['Latest AI Progress Score'] || null,
      questionnaireIds: f['Questionnaires'] || []
    };

    // Fetch related questionnaires (last 5)
    const qIds = (pet.questionnaireIds || []).slice(-5).reverse();
    const questionnaires = [];
    for (const qid of qIds) {
      try {
        const qRes = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${QUESTIONNAIRES_TABLE}/${qid}`,
          { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
        );
        const qData = await qRes.json();
        if (qRes.ok) {
          questionnaires.push({
            id: qData.id,
            title: qData.fields['Title'] || '',
            formType: qData.fields['Form Type'] || '',
            groomer: qData.fields['Groomer'] || '',
            date: qData.fields['Date Submitted'] || '',
            reportUrl: qData.fields['Vercel Link'] || ''
          });
        }
      } catch(e) {}
    }

    return res.status(200).json({ pet, questionnaires });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
