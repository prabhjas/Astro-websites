const payload = {
  'your-name': 'Form Pipeline Test',
  'your-email': 'form-pipeline-test@example.com',
  'phonetext-257': '+971509991234',
  'your-message': 'End-to-end Pipedrive connection test',
  form_name: 'Emiratisation Gateway Contact Form',
  page_url: 'http://127.0.0.1:5106/contact-us/',
};

const res = await fetch('http://127.0.0.1:5106/api/contact/', {
  method: 'POST',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Origin: 'http://127.0.0.1:5106',
    Referer: 'http://127.0.0.1:5106/contact-us/',
  },
  body: JSON.stringify(payload),
});
const text = await res.text();
console.log('status', res.status);
console.log(text);
