#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-/root/android-sdk}"
export ANDROID_HOME="$ANDROID_SDK_ROOT"
export PATH="/opt/gradle-8.7/bin:${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${PATH}"

if [ ! -f android/app/debug.keystore ]; then
  keytool -genkeypair -v \
    -keystore android/app/debug.keystore \
    -alias androiddebugkey \
    -storepass android \
    -keypass android \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=LUX, OU=Debug, O=LUX, L=Brussels, ST=BE, C=BE"
fi

npm run build:mobile

cd android
gradle assembleSendRelease assembleReceiveRelease --no-daemon

mkdir -p ../releases
cp app/build/outputs/apk/send/release/lux-send.apk ../releases/lux-send.apk
cp app/build/outputs/apk/receive/release/lux-receive.apk ../releases/lux-receive.apk

(
  cd ../releases
  sha256sum lux-send.apk lux-receive.apk > SHA256SUMS
)

ls -lh ../releases
