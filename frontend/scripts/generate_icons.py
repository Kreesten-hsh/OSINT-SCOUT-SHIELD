from PIL import Image, ImageDraw, ImageFont
import os
import sys

os.makedirs("public/icons", exist_ok=True)


def create_icon(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size), color="#0f172a")
    draw = ImageDraw.Draw(img)

    m = size // 8
    draw.ellipse([m, m, size - m, size - m], fill="#dc2626")

    fs = size // 4
    font = None
    for path in [
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
    ]:
        try:
            font = ImageFont.truetype(path, fs)
            break
        except Exception:
            continue
    if font is None:
        font = ImageFont.load_default()

    text = "BCS"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((size - tw) // 2, (size - th) // 2), text, fill="white", font=font)
    return img


for sz in [192, 512]:
    icon = create_icon(sz)
    path = f"public/icons/icon-{sz}.png"
    icon.save(path)
    print(f"OK {path} cree")

print("PWA icons generated.")
