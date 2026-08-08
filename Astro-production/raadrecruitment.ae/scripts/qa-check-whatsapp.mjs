const live = await (
  await fetch("https://ngmanpower.com/?nowprocket=1", { headers: { "User-Agent": "Mozilla/5.0" } })
).text();
const local = await (await fetch("http://127.0.0.1:5102/")).text();
for (const [label, html] of [
  ["live", live],
  ["local", local],
]) {
  const hits = html.match(/whatsapp|wa\.me|joinchat|sp-float|floating/gi) || [];
  console.log(label, { count: hits.length, sample: [...new Set(hits)].slice(0, 12) });
  const m = html.match(/https?:\/\/wa\.me\/[0-9]+[^"'\s]*/);
  console.log(label, "wa link", m?.[0]);
}
