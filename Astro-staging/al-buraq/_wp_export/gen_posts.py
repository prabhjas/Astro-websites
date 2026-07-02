import re, os, glob

def localize(h):
    h=re.sub(r'<script[^>]*cdn-cgi[^>]*>.*?</script>',' ',h,flags=re.S)
    h=re.sub(r'<script[^>]*>[^<]*?(gtag|googletagmanager|google-analytics|wpemoji|_wpemojiSettings)[^<]*?</script>',' ',h,flags=re.S|re.I)
    h=re.sub(r'<script[^>]*src="[^"]*(cdn-cgi|gtag|googletagmanager|google-analytics)[^"]*"[^>]*>\s*</script>',' ',h,flags=re.I)
    h=h.replace('/cdn-cgi/l/email-protection','#')
    h=h.replace('https://alburaq.ae','').replace('http://alburaq.ae','')
    h=h.replace('https:\\/\\/alburaq.ae','').replace('http:\\/\\/alburaq.ae','')
    h=re.sub(r'(?<![:a-zA-Z])//alburaq\.ae','',h)
    h=h.replace('/wp-content/uploads/','/images/')
    h=h.replace('\\/wp-content\\/uploads\\/','\\/images\\/')
    h=re.sub(r'<span class="__cf_email__"[^>]*>.*?</span>','info@alburaq.ae',h,flags=re.S)
    h=h.replace('[email\xa0protected]','info@alburaq.ae').replace('[email&#160;protected]','info@alburaq.ae')
    return h

os.makedirs('../src/mirror/posts', exist_ok=True)
RESERVED={'contact-us','about-us','what-we-do','blog','licensing','corporate-sponsorship',
          'business-center','payroll-outsourcing','outsourcing','privacy-policy','terms'}
made=0; skipped=[]
for f in sorted(glob.glob('html/posts/*.html')):
    slug=os.path.basename(f)[:-5]
    data=open(f,encoding='utf-8',errors='ignore').read()
    if len(data)<5000 or '<title' not in data.lower():
        skipped.append((slug,'too small/invalid')); continue
    if slug in RESERVED:
        skipped.append((slug,'reserved')); continue
    open(f'../src/mirror/posts/{slug}.html','w',encoding='utf-8').write(localize(data))
    d=f'../src/pages/{slug}'
    os.makedirs(d, exist_ok=True)
    open(f'{d}/index.astro','w',encoding='utf-8').write(
        f"---\n// {slug} = faithful mirror of live alburaq.ae/{slug}/ (blog post)\n"
        f"import html from '../../mirror/posts/{slug}.html?raw';\n---\n<Fragment set:html={{html}} />\n")
    made+=1
print(f"generated {made} post pages; skipped {len(skipped)}")
for s in skipped: print("  skip:",s)
