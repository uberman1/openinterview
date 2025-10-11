# Minimal mock for Stripe operations used by tests.
import os, time, hashlib

def create_checkout_session(price_id: str, customer_id: str = 'cus_test'):
    if os.environ.get('STRIPE_MOCK') != '1':
        raise RuntimeError('Mock disabled; set STRIPE_MOCK=1')
    sid = 'cs_test_' + hashlib.sha1(f"{price_id}{time.time()}".encode()).hexdigest()[:16]
    return {'id': sid, 'url': '/subscription/success.html'}

def emit_webhook(event_type: str, payload: dict = None):
    return {'id': 'evt_test', 'type': event_type, 'data': {'object': payload or {}}, 'livemode': False}
