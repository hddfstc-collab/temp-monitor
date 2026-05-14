import requests
import time
import hmac
import hashlib
import json
import firebase_admin
from firebase_admin import credentials, db

# --- [설정부] ---
ACCESS_ID = "rqyqdefgxpq8akws93xe" 
ACCESS_SECRET = "ba86766479ee4a08a9426e7fe7e620b9" 
FIREBASE_URL = "https://temp-monitoring-8b172-default-rtdb.asia-southeast1.firebasedatabase.app"
ENDPOINT = "https://openapi.tuyaus.com" 

# 파이어베이스 초기화 (에러 수정됨)
if not firebase_admin._apps:
    cred = credentials.Certificate(None) # 인증 정보 없이 URL로만 연결 시도
    firebase_admin.initialize_app(options={'databaseURL': FIREBASE_URL})

def get_sign(content, secret):
    return hmac.new(secret.encode(), content.encode(), hashlib.sha256).hexdigest().upper()

def get_tuya_token():
    t = str(int(time.time() * 1000))
    sign = get_sign(ACCESS_ID + t, ACCESS_SECRET)
    headers = {'t': t, 'sign': sign, 'client_id': ACCESS_ID}
    try:
        res = requests.get(f"{ENDPOINT}/v1.0/token?grant_type=1", headers=headers).json()
        return res.get('result', {}).get('access_token')
    except:
        return None

def get_device_status(token, device_id):
    t = str(int(time.time() * 1000))
    url = f"/v1.0/devices/{device_id}/status"
    content_sha256 = hashlib.sha256("".encode('utf-8')).hexdigest()
    string_to_sign = f"GET\n{content_sha256}\n\n{url}"
    sign_content = ACCESS_ID + token + t + string_to_sign
    sign = get_sign(sign_content, ACCESS_SECRET)
    
    headers = {
        't': t, 'sign': sign, 'client_id': ACCESS_ID,
        'access_token': token, 'sign_method': 'HMAC-SHA256'
    }
    try:
        res = requests.get(f"{ENDPOINT}{url}", headers=headers).json()
        return res.get('result', [])
    except:
        return []

def collect():
    token = get_tuya_token()
    if not token: return

    ref = db.reference('devices')
    devices = ref.get()
    if not devices: return

    for dev_id in devices:
        status = get_device_status(token, dev_id)
        temp, humi = None, None
        
        for item in status:
            code = item['code']
            val = item['value']
            if code in ['va_temperature', 'temp_current']:
                temp = val / 10 if val > 100 else val
            if code in ['va_humidity', 'humidity_value']:
                humi = val / 10 if val > 100 else val
        
        if temp is not None:
            now_str = time.strftime('%Y. %m. %d. %p %I:%M:%S')
            ref.child(dev_id).update({
                'temperature': temp, 'humidity': humi, 'lastUpdated': now_str
            })
            # 히스토리 저장 (KST 보정)
            ts = int(time.time() * 1000) + (9 * 60 * 60 * 1000)
            db.reference(f'history/{dev_id}/{ts}').set({
                'temperature': temp, 'humidity': humi
            })

if __name__ == "__main__":
    collect()
