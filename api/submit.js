export const config = { runtime: 'edge' };

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const QUESTIONNAIRES_TABLE = 'tblqZiJuTUNbqoptR';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await req.json();
  const { formType, data } = body;

  const title = `${formType} — ${data.pet || 'Unknown'} — ${new Date().toLocaleDateString()}`;

  const payload = {
    fields: {
      fld7DfcCNsFnXf8jH: title,
      fld0KkqZYiBoQ4kR7: 'Completed',
      fldJ9txpb878bmnEI: new Date().toISOString().split('T')[0],
      flddUyGK9cWl0G9Xv: `Form: ${formType} | Pet: ${data.pet || '—'} | Groomer: ${data.groomer || '—'}`
    }
  };

  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${QUESTIONNAIRES_TABLE}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  const result = await res.json();
  return new Response(JSON.stringify(result), {
    status: res.ok ? 200 : 400,
    headers: { 'Content-Type': 'application/json' }
  });
}
