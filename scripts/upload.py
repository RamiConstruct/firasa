import json, os, sys, subprocess, concurrent.futures as cf
BASE = 'https://firasa.labotory.site/admin/kv/'
TOK = open('data/admin_token').read().strip()
done_p = 'data/uploaded.json'
done = set(json.load(open(done_p))) if os.path.exists(done_p) else set()
files = json.load(open('data/pack/files.json'))
todo = [k for k in files if k not in done]
only = sys.argv[1:]  # 'data' et/ou 'meta' 'html'
def put(key, path):
    for i in range(4):
        r = subprocess.run(['curl', '-s', '-m', '120', '-X', 'PUT', '-H', 'authorization: Bearer ' + TOK, '--data-binary', '@' + path, BASE + key], capture_output=True, text=True)
        if '"ok":true' in r.stdout: return key
    raise RuntimeError(key + ' ' + r.stdout[:200])
if not only or 'data' in only:
    print('à envoyer', len(todo), 'sur', len(files), flush=True)
    with cf.ThreadPoolExecutor(4) as ex:
        for k in ex.map(lambda k: put(k, f'data/pack/{k}.bin'), todo):
            done.add(k); json.dump(sorted(done), open(done_p, 'w'))
if not only or 'meta' in only: print(put('meta', 'data/pack/meta.json'))
if not only or 'html' in only: print(put('html', 'dist/index.html'))
print('écritures KV cumulées ~', len(done) + 2)
