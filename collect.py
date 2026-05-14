import requests
import time
import hmac
import hashlib
import json
from firebase_admin import credentials, db, initialize_app

# --- [설정부] ---
# 투야 API 정보 (대리님이 올려주신 이미지 기반)
ACCESS_ID = "nmy5m7rtv5m7v3v8v8v8"  # 이미지에서 확인된 ID
ACCESS_SECRET = "b8b8b8b8b8b8b8b8b8b8b8b8" # 보안상 실제 키로 교체 필요
ENDPOINT = "https://openapi.tuyaasia.com"
FIREBASE_URL = "https://temp-monitoring-8b172-default-rtdb.asia-southeast1.firebasedatabase.app"

# 파이어베이스 초기화
if not initialize_app._app_exists:
    initialize_app(options={'databaseURL': FIREBASE_URL})

def get_tuya_token():
    # 투야 액세스 토큰 가져오기 로직
    t = str(int(time.time() * 1000))
    sign = hmac.new(ACCESS_SECRET.encode(), (ACCESS_ID + t).encode(), hashlib.sha256).hexdigest().upper()
    headers = {'t': t, 'sign': sign, 'client_id': ACCESS_ID}
    res = requests.get(f"{ENDPOINT}/v1.0/token?grant_type=1", headers=headers).json()
    return res.get('result', {}).get('access_token')

def collect_all_devices():
    token = get_tuya_token()
    if not token: return
    
    # 1. 기기 목록 조회 및 데이터 수집
    # (이미지에 있던 기기 ID들을 기반으로 루프를 돕니다)
    devices = db.reference('devices').get()
    
    for dev_id, info in devices.items():
        t = str(int(time.time() * 1000))
        # 투야 API에서 해당 기기 온도/습도 가져오기
        # ... (생략: 상세 수집 로직) ...
        
        # 파이어베이스 실시간 값 업데이트
        db.reference(f'devices/{dev_id}').update({
            'temperature': new_temp,
            'humidity': new_humi,
            'lastUpdated': time.strftime('%Y. %m. %d. %p %I:%M:%S')
        })
        
        # 히스토리(그래프용) 저장
        db.reference(f'history/{dev_id}/{t}').set({
            'temperature': new_temp,
            'humidity': new_humi
        })

if __name__ == "__main__":
    collect_all_devices()
