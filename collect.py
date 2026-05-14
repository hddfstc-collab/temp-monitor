import requests
import time
import datetime
import hmac
import hashlib

# ==========================================
# 1. 설정 정보 (이 부분을 정확히 채워주세요)
# ==========================================
ACCESS_ID = "rqyqdefgxpq8akws93xe"
# 반드시 투야 사이트에서 눈 모양 아이콘을 눌러 전체를 복사하세요!
ACCESS_SECRET = "ba86766479ee4a08a9426e7fe7e620b9" 
FIREBASE_URL = "https://temp-monitoring-8b172-default-rtdb.asia-southeast1.firebasedatabase.app"
ENDPOINT = "https://openapi.tuyaus.com"
DEVICE_ID = "eb0b4a165182f9fd92d7yb"

def get_sign(content, secret):
    """투야 표준 HMAC-SHA256 서명 생성"""
    return hmac.new(secret.encode(), content.encode(), hashlib.sha256).hexdigest().upper()

def collect():
    # 현재 시간 설정 (디버그 확인용)
    now_kst = (datetime.datetime.utcnow() + datetime.timedelta(hours=9)).strftime('%Y.%m.%d %p %I:%M:%S')
    t = str(int(time.time() * 1000))

    try:
        # ----------------------------------------------
        # 2. 토큰 발급 (Token Generation)
        # ----------------------------------------------
        # 토큰 서명: AccessID + Timestamp
        token_sign = get_sign(ACCESS_ID + t, ACCESS_SECRET)
        token_headers = {
            't': t,
            'sign': token_sign,
            'client_id': ACCESS_ID,
            'sign_method': 'HMAC-SHA256'
        }
        
        token_res = requests.get(f"{ENDPOINT}/v1.0/token?grant_type=1", headers=token_headers).json()
        
        if not token_res.get('success'):
            # 토큰 발급 실패 시 파이어베이스에 즉시 기록
            error_msg = f"Token Error: {token_res.get('msg')}"
            requests.patch(f"{FIREBASE_URL}/debug.json", json={"error": error_msg, "at": now_kst})
            print(f"❌ 실패: {error_msg}")
            return

        token = token_res['result']['access_token']

        # ----------------------------------------------
        # 3. 데이터 조회 (Device Status)
        # ----------------------------------------------
        t = str(int(time.time() * 1000))
        url = f"/v1.0/devices/{DEVICE_ID}/status"
        
        # 데이터 조회를 위한 서명 조립 (투야 표준 방식)
        content_sha256 = hashlib.sha256("".encode('utf-8')).hexdigest()
        string_to_sign = f"GET\n{content_sha256}\n\n{url}"
        
        # 최종 서명: ID + Token + Timestamp + StringToSign
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
            temp, humi = None, None
            
            for item in status_list:
                # 온도/습도 코드 확인
                if item['code'] in ['va_temperature', 'temp_current']:
                    val = item['value']
                    temp = val / 10 if val > 100 else val
                if item['code'] in ['va_humidity', 'humidity_value']:
                    val = item['value']
                    humi = val / 10 if val > 100 else val
            
            if temp is not None:
                ts = str(int(time.time() * 1000))
                # 파이어베이스 업데이트
                requests.patch(f"{FIREBASE_URL}/devices/{DEVICE_ID}.json", json={
                    "temperature": temp, 
                    "humidity": humi, 
                    "lastUpdated": now_kst
                })
                # 성공 기록
                requests.patch(f"{FIREBASE_URL}/debug.json", json={
                    "last_success": now_kst, 
                    "temp": temp, 
                    "error": None
                })
                print(f"✅ 성공: {temp}도 / {humi}%")
        else:
            # 조회 실패 기록
            error_msg = f"Data Error: {data_res.get('msg')}"
            requests.patch(f"{FIREBASE_URL}/debug.json", json={"error": error_msg, "at": now_kst})
            print(f"❌ 실패: {error_msg}")

    except Exception as e:
        # 시스템 에러 기록
        requests.patch(f"{FIREBASE_URL}/debug.json", json={"error": f"System Error: {str(e)}", "at": now_kst})
        print(f"❌ 시스템 에러: {str(e)}")

if __name__ == "__main__":
    collect()
