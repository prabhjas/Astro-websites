import re, os, glob
ROOT='/opt/Astro-staging/redo.ae'; DOMAIN='redo.ae'
HANDLER=open('/tmp/claude-0/-opt/219ece65-e6ae-4e96-bb79-b608f94e1b9f/scratchpad/redo_handler.html').read()

def localize(h):
    h=h.replace('/cdn-cgi/l/email-protection','#')
    for p in (f'https://{DOMAIN}',f'http://{DOMAIN}',f'https:\\/\\/{DOMAIN}',f'http:\\/\\/{DOMAIN}'): h=h.replace(p,'')
    h=re.sub(r'(?<![:a-zA-Z])//'+re.escape(DOMAIN),'',h)
    h=h.replace('/wp-content/uploads/','/images/').replace('\\/wp-content\\/uploads\\/','\\/images\\/')
    h=h.replace('/wp-includes/','/assets/wp-includes/').replace('\\/wp-includes\\/','\\/assets\\/wp-includes\\/')
    h=h.replace('/wp-content/','/assets/').replace('\\/wp-content\\/','\\/assets\\/')
    h=re.sub(r'<span class="__cf_email__"[^>]*>.*?</span>','info@redo.ae',h,flags=re.S)
    return h
def strip_scripts(h):
    h=re.sub(r'<script\b.*?</script>',' ',h,flags=re.S|re.I)
    h=re.sub(r'<script\b[^>]*>',' ',h,flags=re.I)
    h=re.sub(r'<link\b[^>]*(?:as=["\']?script|modulepreload|wp-json|api\.w\.org|oembed)[^>]*>',' ',h,flags=re.I)
    return h
def de_lazy(h):
    def fimg(m):
        t=m.group(0)
        for da,at in (('data-lazy-src','src'),('data-lazy-srcset','srcset')):
            mm=re.search(da+r'="([^"]*)"',t)
            if mm:
                u=mm.group(1)
                if re.search(r'\s'+at+r'="[^"]*"',t): t=re.sub(r'\s'+at+r'="[^"]*"',' '+at+'="'+u.replace('\\','\\\\')+'"',t,count=1)
                else: t=t[:-1]+' '+at+'="'+u+'">'
        return t
    h=re.sub(r'<img\b[^>]*>',fimg,h)
    def fbg(m):
        t=m.group(0); mm=re.search(r'data-bg="([^"]*)"',t)
        if not mm: return t
        u=mm.group(1)
        if re.search(r'\sstyle="[^"]*"',t): t=re.sub(r'\sstyle="([^"]*)"',lambda x:' style="background-image:url(\''+u+'\');'+x.group(1)+'"',t,count=1)
        else: t=t[:-1]+' style="background-image:url(\''+u+'\')">'
        return t
    return re.sub(r'<[a-zA-Z][^>]*\bdata-bg="[^"]*"[^>]*>',fbg,h)
def inject(h):
    if 'wpcf7-form' not in h: return h
    return h.replace('</body>',HANDLER+'</body>',1) if '</body>' in h else h+HANDLER

def process(raw): return inject(de_lazy(strip_scripts(localize(raw))))

page_files=glob.glob(ROOT+'/_wp_export/html/*.html')
page_slugs=set(os.path.basename(f)[:-5] for f in page_files)
for f in page_files:
    slug=os.path.basename(f)[:-5]
    open(f'{ROOT}/src/mirror/{slug}.html','w',encoding='utf-8').write(process(open(f,encoding='utf-8',errors='ignore').read()))
np=0
for f in glob.glob(ROOT+'/_wp_export/html/posts/*.html'):
    slug=os.path.basename(f)[:-5]
    if slug in page_slugs: continue
    data=open(f,encoding='utf-8',errors='ignore').read()
    if len(data)<3000 or '<title' not in data.lower(): continue
    os.makedirs(f'{ROOT}/src/mirror/posts',exist_ok=True)
    open(f'{ROOT}/src/mirror/posts/{slug}.html','w',encoding='utf-8').write(process(data)); np+=1

def page(rel,c): return f"---\n// {c}\nimport html from '{rel}?raw';\n---\n<Fragment set:html={{html}} />\n"
open(f'{ROOT}/src/pages/index.astro','w').write(page('../mirror/home.html','home'))
for slug in sorted(page_slugs):
    if slug=='home': continue
    os.makedirs(f'{ROOT}/src/pages/{slug}',exist_ok=True)
    open(f'{ROOT}/src/pages/{slug}/index.astro','w').write(page(f'../../mirror/{slug}.html',slug))
for f in glob.glob(ROOT+'/src/mirror/posts/*.html'):
    slug=os.path.basename(f)[:-5]
    os.makedirs(f'{ROOT}/src/pages/{slug}',exist_ok=True)
    open(f'{ROOT}/src/pages/{slug}/index.astro','w').write(page(f'../../mirror/posts/{slug}.html',slug))
print(f"pages: {len(page_slugs)} | posts: {np}")
