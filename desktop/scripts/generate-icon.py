from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "build" / "icon.ico"
SIZE = 256


def load_font(size):
    candidates = [
        Path("C:/Windows/Fonts/seguisb.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


image = Image.new("RGBA", (SIZE, SIZE), "#152129")
draw = ImageDraw.Draw(image)

chip = (54, 54, 202, 202)
pin_color = "#d7e3e8"
for position in range(74, 193, 30):
    draw.rounded_rectangle((24, position, 60, position + 14), radius=4, fill=pin_color)
    draw.rounded_rectangle((196, position, 232, position + 14), radius=4, fill=pin_color)
    draw.rounded_rectangle((position, 24, position + 14, 60), radius=4, fill=pin_color)
    draw.rounded_rectangle((position, 196, position + 14, 232), radius=4, fill=pin_color)

draw.rounded_rectangle(chip, radius=16, fill="#176b87", outline="#67d4de", width=5)
draw.ellipse((68, 68, 84, 84), fill="#c8f3f5")

font = load_font(68)
label = "M0"
box = draw.textbbox((0, 0), label, font=font)
width = box[2] - box[0]
height = box[3] - box[1]
draw.text(((SIZE - width) / 2, (SIZE - height) / 2 - 8), label, font=font, fill="white")

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
image.save(OUTPUT, format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print(OUTPUT)
