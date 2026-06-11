import unittest, re, json
class TestPasswordPage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open('password_qa/config.json','r',encoding='utf-8') as f:
            cfg = json.load(f)
        with open(cfg['page_path'],'r',encoding='utf-8') as f:
            cls.html = f.read()
    def test_form(self): self.assertRegex(self.html, r'<form[^>]*id=["\']password-form["\']')
    def test_email(self): self.assertRegex(self.html, r'<input[^>]*id=["\']email["\'][^>]*type=["\']email')
    def test_token(self): self.assertRegex(self.html, r'<input[^>]*id=["\']token["\']')
    def test_pw(self): self.assertRegex(self.html, r'<input[^>]*id=["\']new_password["\'][^>]*type=["\']password')
    def test_confirm(self): self.assertRegex(self.html, r'<input[^>]*id=["\']confirm_password["\'][^>]*type=["\']password')
    def test_toggle(self): self.assertRegex(self.html, r'<button[^>]*id=["\']toggle_pw["\']')
    def test_submit(self): self.assertRegex(self.html, r'<button[^>]*id=["\']submit_btn["\']')
    def test_csrf(self): self.assertRegex(self.html, r'name=["\']csrf_token["\']')
    def test_strength(self): self.assertRegex(self.html, r'id=["\']pw_strength["\']')
    def test_rules(self): self.assertRegex(self.html, r'id=["\']pw_rules["\']')
    def test_labels(self):
        self.assertRegex(self.html, r'<label[^>]*for=["\']email["\']')
        self.assertRegex(self.html, r'<label[^>]*for=["\']new_password["\']')
        self.assertRegex(self.html, r'<label[^>]*for=["\']confirm_password["\']')
    def test_errors_region(self): self.assertRegex(self.html, r'id=["\']errors["\'][^>]*aria-live=["\']assertive["\']')
    def test_csp(self): self.assertRegex(self.html, r'Content-Security-Policy')
    def test_back_link(self): self.assertRegex(self.html, r'id=["\']back_to_login["\'][^>]*href=["\']/login')
if __name__=='__main__': unittest.main(verbosity=2)
