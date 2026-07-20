import requests
import time
import datetime
import hmac
import hashlib

# ==========================================
# 1. 설정 정보 (정확하게 입력해주세요)
# ==========================================
ACCESS_ID = "rqyqdefgxpq8akws93xe"
ACCESS_SECRET = "ba86766479ee4a08a9426e7fe7e620b9" 
FIREBASE_URL = "https://temp-monitoring-8b172-default-rtdb.asia-southeast1.firebasedatabase.app"
ENDPOINT = "https://openapi.tuyaus.com"
DEVICE_ID = "eb0b4a165182f9fd92d7yb"

def get_sign(content, secret):
    return hmac.new(secret.encode(), content.encode(), hashlib.sha256).hexdigest().upper()

def collect():
    # 현재 시간 (KST)
    now_kst = (datetime.datetime.utcnow() + datetime.timedelta(hours=9)).strftime('%Y.%m.%d %p %I:%M:%S')
    t = str(int(time.time() * 1000))

    try:
        # ----------------------------------------------
        # [테스트] 파이어베이스 연결 확인 (시간 갱신용)
        # ----------------------------------------------
        requests.patch(f"{FIREBASE_URL}/debug.json", json={"at": now_kst, "status": "Running..."})

        # ----------------------------------------------
        # 2. 토큰 발급
        # ----------------------------------------------
        token_sign = get_sign(ACCESS_ID + t, ACCESS_SECRET)
        token_headers = {
            't': t,
            'sign': token_sign,
            'client_id': ACCESS_ID,
            'sign_method': 'HMAC-SHA256'
        }
        
        token_res = requests.get(f"{ENDPOINT}/v1.0/token?grant_type=1", headers=token_headers).json()
        
        if not token_res.get('success'):
            error_msg = f"Token Error: {token_res.get('msg')}"
            requests.patch(f"{FIREBASE_URL}/debug.json", json={"error": error_msg, "at": now_kst})
            return

        token = token_res['result']['access_token']

        # ----------------------------------------------
        # 3. 데이터 조회
        # ----------------------------------------------
        t = str(int(time.time() * 1000))
        url = f"/v1.0/devices/{DEVICE_ID}/status"
        content_sha256 = hashlib.sha256("".encode('utf-8')).hexdigest()
        string_to_sign = f"GET\n{content_sha256}\n\n{url}"
        data_sign = get_sign(ACCESS_ID + token + t + string_to_sign, ACCESS_SECRET)
        
        data_headers = {
            't': t,
            'sign': data_sign,
            'client_id': ACCESS_ID,
            'access_token': token,
            'sign_method': 'HMAC-SHA256'
        }
        
        data_res = requests.get(f"{ENDPOINT}{url}", headers=data_headers).json()

        if data_res.get('success'):
            status_list = data_res.get('result', [])
            temp = next((item['value'] for item in status_list if item['code'] in ['va_temperature', 'temp_current']), None)
            
            if temp is not None:
                if temp > 100: temp /= 10
                # 파이어베이스 업데이트
                requests.patch(f"{FIREBASE_URL}/devices/{DEVICE_ID}.json", json={"temperature": temp, "lastUpdated": now_kst})
                requests.patch(f"{FIREBASE_URL}/debug.json", json={"last_success": now_kst, "temp": temp, "error": None})
        else:
            requests.patch(f"{FIREBASE_URL}/debug.json", json={"error": f"Data Error: {data_res.get('msg')}", "at": now_kst})

    except Exception as e:
        requests.patch(f"{FIREBASE_URL}/debug.json", json={"error": f"System Error: {str(e)}", "at": now_kst})

if __name__ == "__main__":
    collect() 