import requests
import time
import datetime
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

# 파이어베이스 초기화 (인증 키 없이 URL로만 접속 시도)
if not firebase_admin._apps:
    firebase_admin.initialize_app(options={'databaseURL': FIREBASE_URL})

def get_sign(content, secret):
    return hmac.new(secret.encode(), content.encode(), hashlib.sha256).hexdigest().upper()

def get_tuya_token():
    t = str(int(time.time() * 1000))
    string_to_sign = ACCESS_ID + t
    sign = get_sign(string_to_sign, ACCESS_SECRET)
    headers = {'t': t, 'sign': sign, 'client_id': ACCESS_ID, 'sign_method': 'HMAC-SHA256'}
    try:
        response = requests.get(f"{ENDPOINT}/v1.0/token?grant_type=1", headers=headers)
        res = response.json()
        return res.get('result', {}).get('access_token') if res.get('success') else None
    except: return None

def get_device_status(token, device_id):
    t = str(int(time.time() * 1000))
    url = f"/v1.0/devices/{device_id}/status"
    content_sha256 = hashlib.sha256("".encode('utf-8')).hexdigest()
    string_to_sign = f"GET\n{content_sha256}\n\n{url}"
    sign_content = ACCESS_ID + token + t + string_to_sign
    sign = get_sign(sign_content, ACCESS_SECRET)
    headers = {'t': t, 'sign': sign, 'client_id': ACCESS_ID, 'access_token': token, 'sign_method': 'HMAC-SHA256'}
    try:
        response = requests.get(f"{ENDPOINT}{url}", headers=headers)
        return response.json().get('result', [])
    except: return []

def collect():
    token = get_tuya_token()
    if not token:
        # 토큰 실패 시 강제로 파이어베이스에 흔적 남기기 (REST API 방식)
        requests.patch(f"{FIREBASE_URL}/debug.json", json={"error": "tuya_token_failed", "time": str(datetime.datetime.now())})
        return

    # 기기 목록 (대리님 기기 ID 직접 입력 - 가장 확실한 방법)
    dev_ids = ["eb0b4a165182f9fd92d7yb"] 

    for dev_id in dev_ids:
        status = get_device_status(token, dev_id)
        temp, humi = None, None
        for item in status:
            if item['code'] in ['va_temperature', 'temp_current']:
                val = item['value']
                temp = val / 10 if val > 100 else val
            if item['code'] in ['va_humidity', 'humidity_value']:
                val = item['value']
                humi = val / 10 if val > 100 else val
        
        if temp is not None:
            now_kst = (datetime.datetime.utcnow() + datetime.timedelta(hours=9)).strftime('%Y. %m. %d. %p %I:%M:%S')
            ts = int(time.time() * 1000)
            
            # 파이어베이스 데이터 전송 (SDK 대신 직접 전송 방식 사용 - 오류 방지)
            requests.patch(f"{FIREBASE_URL}/devices/{dev_id}.json", json={"temperature": temp, "humidity": humi, "lastUpdated": now_kst})
            requests.set(f"{FIREBASE_URL}/history/{dev_id}/{ts}.json", json={"temperature": temp, "humidity": humi})
            print(f"✅ 수집 성공: {temp}도")

if __name__ == "__main__":
    collect()
