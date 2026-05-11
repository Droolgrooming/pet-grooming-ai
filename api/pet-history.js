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
    const petRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${PETS_TABLE}/${petId}`,
      { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const petData = await petRes.json();
    if (!petRes.ok) return res.status(404).json({ error: petData });

    const f = petData.fields;
    const questionnaireIds = f['Questionnaires'] || [];

    // Fetch ALL questionnaires for this pet
    const questionnaires = [];
    for (const qid of questionnaireIds) {
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
            reportUrl: qData.fields['Vercel Link'] || '',
            fullAnswers: qData.fields['Full Answers'] || ''
          });
        }
      } catch(e) {}
    }

    // Sort by date descending (most recent first)
    questionnaires.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Compute stats from questionnaires directly
    const totalSessions = questionnaires.length;
    const lastSession = questionnaires.length > 0 ? questionnaires[0].date : null;

    // Detect attention flags by scanning Full Answers for concerning signals
    const attentionFlags = [];
    for (const q of questionnaires.slice(0, 3)) {
      try {
        const data = JSON.parse(q.fullAnswers || '{}');
        // Severe matting
        const matting = data.matting || data.mat_before;
        if (matting === 'Severe mats' || matting === 'Moderate mats') {
          attentionFlags.push({ session: q.date, issue: `${matting} noted`, severity: 'amber' });
        }
        // Difficult behaviour
        if (data.behaviour === 'Difficult') {
          attentionFlags.push({ session: q.date, issue: 'Difficult behaviour', severity: 'red' });
        }
        // Senior review needed
        if (data.hyg_sev === 'Needs senior review') {
          attentionFlags.push({ session: q.date, issue: 'Hygiene needs senior review', severity: 'red' });
        }
        // Incident
        if (data.incident === 'Yes') {
          attentionFlags.push({ session: q.date, issue: 'Incident reported', severity: 'red' });
        }
        // Lump or bump
        const hyg = data.hygiene_issues || data.hygiene || [];
        if (Array.isArray(hyg) && hyg.includes('Lump or bump')) {
          attentionFlags.push({ session: q.date, issue: 'Lump or bump noted', severity: 'red' });
        }
      } catch(e) {}
    }

    const pet = {
      id: petData.id,
      name: f['Pet Name'] || '—',
      breed: f['Breed'] || '',
      owner: f['Owner Name'] || '',
      phone: f['Phone Number'] || '',
      plan: f['Plan Type'] || '',
      target: f['Target Outcome'] || '',
      totalSessions,
      lastSession,
      latestScore: f['Latest AI Progress Score'] || null,
      attentionFlags
    };

    return res.status(200).json({ pet, questionnaires });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
