import requests
import time
import datetime
import hmac
import hashlib

# ==========================================
# 1. 설정 정보 (시크릿 값 다시 확인 부탁드립니다)
# ==========================================
ACCESS_ID = "rqyqdefgxpq8akws93xe"
ACCESS_SECRET = "ba86766479ee4a08a9426e7fe7e620b9" 
FIREBASE_URL = "https://temp-monitoring-8b172-default-rtdb.asia-southeast1.firebasedatabase.app"
ENDPOINT = "https://openapi.tuyaus.com"
DEVICE_ID = "eb0b4a165182f9fd92d7yb"

def collect():
    # 현재 시간 (디버그용)
    now_kst = (datetime.datetime.utcnow() + datetime.timedelta(hours=9)).strftime('%Y.%m.%d %p %I:%M:%S')
    t = str(int(time.time() * 1000))

    try:
        # ----------------------------------------------
        # 2. 토큰 발급 (이 로직이 아까 통과했던 방식입니다)
        # ----------------------------------------------
        # 토큰용 서명은 AccessID + t 조합만 사용합니다.
        sign_content = ACCESS_ID + t
        token_sign = hmac.new(ACCESS_SECRET.encode(), sign_content.encode(), hashlib.sha256).hexdigest().upper()
        
        headers = {
            't': t,
            'sign': token_sign,
            'client_id': ACCESS_ID,
            'sign_method': 'HMAC-SHA256'
        }
        
        token_res = requests.get(f"{ENDPOINT}/v1.0/token?grant_type=1", headers=headers).json()
        
        if not token_res.get('success'):
            # 여기서 실패하면 시크릿 값 자체의 문제일 확률이 매우 높습니다.
            error_msg = f"Token Error: {token_res.get('msg')}"
            requests.patch(f"{FIREBASE_URL}/debug.json", json={"error": error_msg, "at": now_kst})
            return

        # 토큰 획득 성공!
        token = token_res['result']['access_token']

        # ----------------------------------------------
        # 3. 데이터 조회 (여기가 sign invalid가 났던 구간입니다)
        # ----------------------------------------------
        t = str(int(time.time() * 1000))
        url = f"/v1.0/devices/{DEVICE_ID}/status"
        
        # 투야 표준 서명 조립
        content_sha256 = hashlib.sha256("".encode('utf-8')).hexdigest()
        string_to_sign = f"GET\n{content_sha256}\n\n{url}"
        
        # 데이터용 서명: ID + Token + t + StringToSign
        data_sign_content = ACCESS_ID + token + t + string_to_sign
        data_sign = hmac.new(ACCESS_SECRET.encode(), data_sign_content.encode(), hashlib.sha256).hexdigest().upper()
        
        data_headers = {
            't': t,
            'sign': data_sign,
            'client_id': ACCESS_ID,
            'access_token': token,
            'sign_method': 'HMAC-SHA256'
        }
        
        data_res = requests.get(f"{ENDPOINT}{url}", headers=data_headers).json()

        if data_res.get('success'):
            status = data_res.get('result', [])
            temp = next((i['value'] for i in status if i['code'] in ['va_temperature', 'temp_current']), None)
            
            if temp is not None:
                if temp > 100: temp /= 10 # 269 -> 26.9 변환
                
                # 파이어베이스 저장
                requests.patch(f"{FIREBASE_URL}/devices/{DEVICE_ID}.json", json={"temperature": temp, "lastUpdated": now_kst})
                requests.patch(f"{FIREBASE_URL}/debug.json", json={"last_success": now_kst, "temp": temp, "error": None})
        else:
            # 여기서 sign invalid가 뜨면 데이터용 서명 조립의 문제입니다.
            requests.patch(f"{FIREBASE_URL}/debug.json", json={"error": f"Data Error: {data_res.get('msg')}", "at": now_kst})

    except Exception as e:
        requests.patch(f"{FIREBASE_URL}/debug.json", json={"error": f"System Error: {str(e)}", "at": now_kst})

if __name__ == "__main__":
    collect()
