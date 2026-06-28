import { storage } from './storage.js';

const NAME_KEY = 'dicteeStudentName';

export function getStudentName() {
  return storage.get(NAME_KEY, '');
}

export function setStudentName(name) {
  storage.set(NAME_KEY, name.trim());
}

export async function sendResult(result, settings) {
  const endpoint = settings && settings.resultEndpoint ? settings.resultEndpoint.trim() : '';
  if (!endpoint) return false;

  const payload = {
    naam: result.studentName || '',
    woordpakket: result.packageTitle,
    score: result.score,
    totaal: result.total,
    fouten: (result.mistakes || []).join(', '),
    datum: result.date
  };

  try {
    await fetch(endpoint, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return true;
  } catch {
    return false;
  }
}
