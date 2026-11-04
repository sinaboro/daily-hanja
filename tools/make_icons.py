"""
생활한자 앱 아이콘 만들기 도구

빨간 바탕에 '漢' 글자가 들어간 아이콘(icons/icon-192.png, icon-512.png)을 만든다.
아이콘을 바꾸고 싶을 때만 실행한다. 글꼴은 build_font.py가 받아 둔 원본을 쓴다.

사용법 (저장소 맨 위 폴더에서):
    python tools/make_icons.py
아이콘을 바꾼 뒤에는 sw.js의 VERSION도 올려야 폰에 반영된다.
"""
import os
from PIL import Image, ImageDraw, ImageFont  # pip install pillow

from build_font import TTF, ensure_ttf, ROOT

BG, FG, LINE = '#b8322a', '#fbf6ea', '#f3ead5'   # 앱의 빨강·종이색과 맞춤
GLYPH = '漢'


def make(size):
    im = Image.new('RGB', (size, size), BG)
    d = ImageDraw.Draw(im)
    # 안쪽 네모 테두리 (안드로이드가 아이콘을 둥글게 잘라도 글자가 안전하게 남는 범위)
    d.rectangle([size * 0.12] * 2 + [size * 0.88] * 2, outline=LINE, width=max(2, size // 64))
    font = ImageFont.truetype(TTF, int(size * 0.56))
    try:
        font.set_variation_by_axes([700])   # 굵게
    except Exception:
        pass
    d.text((size / 2, size / 2), GLYPH, font=font, fill=FG, anchor='mm')
    return im


def main():
    ensure_ttf()
    out = os.path.join(ROOT, 'icons')
    os.makedirs(out, exist_ok=True)
    for size in (192, 512):
        make(size).save(os.path.join(out, f'icon-{size}.png'))
        print(f'icons/icon-{size}.png')


if __name__ == '__main__':
    main()
