import json
from pathlib import Path
import struct
import zlib
app = Path('ios/App/App')

# Brand icon: the same chihuahua mascot as the web app icon (web/public/mascot/mascot-chihuahua-4.png),
# flattened onto an opaque full-bleed background in ios-resources/AppIcon-1024.png.
def chunk(kind, data):
    return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data) & 0xffffffff)
png = Path('ios-resources/AppIcon-1024.png').read_bytes()
icons = app / 'Assets.xcassets/AppIcon.appiconset'
(icons / 'AppIcon-512@2x.png').write_bytes(png)
(icons / 'Contents.json').write_text(json.dumps({'images': [{'filename': 'AppIcon-512@2x.png', 'idiom': 'universal', 'platform': 'ios', 'size': '1024x1024'}], 'info': {'author': 'xcode', 'version': 1}}, indent=2))
# Replace the Capacitor template splash artwork with the app's solid brand field.
size = 2732
solid = (b'\0' + bytes((12, 87, 77)) * size) * size
splash_png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', size, size, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(solid)) + chunk(b'IEND', b'')
for splash in (app / 'Assets.xcassets/Splash.imageset').glob('*.png'):
    splash.write_bytes(splash_png)
print('Opaque brand icon and splash artwork generated.')
