export const config = { runtime: 'edge' };

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const TABLES = {
  questionnaires: 'tblqZiJuTUNbqoptR',
  sessions: 'tbltRx1oKk5lVtPv9',
  pets: 'tblAMDOwnSChJCZ2s',
};

const FIELDS = {
  session: {
    aiProgressScore: 'fldq3RXEKHaWSX4cw',
    behaviorNotes: 'fldgx23VDUWCsxCS0',
    coatCondition: 'fldUFGJCqJdGZdjfg',
    hygieneScore: 'fldCpM0osw9TGE6AL',
    petLink: 'fldT2uOS1SuMsUa9H',
  },
  questionnaire: {
    status: 'fld0KkqZYiBoQ4kR7',
    vercelLink: 'flddUyGK9cWl0G9Xv',
    sessionLink: 'fldJ93YiZt4siK0m7',
    petLink: 'fldyMH0z8cXA4aJfI',
    dateSubmitted: 'fldJ9txpb878bmnEI',
  },
  pet: {
    targetOutcome: 'fldLXnDIPWrCKiZpz',
    petName: 'fldm0ikJ5EBIosJt3',
  },
};

async function airtableGet(tableId, recordId) {
  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableId}/${recordId}`,
    { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
  );
  return res.json();
}

async function airtableUpdate(tableId, recordId, fields) {
  await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableId}/${recordId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    }
  );
}

async function scoreWithClaude(data) {
  const prompt = `You are an expert pet grooming progress assessor. Based on the questionnaire responses below, provide:
1. An AI Progress Score (0-100) reflecting overall grooming progress toward the target outcome
2. A brief behavior summary (1-2 sentences)
3. A customer-friendly message (2-3 sentences)

Pet: ${data.petName}
Target Outcome: ${data.targetOutcome}
Coat Condition: ${data.coatCondition}
Hygiene Score: ${data.hygieneScore}/10
Behavior Notes: ${data.behaviorNotes}
Questionnaire Responses: ${JSON.stringify(data.responses)}

Respond ONLY in this JSON format (no markdown, no extra text):
{
  "aiProgressScore": <number 0-100>,
  "behaviorSummary": "<summary>",
  "customerMessage": "<message>"
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const result = await res.json();
  const text = result.content[0].text.trim();
  return JSON.parse(text);
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const { questionnaireId, sessionId, petId, responses } = body;

    // Fetch session and pet data from Airtable
    const [sessionRecord, petRecord] = await Promise.all([
      airtableGet(TABLES.sessions, sessionId),
      airtableGet(TABLES.pets, petId),
    ]);

    const sessionFields = sessionRecord.fields;
    const petFields = petRecord.fields;

    // Score with Claude
    const scored = await scoreWithClaude({
      petName: petFields[FIELDS.pet.petName],
      targetOutcome: petFields[FIELDS.pet.targetOutcome],
      coatCondition: sessionFields[FIELDS.session.coatCondition],
      hygieneScore: sessionFields[FIELDS.session.hygieneScore],
      behaviorNotes: sessionFields[FIELDS.session.behaviorNotes],
      responses,
    });

    // Write score back to Session record
    await airtableUpdate(TABLES.sessions, sessionId, {
      [FIELDS.session.aiProgressScore]: scored.aiProgressScore,
    });

    // Update Questionnaire status
    await airtableUpdate(TABLES.questionnaires, questionnaireId, {
      [FIELDS.questionnaire.status]: 'Completed',
      [FIELDS.questionnaire.dateSubmitted]: new Date().toISOString().split('T')[0],
    });

    return new Response(JSON.stringify({ success: true, scored }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
