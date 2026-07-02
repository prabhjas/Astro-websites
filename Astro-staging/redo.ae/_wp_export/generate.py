import re, os, glob

ROOT='/opt/Astro-staging/redo.ae'
DOMAIN='redo.ae'

def localize(h):
    h=h.replace('/cdn-cgi/l/email-protection','#')
    h=h.replace(f'https://{DOMAIN}','').replace(f'http://{DOMAIN}','')
    h=h.replace(f'https:\\/\\/{DOMAIN}','').replace(f'http:\\/\\/{DOMAIN}','')
    h=re.sub(r'(?<![:a-zA-Z])//'+re.escape(DOMAIN),'',h)
    h=h.replace('/wp-content/uploads/','/images/').replace('\\/wp-content\\/uploads\\/','\\/images\\/')
    h=h.replace('/wp-includes/','/assets/wp-includes/').replace('\\/wp-includes\\/','\\/assets\\/wp-includes\\/')
    h=h.replace('/wp-content/','/assets/').replace('\\/wp-content\\/','\\/assets\\/')
    h=re.sub(r'<span class="__cf_email__"[^>]*>.*?</span>','info@redo.ae',h,flags=re.S)
    h=h.replace('[email\xa0protected]','info@redo.ae').replace('[email&#160;protected]','info@redo.ae')
    return h

def strip_scripts(h):
    h=re.sub(r'<script\b.*?</script>',' ',h,flags=re.S|re.I)
    h=re.sub(r'<script\b[^>]*>',' ',h,flags=re.I)
    h=re.sub(r'<link\b[^>]*(?:as=["\']?script|modulepreload|wp-json|api\.w\.org|oembed)[^>]*>',' ',h,flags=re.I)
    return h

def build(src,dst):
    h=strip_scripts(localize(open(src,encoding='utf-8',errors='ignore').read()))
    os.makedirs(os.path.dirname(dst),exist_ok=True)
    open(dst,'w',encoding='utf-8').write(h)

# page slugs (filenames in html/)
page_files=[f for f in glob.glob(ROOT+'/_wp_export/html/*.html')]
page_slugs=set(os.path.basename(f)[:-5] for f in page_files)
for f in page_files:
    slug=os.path.basename(f)[:-5]
    build(f, f'{ROOT}/src/mirror/{slug}.html')

np=0
for f in glob.glob(ROOT+'/_wp_export/html/posts/*.html'):
    slug=os.path.basename(f)[:-5]
    if slug in page_slugs: continue
    data=open(f,encoding='utf-8',errors='ignore').read()
    if len(data)<3000 or '<title' not in data.lower(): continue
    build(f, f'{ROOT}/src/mirror/posts/{slug}.html'); np+=1
print(f"pages mirrored: {len(page_slugs)} | posts mirrored: {np}")

# Generate Astro pages
def astro_page(import_rel, comment):
    return f"---\n// {comment}\nimport html from '{import_rel}?raw';\n---\n<Fragment set:html={{html}} />\n"
# home
open(f'{ROOT}/src/pages/index.astro','w').write(astro_page('../mirror/home.html','home (mirror of redo.ae/)'))
for slug in sorted(page_slugs):
    if slug=='home': continue
    os.makedirs(f'{ROOT}/src/pages/{slug}',exist_ok=True)
    open(f'{ROOT}/src/pages/{slug}/index.astro','w').write(astro_page(f'../../mirror/{slug}.html',f'{slug} (mirror)'))
posts=[os.path.basename(f)[:-5] for f in glob.glob(ROOT+'/src/mirror/posts/*.html')]
for slug in posts:
    os.makedirs(f'{ROOT}/src/pages/{slug}',exist_ok=True)
    open(f'{ROOT}/src/pages/{slug}/index.astro','w').write(astro_page(f'../../mirror/posts/{slug}.html',f'{slug} (blog post mirror)'))
print(f"astro pages: 1 home + {len(page_slugs)-1} pages + {len(posts)} posts")
