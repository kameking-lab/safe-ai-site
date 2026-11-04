import json
from pathlib import Path
import struct
import zlib
app = Path('ios/App/App')

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
print('Opaque brand icon and splash artwork generated.')
