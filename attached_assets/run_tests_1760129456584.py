import subprocess, json, os, re, sys, datetime
def run(cmd):
  p=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
  return p.returncode,p.stdout
def remediations(output):
  tips=[]
  if 'password-form' in output: tips.append('Ensure <form id="password-form"> is present.')
  if 'csrf_token' in output: tips.append('Add hidden CSRF token input.')
  return "\n".join(sorted(set(tips)))
def ensure(path): os.makedirs(path,exist_ok=True)
def copy_src(src,dst):
  with open(src,'r',encoding='utf-8') as f: s=f.read()
  with open(dst,'w',encoding='utf-8') as f: f.write(s)
def update_test2(test2,version,desc,page_url,code_url,test_url):
  if not os.path.exists(test2): return False
  with open(test2,'r',encoding='utf-8') as f: html=f.read()
  m=re.search(r'(<section id="password"[\s\S]*?<tbody>)([\s\S]*?)(</tbody>)',html,re.I)
  if not m: return False
  row=f'<tr><td class="mono">{version}</td><td>{desc}</td><td><a href="{page_url}" target="_blank">open</a></td><td><a href="{code_url}" target="_blank">source.txt</a></td><td><a href="{test_url}" target="_blank">tests.txt</a></td></tr>'
  new= m.group(1)+ m.group(2)+ row + m.group(3)
  html=html.replace(m.group(0),new)
  with open(test2,'w',encoding='utf-8') as f: f.write(html)
  return True
def main():
  with open('config.json','r',encoding='utf-8') as f: cfg=json.load(f)
  version=cfg['version']; report_dir=cfg['report_dir']; page=cfg['page_path']; test2=cfg['test2_path']
  ensure(report_dir)
  rc1,out1=run([sys.executable,'unit_tests.py'])
  rc2,out2=run([sys.executable,'story_tests.py'])
  status='PASS' if rc1==0 and rc2==0 else 'FAIL'
  report='\n'.join([f'Status: {status}', f'Version: {version}', 'Timestamp: '+datetime.datetime.utcnow().isoformat()+'Z', '\n# Unit Tests\n'+out1, '\n# Story Tests\n'+out2])
  if status=='FAIL': report += '\n# Suggested Remediations\n' + remediations(out1+out2)
  with open(os.path.join(report_dir,cfg['report_txt_name']),'w',encoding='utf-8') as f: f.write(report)
  copy_src(page, os.path.join(report_dir,cfg['code_txt_name']))
  code_url=f"/{report_dir}/{cfg['code_txt_name']}"; test_url=f"/{report_dir}/{cfg['report_txt_name']}"
  updated=update_test2(test2, version, cfg['description'], cfg['page_public_url'], code_url, test_url)
  print('Updated test2:', updated)
if __name__=='__main__': main()
