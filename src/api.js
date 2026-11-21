// Small frontend integration point for SOLVIX pages.
// No backend responses are faked here; outcomes are surfaced from the actual fetch.
export async function postJson(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res;
}
