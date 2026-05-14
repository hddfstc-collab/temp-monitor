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

# 파이어베이스 초기화
if not firebase_admin._apps:
    firebase_admin.initialize_app(options={'databaseURL': FIREBASE_URL})

def get_sign(content, secret):
    return hmac.new(secret.encode(), content.encode(), hashlib.sha256).hexdigest().upper()

def get_tuya_token():
    t = str(int(time.time() * 1000))
    sign = get_sign(ACCESS_ID + t, ACCESS_SECRET)
    headers = {'t': t, 'sign': sign, 'client_id': ACCESS_ID}
    try:
        response = requests.get(f"{ENDPOINT}/v1.0/token?grant_type=1", headers=headers)
        res = response.json()
        return res.get('result', {}).get('access_token')
    except Exception as e:
        print(f"토큰 발급 실패: {e}")
        return None

def get_device_status(token, device_id):
    t = str(int(time.time() * 1000))
    url = f"/v1.0/devices/{device_id}/status"
    
    # 보안 서명 계산
    content_sha256 = hashlib.sha256("".encode('utf-8')).hexdigest()
    string_to_sign = f"GET\n{content_sha256}\n\n{url}"
    sign_content = ACCESS_ID + token + t + string_to_sign
    sign = get_sign(sign_content, ACCESS_SECRET)
    
    headers = {
        't': t, 'sign': sign, 'client_id': ACCESS_ID,
        'access_token': token, 'sign_method': 'HMAC-SHA256'
    }
    try:
        response = requests.get(f"{ENDPOINT}{url}", headers=headers)
        res = response.json()
        return res.get('result', [])
    except Exception as e:
        print(f"상태 조회 실패: {e}")
        return []

def collect():
    token = get_tuya_token()
    if not token: return

    # 파이어베이스 기기 리스트 참조
    ref = db.reference('devices')
    devices = ref.get()
    if not devices:
        print("조회할 기기가 없습니다.")
        return

    for dev_id in devices:
        status = get_device_status(token, dev_id)
        temp, humi = None, None
        
        for item in status:
            code = item['code']
            val = item['value']
            # 센서 모델별 코드 대응
            if code in ['va_temperature', 'temp_current']:
                temp = val / 10 if val > 100 else val
            if code in ['va_humidity', 'humidity_value']:
                humi = val / 10 if val > 100 else val
        
        if temp is not None:
            # 1. 텍스트 시간 갱신: 깃허브 서버(UTC) 기준 +9시간 더해서 KST 문자열 생성
            kst_time = datetime.datetime.utcnow() + datetime.timedelta(hours=9)
            now_str = kst_time.strftime('%Y. %m. %d. %p %I:%M:%S')
            
            ref.child(dev_id).update({
                'temperature': temp, 
                'humidity': humi, 
                'lastUpdated': now_str
            })
            
            # 2. 그래프용 히스토리 기록: 절대시간이므로 보정 없이 순수 타임스탬프 적용
            ts = int(time.time() * 1000)
            db.reference(f'history/{dev_id}/{ts}').set({
                'temperature': temp, 
                'humidity': humi
            })
            print(f"기기 {dev_id} 업데이트 성공: {temp}°C")

if __name__ == "__main__":
    collect()
