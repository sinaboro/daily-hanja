"""
생활한자 글꼴 만들기 도구

index.html의 낱말 데이터(RAW)를 검사하고, 쓰인 한자만 담은
Noto Serif KR 글꼴(fonts/NotoSerifKR-subset.woff2)을 다시 만든다.
낱말(한자)을 추가·수정한 뒤에 실행한다.

사용법 (저장소 맨 위 폴더에서):
    pip install -r tools/requirements.txt
    python tools/build_font.py            # 검사 + 글꼴 만들기
    python tools/build_font.py --bump     # 위 작업 + sw.js의 VERSION 숫자 1 올리기
    python tools/build_font.py --check    # 검사만 (글꼴은 그대로)

원본 글꼴(약 23MB)은 처음 한 번 Google Fonts 저장소에서 받아
tools/.cache/ 에 둔다. 이 폴더는 git에 올리지 않는다.
"""
import argparse
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, 'index.html')
SW = os.path.join(ROOT, 'sw.js')
OUT = os.path.join(ROOT, 'fonts', 'NotoSerifKR-subset.woff2')
CACHE = os.path.join(ROOT, 'tools', '.cache')
TTF = os.path.join(CACHE, 'NotoSerifKR.ttf')
TTF_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifkr/NotoSerifKR%5Bwght%5D.ttf'
# 낱말 데이터 말고도 화면에서 명조체로 그리는 글자 (제목, 외워쓰기의 물음표)
EXTRA = '生活漢字?'


def read_words():
    """index.html의 RAW에서 (주제, 한자, 읽기, 훈음 목록, 뜻)을 꺼낸다."""
    src = open(INDEX, encoding='utf-8').read()
    raw = src.split('const RAW = `')[1].split('`')[0]
    words, cat = [], ''
    for n, line in enumerate(raw.strip().split('\n'), 1):
        line = line.strip()
        if not line:
            continue
        if line.startswith('#'):
            cat = line[1:].strip()
            continue
        words.append((n, cat, line))
    return words


def check(words):
    """데이터 오류를 찾는다. 오류가 있으면 목록을 돌려준다."""
    errors, hun_of, seen = [], {}, {}
    for n, cat, line in words:
        f = line.split('|')
        if len(f) != 4:
            errors.append(f'{n}번째 줄: 칸이 4개가 아님 (한자|읽기|훈음|뜻) → {line}')
            continue
        chars, read, hs, mean = f
        hus = [h.strip() for h in hs.split(',')]
        # 글자 수, 읽기 글자 수, 훈음 개수가 모두 같아야 한다
        if not (len(chars) == len(read) == len(hus)):
            errors.append(f'{n}번째 줄 {chars}: 한자 {len(chars)}자 / 읽기 {len(read)}자 / 훈음 {len(hus)}개가 다름')
        for ch, h in zip(chars, hus):
            if ' ' not in h:
                errors.append(f'{n}번째 줄 {chars}: 훈음 "{h}"에 띄어쓰기가 없음 (예: 배울 학)')
            hun_of.setdefault(ch, {}).setdefault(h, []).append(chars)
        if not mean.strip():
            errors.append(f'{n}번째 줄 {chars}: 뜻이 비어 있음')
        if not cat:
            errors.append(f'{n}번째 줄 {chars}: 주제(# 주제) 아래에 있지 않음')
        seen.setdefault(chars, []).append(n)
    # 같은 한자의 훈음이 낱말마다 다르면 알려 준다 (오류는 아니지만 대개 실수)
    warnings = [f'{ch}: ' + ' / '.join(f'"{h}"({",".join(ws)})' for h, ws in hs.items())
                for ch, hs in hun_of.items() if len(hs) > 1]
    dups = [f'{w}: {ns}번째 줄' for w, ns in seen.items() if len(ns) > 1]
    return errors, warnings, dups


def used_chars(words):
    chars = set(EXTRA)
    for _, _, line in words:
        chars.update(line.split('|')[0])
    return ''.join(sorted(chars))


def ensure_ttf():
    if os.path.exists(TTF):
        return
    os.makedirs(CACHE, exist_ok=True)
    print('원본 글꼴 내려받는 중 (약 23MB, 처음 한 번만)...')
    urllib.request.urlretrieve(TTF_URL, TTF)


def build(text):
    from fontTools import subset  # pip install fonttools brotli
    ensure_ttf()
    opts = subset.Options()
    opts.flavor = 'woff2'          # 웹용 압축 형식 (brotli 필요)
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    font = subset.load_font(TTF, opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=text)        # 쓰인 글자만 남긴다
    sub.subset(font)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    subset.save_font(font, OUT, opts)


def bump():
    """sw.js의 VERSION 끝 숫자를 1 올린다 (daily-hanja-v4 → daily-hanja-v5)."""
    s = open(SW, encoding='utf-8').read()
    m = re.search(r"const VERSION = '([^']*?)(\d+)';", s)
    if not m:
        sys.exit('sw.js에서 VERSION을 찾지 못했어요.')
    old = m.group(1) + m.group(2)
    new = m.group(1) + str(int(m.group(2)) + 1)
    open(SW, 'w', encoding='utf-8', newline='\n').write(s.replace(f"'{old}'", f"'{new}'", 1))
    print(f'sw.js VERSION: {old} → {new}')


def main():
    # 한국어 윈도우 콘솔에서 출력할 수 없는 문자가 있어도 멈추지 않게
    sys.stdout.reconfigure(errors='replace')
    ap = argparse.ArgumentParser(description='생활한자 데이터 검사 + 글꼴 서브셋 만들기')
    ap.add_argument('--check', action='store_true', help='검사만 하고 글꼴은 만들지 않음')
    ap.add_argument('--bump', action='store_true', help='sw.js VERSION 숫자를 1 올림')
    a = ap.parse_args()

    words = read_words()
    errors, warnings, dups = check(words)
    text = used_chars(words)
    n_chars = sum(len(l.split('|')[0]) for _, _, l in words)
    n_unique = len(set(''.join(l.split('|')[0] for _, _, l in words)))
    print(f'낱말 {len(words)}개 · 글자 {n_chars}칸 · 서로 다른 한자 {n_unique}자')
    for w in warnings:
        print('  [확인] 훈음이 다름 →', w)
    for d in dups:
        print('  [확인] 같은 낱말이 두 번 →', d)
    if errors:
        print('\n오류가 있어 멈춥니다:')
        for e in errors:
            print('  -', e)
        sys.exit(1)
    if a.check:
        print('검사 통과')
        return
    build(text)
    print(f'글꼴 저장: fonts/NotoSerifKR-subset.woff2 ({os.path.getsize(OUT) // 1024}KB)')
    if a.bump:
        bump()
    else:
        print('※ 폰에 새 글꼴이 들어가게 하려면 sw.js의 VERSION도 올려야 해요 (--bump).')


if __name__ == '__main__':
    main()
