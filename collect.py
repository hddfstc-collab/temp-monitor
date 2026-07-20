import os
import firebase_admin
from firebase_admin import credentials, db
import tuya_iot  # Tuya API 라이브러리 사용 가정

# 1. Firebase 초기화
cred = credentials.Certificate(os.environ.get("FIREBASE_CREDENTIALS_PATH"))
firebase_admin.initialize_app(cred, {
    'databaseURL': os.environ.get("FIREBASE_DB_URL")
})

# 2. Tuya API 설정
tuya = tuya_iot.TuyaOpenAPI(
    "https://openapi.tuyacn.com",
    os.environ.get("TUYA_ACCESS_ID"),
    os.environ.get("TUYA_SECRET")
)
tuya.connect()

# 3. 데이터 수집 및 업데이트
def update_devices():
    ref = db.reference('devices')
    devices = ref.get()
    
    if not devices:
        print("디바이스 정보가 없습니다.")
        return

    for device_id, info in devices.items():
        try:
            # Tuya에서 상태 조회
            status = tuya.get(f"/v1.0/devices/{device_id}/status")
            
            # Firebase 업데이트
            ref.child(device_id).update({"status": status['result']})
            print(f"성공: {device_id}")
        except Exception as e:
            print(f"실패 {device_id}: {e}")

if __name__ == "__main__":
    update_devices()
