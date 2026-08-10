const live = await (
  await fetch("/?nowprocket=1", { headers: { "User-Agent": "NG/1.0" } })
).text();

// Find SmartSliderSimple / n2-ss-2 init
const patterns = [
  /SmartSliderSimple\([\s\S]{0,5000}\)/g,
  /new\s+_N2\.[\s\S]{0,2000}n2-ss-2[\s\S]{0,3000}/gi,
  /_N2\.r\([\s\S]{0,500}?n2-ss-2[\s\S]{0,4000}\)/gi,
  /<script[^>]*>[\s\S]*?n2-ss-2[\s\S]*?SmartSlider[\s\S]*?<\/script>/gi,
  /window\['_N2'\][\s\S]{0,500}/gi,
];

for (const re of patterns) {
  const m = [...live.matchAll(re)];
  console.log("\nPATTERN", re.toString().slice(0, 60), "hits", m.length);
  for (const x of m.slice(0, 2)) console.log(x[0].slice(0, 800));
}

// Also search for ss3-force or data-ssid init attributes
const near = live.indexOf('data-ssid="2"');
console.log("\nNEAR SLIDER END scripts:");
console.log(live.slice(near, near + 12000).match(/<script[\s\S]*?<\/script>/gi)?.slice(0, 8)?.map((s) => s.slice(0, 400)));
