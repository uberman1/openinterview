import subprocess, json, os, re, sys, datetime

def run(cmd):
  p=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
  return p.returncode,p.stdout

def ensure(path): os.makedirs(path,exist_ok=True)

def copy_src(src,dst):
  with open(src,'r',encoding='utf-8') as f: s=f.read()
  with open(dst,'w',encoding='utf-8') as f: f.write(s)

def update_test2(test2,version,desc,page_url,code_url,test_url):
  try:
    with open(test2,'r',encoding='utf-8') as f: html=f.read()
  except Exception as e:
    print('WARN: cannot open test2.html:', e)
    return False
  m=re.search(r'(<section id="password"[\s\S]*?<tbody>)([\s\S]*?)(</tbody>)',html,re.I)
  if not m: 
    print('WARN: password section not found in test2.html')
    return False
  row=f'<tr><td class="mono">{version}</td><td>{desc}</td><td><a href="{page_url}" target="_blank">open</a></td><td><a href="{code_url}" target="_blank">source.txt</a></td><td><a href="{test_url}" target="_blank">tests.txt</a></td></tr>'
  new= m.group(1)+ m.group(2)+ row + m.group(3)
  html=html.replace(m.group(0),new)
  try:
    with open(test2,'w',encoding='utf-8') as f: f.write(html)
    return True
  except Exception as e:
    print('WARN: cannot write test2.html (protected?). Writing to shadow file:', e)
    shadow_dir='qa/_shadow'; os.makedirs(shadow_dir,exist_ok=True)
    with open(os.path.join(shadow_dir,'test2-shadow.html'),'w',encoding='utf-8') as f: f.write(html)
    return False

def main():
  with open('password_qa/config.json','r',encoding='utf-8') as f: cfg=json.load(f)
  version=cfg['version']; page=cfg['page_path']
  report_dir=cfg['report_dir']; ensure(report_dir)
  rc1,out1=run([sys.executable,'password_qa/unit_tests.py'])
  rc2,out2=run([sys.executable,'password_qa/story_tests.py'])
  status='PASS' if rc1==0 and rc2==0 else 'FAIL'
  report='\n'.join([f'Status: {status}', f'Version: {version}', 'Timestamp: '+datetime.datetime.utcnow().isoformat()+'Z', '\n# Unit Tests\n'+out1, '\n# Story Tests\n'+out2])
  with open(os.path.join(report_dir,cfg['report_txt_name']),'w',encoding='utf-8') as f: f.write(report)
  # snapshot code
  copy_src(page, os.path.join(report_dir,cfg['code_txt_name']))
  # update test2
  code_url=f"/{report_dir}/{cfg['code_txt_name']}"; test_url=f"/{report_dir}/{cfg['report_txt_name']}"
  updated=update_test2(cfg['test2_path'], version, cfg['description'], cfg['page_public_url'], code_url, test_url)
  print('Updated test2:', updated)
  print('Artifacts:', os.path.join(report_dir,cfg['report_txt_name']), os.path.join(report_dir,cfg['code_txt_name']))

if __name__=='__main__': main()
