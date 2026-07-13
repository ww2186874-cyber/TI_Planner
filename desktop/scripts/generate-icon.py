from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "build" / "icon.ico"
PREVIEW = ROOT / "build" / "icon-preview.png"
SIZE = 256

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

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
image.save(PREVIEW, format="PNG")
image.save(OUTPUT, format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print(PREVIEW)
print(OUTPUT)
