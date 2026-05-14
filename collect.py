import requests
import time
import datetime
import hmac
import hashlib

# --- [설정부] ---
ACCESS_ID = "rqyqdefgxpq8akws93xe" 
ACCESS_SECRET = "ba86766479ee4a08a9426e7fe7e620b9" 
FIREBASE_URL = "https://temp-monitoring-8b172-default-rtdb.asia-southeast1.firebasedatabase.app"
ENDPOINT = "https://openapi.tuyaus.com" 

def get_sign(content, secret):
    return hmac.new(secret.encode(), content.encode(), hashlib.sha256).hexdigest().upper()

def get_tuya_token():
    t = str(int(time.time() * 1000))
    # 토큰 발급 서명 공식: client_id + t
    sign = get_sign(ACCESS_ID + t, ACCESS_SECRET)
    headers = {
        't': t, 
        'sign': sign, 
        'client_id': ACCESS_ID, 
        'sign_method': 'HMAC-SHA256'
    }
    try:
        response = requests.get(f"{ENDPOINT}/v1.0/token?grant_type=1", headers=headers)
        res = response.json()
        if res.get('success'):
            return res.get('result', {}).get('access_token')
        return None
    except:
        return None

def collect():
    token = get_tuya_token()
    # 시간 설정 (KST)
    now_kst_obj = datetime.datetime.utcnow() + datetime.timedelta(hours=9)
    now_kst = now_kst_obj.strftime('%Y. %m. %d. %p %I:%M:%S')

    if not token:
        # 실패 시 기록
        requests.patch(f"{FIREBASE_URL}/debug.json", json={"error": "tuya_token_failed", "time": now_kst})
        return

    # 대리님 기기 ID (eb0b...)
    dev_id = "eb0b4a165182f9fd92d7yb" 
    t = str(int(time.time() * 1000))
    url = f"/v1.0/devices/{dev_id}/status"
    
    # 상세 상태 조회용 서명 공식: client_id + access_token + t + stringToSign
    content_sha256 = hashlib.sha256("".encode('utf-8')).hexdigest()
    string_to_sign = f"GET\n{content_sha256}\n\n{url}"
    sign_content = ACCESS_ID + token + t + string_to_sign
    sign = get_sign(sign_content, ACCESS_SECRET)
    
    headers = {
        't': t, 
        'sign': sign, 
        'client_id': ACCESS_ID, 
        'access_token': token, 
        'sign_method': 'HMAC-SHA256'
    }
    
    try:
        response = requests.get(f"{ENDPOINT}{url}", headers=headers)
        res = response.json()
        
        if not res.get('success'):
            requests.patch(f"{FIREBASE_URL}/debug.json", json={"error": "device_status_failed", "res": res, "time": now_kst})
            return

        status = res.get('result', [])
        temp, humi = None, None
        for item in status:
            code = item['code']
            val = item['value']
            # 온도/습도 코드 매칭
            if code in ['va_temperature', 'temp_current']:
                temp = val / 10 if val > 100 else val
            if code in ['va_humidity', 'humidity_value']:
                humi = val / 10 if val > 100 else val
        
        if temp is not None:
            ts = str(int(time.time() * 1000))
            # 파이어베이스 전송 (직접 PATCH 방식)
            requests.patch(f"{FIREBASE_URL}/devices/{dev_id}.json", json={"temperature": temp, "humidity": humi, "lastUpdated": now_kst})
            requests.patch(f"{FIREBASE_URL}/history/{dev_id}/{ts}.json", json={"temperature": temp, "humidity": humi})
            requests.patch(f"{FIREBASE_URL}/debug.json", json={"last_success": now_kst, "temp": temp, "status": "OK"})
            print(f"✅ 수집 완료: {temp}도")
        else:
            requests.patch(f"{FIREBASE_URL}/debug.json", json={"error": "no_temp_data", "time": now_kst})
            
    except Exception as e:
        requests.patch(f"{FIREBASE_URL}/debug.json", json={"error": str(e), "time": now_kst})

if __name__ == "__main__":
    collect()
