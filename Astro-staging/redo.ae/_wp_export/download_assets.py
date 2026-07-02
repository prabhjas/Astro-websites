import re, os, glob, time, urllib.request, urllib.parse, sys

SITE='https://redo.ae'
UA={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'}
ROOT='/opt/Astro-staging/redo.ae'
EXT=r'(?:png|jpe?g|webp|gif|svg|ico|woff2?|ttf|eot|css|mp4|webm)'

def localpath(p):
    # p is a site-absolute path like /wp-content/uploads/.. or /wp-includes/..
    if p.startswith('/wp-content/uploads/'):
        return os.path.join(ROOT,'public/images', p[len('/wp-content/uploads/'):])
    if p.startswith('/wp-includes/'):
        return os.path.join(ROOT,'public/assets/wp-includes', p[len('/wp-includes/'):])
    if p.startswith('/wp-content/'):
        return os.path.join(ROOT,'public/assets', p[len('/wp-content/'):])
    return None

urls=set()
for f in glob.glob(ROOT+'/_wp_export/html/**/*.html', recursive=True):
    h=open(f,encoding='utf-8',errors='ignore').read()
    # any /wp-content or /wp-includes asset path (with optional domain), strip query
    for m in re.finditer(r'(?:https?:)?(?://redo\.ae)?(/wp-(?:content|includes)/[^"\'\) ]+?\.'+EXT+r')(?:\?[^"\'\) ]*)?', h, re.I):
        urls.add(m.group(1))
print(f"{len(urls)} unique asset URLs found")

done=skip=err=0
for i,p in enumerate(sorted(urls)):
    dst=localpath(p)
    if not dst: continue
    if os.path.exists(dst) and os.path.getsize(dst)>0: skip+=1; continue
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    url=SITE+urllib.parse.quote(p)
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
            data=r.read()
        open(dst,'wb').write(data); done+=1
        if done%100==0: print(f"  {done} downloaded...")
        time.sleep(0.15)
    except Exception as e:
        err+=1
        if err<=20: print("  ERR", p, str(e)[:60])
print(f"DONE assets: downloaded={done} skipped={skip} errors={err}")
