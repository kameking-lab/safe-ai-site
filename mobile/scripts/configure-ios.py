"""Generated Xcode project customization. Called only by Codemagic macOS."""
import json
import os
from pathlib import Path
import plistlib
import re
import struct
import sys
import zlib

if sys.platform != 'darwin' or not os.environ.get('CM_BUILD_DIR'):
    raise SystemExit('Codemagic macOS only; no native files modified.')

app = Path('ios/App/App')
info_path = app / 'Info.plist'
with info_path.open('rb') as stream:
    info = plistlib.load(stream)
info.update({
    'CFBundleDisplayName': '安全AIポータル',
    'CFBundleShortVersionString': '1.0.0',
    'CFBundleVersion': str(int(os.environ.get('BUILD_NUMBER', '1'))),
    'ITSAppUsesNonExemptEncryption': False,
    'UIFileSharingEnabled': False,
    'LSSupportsOpeningDocumentsInPlace': False,
    'NSAppTransportSecurity': {'NSAllowsArbitraryLoads': False},
    'CFBundleURLTypes': [{'CFBundleURLName': 'jp.anzen-ai-portal.auth', 'CFBundleURLSchemes': ['anzenai']}],
    'NSMicrophoneUsageDescription': '入力欄へ音声で文字を入力するためにマイクを使用します。音声入力を選んだ時だけ起動します。',
    'NSSpeechRecognitionUsageDescription': '入力欄への音声入力に端末内の音声認識を使用します。認識した文字は確認後に利用できます。',
})
with info_path.open('wb') as stream:
    plistlib.dump(info, stream)
entitlements = app / 'App.entitlements'
with entitlements.open('wb') as stream:
    plistlib.dump({'aps-environment': 'production' if os.environ.get('ANZEN_APNS_ENVIRONMENT') == 'production' else 'development'}, stream)

# Place the manifest in the explicit Resources build phase (not merely on disk).
manifest = app / 'PrivacyInfo.xcprivacy'
manifest.write_bytes(Path('ios-resources/PrivacyInfo.xcprivacy').read_bytes())
project = Path('ios/App/App.xcodeproj/project.pbxproj')
text = project.read_text()
# Register the local Keychain plugin in the generated target, not just on disk.
(app / 'NativeVault.swift').write_bytes(Path('ios-resources/NativeVault.swift').read_bytes())
if 'NativeVault.swift in Sources' not in text:
    text = text.replace('/* Begin PBXBuildFile section */', '/* Begin PBXBuildFile section */\n\t\tA33300000000000000000003 /* NativeVault.swift in Sources */ = {isa = PBXBuildFile; fileRef = A33300000000000000000004 /* NativeVault.swift */; };')
    text = text.replace('/* Begin PBXFileReference section */', '/* Begin PBXFileReference section */\n\t\tA33300000000000000000004 /* NativeVault.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = NativeVault.swift; sourceTree = "<group>"; };')
    text, count = re.subn(r'(isa = PBXSourcesBuildPhase;\s*buildActionMask = \d+;\s*files = \()', r'\1\n\t\t\t\tA33300000000000000000003 /* NativeVault.swift in Sources */,', text, count=1)
    assert count == 1, 'Sources phase not found'
    text, count = re.subn(r'(/\* App \*/ = \{\s*isa = PBXGroup;\s*children = \()', r'\1\n\t\t\t\tA33300000000000000000004 /* NativeVault.swift */,', text, count=1)
    assert count == 1, 'App group not found'
storyboard = app / 'Base.lproj/Main.storyboard'
story = storyboard.read_text()
story = story.replace('customClass="CAPBridgeViewController" customModule="Capacitor"', 'customClass="AnzenBridgeViewController" customModule="App" customModuleProvider="target"')
storyboard.write_text(story)
# The Push plugin needs explicit AppDelegate forwarding even for locally bundled apps.
delegate = app / 'AppDelegate.swift'
delegate_text = delegate.read_text()
if 'didRegisterForRemoteNotificationsWithDeviceToken' not in delegate_text:
    at = delegate_text.rfind('}')
    delegate_text = delegate_text[:at] + '''
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
''' + delegate_text[at:]
delegate.write_text(delegate_text)
if 'PrivacyInfo.xcprivacy in Resources' not in text:
    text = text.replace('/* Begin PBXBuildFile section */', '/* Begin PBXBuildFile section */\n\t\tA33300000000000000000001 /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = A33300000000000000000002 /* PrivacyInfo.xcprivacy */; };')
    text = text.replace('/* Begin PBXFileReference section */', '/* Begin PBXFileReference section */\n\t\tA33300000000000000000002 /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };')
    text, count = re.subn(r'(isa = PBXResourcesBuildPhase;\s*buildActionMask = \d+;\s*files = \()', r'\1\n\t\t\t\tA33300000000000000000001 /* PrivacyInfo.xcprivacy in Resources */,', text, count=1)
    assert count == 1, 'Resources phase not found'
    text, count = re.subn(r'(/\* App \*/ = \{\s*isa = PBXGroup;\s*children = \()', r'\1\n\t\t\t\tA33300000000000000000002 /* PrivacyInfo.xcprivacy */,', text, count=1)
    assert count == 1, 'App group not found'
text = re.sub(r'TARGETED_DEVICE_FAMILY = [^;]+;', 'TARGETED_DEVICE_FAMILY = 1;', text)
text = re.sub(r'(PRODUCT_BUNDLE_IDENTIFIER = [^;]+;)', r'\1\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;', text)
text = re.sub(r'MARKETING_VERSION = [^;]+;', 'MARKETING_VERSION = 1.0.0;', text)
text = re.sub(r'IPHONEOS_DEPLOYMENT_TARGET = [^;]+;', 'IPHONEOS_DEPLOYMENT_TARGET = 16.0;', text)
project.write_text(text)

# Code-drawn brand icon; no downloaded image, font or transparency.
def inside_polygon(x, y, vertices):
    inside = False
    j = len(vertices) - 1
    for i, (xi, yi) in enumerate(vertices):
        xj, yj = vertices[j]
        if ((yi > y) != (yj > y)) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside

shield = [(512, 180), (790, 280), (750, 600), (650, 740), (512, 840), (374, 740), (274, 600), (234, 280)]
check = [(352, 474), (458, 580), (674, 360), (716, 405), (460, 670), (308, 518)]
pixels = bytearray()
for y in range(1024):
    pixels.append(0)
    for x in range(1024):
        color = (12, 70 + y // 28, 67 + x // 64)
        if inside_polygon(x, y, shield): color = (220, 239, 217)
        if inside_polygon(x, y, check): color = (12, 87, 77)
        pixels.extend(color)
def chunk(kind, data):
    return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data) & 0xffffffff)
png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', 1024, 1024, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(pixels)) + chunk(b'IEND', b'')
icons = app / 'Assets.xcassets/AppIcon.appiconset'
(icons / 'AppIcon-512@2x.png').write_bytes(png)
(icons / 'Contents.json').write_text(json.dumps({'images': [{'filename': 'AppIcon-512@2x.png', 'idiom': 'universal', 'platform': 'ios', 'size': '1024x1024'}], 'info': {'author': 'xcode', 'version': 1}}, indent=2))
# Replace the Capacitor template splash artwork with the app's solid brand field.
size = 2732
solid = (b'\0' + bytes((12, 87, 77)) * size) * size
splash_png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', size, size, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(solid)) + chunk(b'IEND', b'')
for splash in (app / 'Assets.xcassets/Splash.imageset').glob('*.png'):
    splash.write_bytes(splash_png)
print('iPhone project, icon, privacy manifest and version configured. Signing remains disabled.')
