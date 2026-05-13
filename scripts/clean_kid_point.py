from pathlib import Path

from PIL import Image


asset_path = Path(r"D:\科普网址\ai-magic-box\public\landing-assets\kid-point.png")
image = Image.open(asset_path).convert("RGBA")
pixels = image.load()

# Remove the purple label fragment accidentally cropped into the top-left corner.
for y in range(0, 70):
    for x in range(0, 92):
        r, g, b, a = pixels[x, y]
        if a == 0:
            continue
        if r > 120 and b > 120:
            pixels[x, y] = (0, 0, 0, 0)

image.save(asset_path)
