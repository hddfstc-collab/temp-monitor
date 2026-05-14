import requests
import time
import hmac
import hashlib
import json
from firebase_admin import credentials, db, initialize_app

# --- [설정부: 대리님 이미지 정보 반영] ---
ACCESS_ID = "rqyqdefgxpq8akws93xe" 
ACCESS_SECRET = "ba86766479ee4a08a9426e7fe7e620b9" 
FIREBASE_URL = "https://temp-monitoring-8b172-default-rtdb.asia-southeast1.firebasedatabase.app"
# 데이터 센터가 Western America로 되어있어 엔드포인트를 범용으로 수정합니다.
ENDPOINT = "https://openapi.tuyaus.com" 

# 파이어베이스 초기화
if not initialize_app._app_exists:
    initialize_app(options={'databaseURL': FIREBASE_URL})

def get_tuya_token():
    t = str(int(time.time() * 1000))
    # 투야 보안 서명 (Token 발급용)
    msg = ACCESS_ID + t
    sign = hmac.new(ACCESS_SECRET.encode(), msg.encode(), hashlib.sha256).hexdigest().upper()
    headers = {'t': t, 'sign': sign, 'client_id': ACCESS_ID}
    try:
        response = requests.get(f"{ENDPOINT}/v1.0/token?grant_type=1", headers=headers)
        res = response.json()
        return res.get('result', {}).get('access_token')
    except Exception as e:
        print(f"토큰 획득 에러: {e}")
        return None

def get_device_status(token, device_id):
    t = str(int(time.time() * 1000))
    # 투야 보안 서명 (기기 상태 조회용은 방식이 조금 다릅니다)
    str_to_sign = ACCESS_ID + token + t + f"GET\n/v1.0/devices/{device_id}/status\n\n"
    sign = hmac.new(ACCESS_SECRET.encode(), str_to_sign.encode(), hashlib.sha256).hexdigest().upper()
    
    headers = {
        't': t,
        'sign': sign,
        'client_id': ACCESS_ID,
        'access_token': token
    }
    try:
        response = requests.get(f"{ENDPOINT}/v1.0/devices/{device_id}/status", headers=headers)
        res = response.json()
        return res.get('result', [])
    except Exception as e:
        print(f"상태 조회 에러: {e}")
        return []

def collect():
    token = get_tuya_token()
    if not token: 
        print("토큰 획득 실패"); return

    # 파이어베이스에서 기기 목록 읽기
    ref = db.reference('devices')
    devices = ref.get()
    if not devices: 
        print("파이어베이스에 기기 정보가 없습니다."); return

    for dev_id in devices:
        status_list = get_device_status(token, dev_id)
        temp, humi = None, None
        
        for item in status_list:
            # 투야 표준 코드 확인 (센서 모델에 따라 다를 수 있음)
            if item['code'] in ['va_temperature', 'temp_current']: 
                temp = item['value'] / 10 if item['value'] > 100 else item['value']
            if item['code'] in ['va_humidity', 'humidity_value']: 
                humi = item['value'] / 10 if item['value'] > 100 else item['value']
        
        if temp is None:
            print(f"{dev_id}: 온도 데이터를 찾을 수 없습니다. (응답: {status_list})")
            continue

        # 1. 실시간 값 업데이트
        now_str = time.strftime('%Y. %m. %d. %p %I:%M:%S')
        ref.child(dev_id).update({
            'temperature': temp,
            'humidity': humi,
            'lastUpdated': now_str
        })

        # 2. 히스토리 저장 (그래프용 - 한국 시간 보정)
        ts_kst = int(time.time() * 1000) + (9 * 60 * 60 * 1000)
        db.reference(f'history/{dev_id}/{ts_kst}').set({
            'temperature': temp,
            'humidity': humi
        })
        print(f"{dev_id} 성공: {temp}°C / {humi}%")

if __name__ == "__main__":
    collect()
