import unittest, json, re
STORIES=[
 ('PW-001','User can reset with valid token',[r'id=["\']password-form["\']', r'id=["\']token["\']', r'id=["\']submit_btn["\']']),
 ('PW-002','Strength visible while typing',[r'id=["\']pw_strength["\']', r'id=["\']new_password["\'][^>]*aria-describedby=["\'][^\"]*pw_strength']),
 ('PW-003','Confirm must match',[r'id=["\']confirm_password["\']', r'id=["\']submit_btn["\'][^>]*disabled']),
 ('PW-004','Show/hide password',[r'id=["\']toggle_pw["\']', r'id=["\']toggle_pw["\'][^>]*aria-controls=["\']new_password']),
 ('PW-005','Accessible errors',[r'<label[^>]*for=["\']email["\']', r'id=["\']errors["\'][^>]*aria-live=["\']assertive["\']']),
 ('PW-006','CSRF + CSP present',[r'name=["\']csrf_token["\']', r'Content-Security-Policy'])
]
class Stories(unittest.TestCase):
  @classmethod
  def setUpClass(cls):
    with open('password_qa/config.json','r',encoding='utf-8') as f: cfg=json.load(f)
    with open(cfg['page_path'],'r',encoding='utf-8') as f: cls.html=f.read()
  def test_stories(self):
    failures=[]
    for sid,title,checks in STORIES:
      for pat in checks:
        if not re.search(pat,self.html,re.I|re.S): failures.append(f"{sid} {title} missing {pat}")
    if failures: self.fail("\n".join(failures))
if __name__=='__main__': unittest.main(verbosity=2)
