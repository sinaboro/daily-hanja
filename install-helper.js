// 설치 도우미: 앱으로 설치되지 않은 상태면 화면 오른쪽 아래에 [📲 설치] 버튼을 늘 보여 주고,
// 누르면 지금 쓰는 브라우저(카카오톡·Chrome·삼성 인터넷·아이폰 Safari 등)에 맞는 설치 방법을 알려 준다.
// Chrome 이 "설치할 수 있다"는 신호(beforeinstallprompt)를 안 줘도 동작하도록, 브라우저 종류로 안내한다.
// 여러 학습 앱이 같은 파일을 쓴다 (daily-hanja, multi-language-talk, ai-math-basics, python-learning-app, sqld-learning-app).
(() => {
  const ua = navigator.userAgent;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (standalone) return;                                       // 이미 앱으로 실행 중이면 아무것도 안 함
  const HIDE = 'install-helper-hidden';
  let deferred = null;
  addEventListener('beforeinstallprompt', e => { deferred = e; });
  addEventListener('appinstalled', () => { btn.remove(); close(); });

  // ── 브라우저 알아내기 ──
  const ios = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const kakao = /KAKAOTALK/i.test(ua);
  const inApp = kakao || /NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp|Whale\/.*inapp/i.test(ua);
  const samsung = /SamsungBrowser/i.test(ua), whale = /Whale/i.test(ua), firefox = /Firefox|FxiOS/i.test(ua);
  const edge = /Edg/i.test(ua), iosChrome = /CriOS/i.test(ua);
  const chrome = /Chrome|CriOS/i.test(ua) && !samsung && !edge && !whale && !/OPR/i.test(ua);
  const safari = ios && !iosChrome && !firefox && !/EdgiOS|Whale/i.test(ua) && !inApp;
  const url = location.href.split('#')[0];

  // ── 모양 ──
  const css = document.createElement('style');
  css.textContent = `
  .ih-btn{position:fixed;right:12px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:30;border:0;border-radius:999px;padding:9px 13px;
    background:#e8740c;color:#fff;font:700 13.5px/1 "Malgun Gothic","Apple SD Gothic Neo",sans-serif;box-shadow:0 3px 10px rgba(0,0,0,.25);cursor:pointer}
  .ih-dim{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:40}
  .ih-sheet{position:fixed;left:0;right:0;bottom:0;z-index:41;max-height:88vh;overflow:auto;background:#fff;color:#1b2033;border-radius:18px 18px 0 0;
    padding:16px 16px calc(18px + env(safe-area-inset-bottom,0px));font:15px/1.65 "Malgun Gothic","Apple SD Gothic Neo",sans-serif;max-width:640px;margin:0 auto}
  .ih-sheet h2{margin:0 0 4px;font-size:18px}
  .ih-sheet .who{font-size:12.5px;color:#5d6479;margin-bottom:10px}
  .ih-sheet ol{margin:6px 0 10px;padding-left:22px} .ih-sheet li{margin:5px 0}
  .ih-sheet .k{display:inline-block;border:1px solid #cfd6e4;border-radius:6px;padding:0 6px;background:#f3f5fa;font-weight:700}
  .ih-sheet .go{display:block;width:100%;border:0;border-radius:12px;padding:12px;margin:8px 0;background:#2f6fdb;color:#fff;font:700 15px inherit;cursor:pointer}
  .ih-sheet .sub{display:block;width:100%;border:1px solid #cfd6e4;border-radius:12px;padding:10px;margin:6px 0;background:#fff;color:#1b2033;font:600 14px inherit;cursor:pointer}
  .ih-sheet details{border-top:1px solid #e3e7ef;margin-top:10px;padding-top:8px;font-size:14px}
  .ih-sheet summary{font-weight:700;cursor:pointer}
  .ih-sheet .row{display:flex;gap:8px;margin-top:12px}
  .ih-sheet .row button{flex:1;border:1px solid #cfd6e4;background:#fff;border-radius:10px;padding:9px;font:600 13.5px inherit;color:#5d6479;cursor:pointer}
  @media (prefers-color-scheme: dark){ .ih-sheet{background:#1a1e29;color:#e6e8f2} .ih-sheet .k{background:#262b3a;border-color:#3a4052}
    .ih-sheet .sub,.ih-sheet .row button{background:#1a1e29;color:#e6e8f2;border-color:#3a4052} .ih-sheet .who{color:#9aa1b6} }`;
  document.head.appendChild(css);

  const btn = document.createElement('button');
  btn.className = 'ih-btn'; btn.textContent = '📲 설치'; btn.setAttribute('aria-label', '앱 설치 방법 보기');
  let hidden = false; try { hidden = localStorage.getItem(HIDE) === '1'; } catch (e) {}
  if (!hidden) document.body.appendChild(btn);

  const K = s => `<span class="k">${s}</span>`;
  const openOutside = () => {
    if (kakao) location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url);
    else if (android) location.href = `intent://${location.host}${location.pathname}#Intent;scheme=https;package=com.android.chrome;end`;
  };
  const copy = async () => { try { await navigator.clipboard.writeText(url); alert('주소를 복사했어요.\n' + url); } catch (e) { prompt('주소를 길게 눌러 복사하세요', url); } };

  // ── 브라우저별 안내 ──
  function guide() {
    if (inApp) return {
      who: kakao ? '카카오톡 안의 브라우저' : '앱 안의 브라우저 (네이버·인스타그램 등)',
      html: `<p>이 브라우저는 <b>앱 설치를 지원하지 않아요.</b> ${ios ? 'Safari' : 'Chrome'}로 옮겨서 설치해 주세요.</p>
        <button class="go" data-a="out">${ios ? 'Safari' : 'Chrome'}으로 열기</button>
        <p>버튼이 안 되면 화면 오른쪽 위(또는 아래)의 ${K('⋮')} 또는 ${K('⋯')} → <b>다른 브라우저로 열기</b>${ios ? ' (또는 <b>Safari로 열기</b>)' : ''} 를 누르세요.</p>
        <button class="sub" data-a="copy">주소 복사하기 (브라우저 주소창에 붙여 넣기)</button>`,
    };
    if (ios && safari) return {
      who: '아이폰·아이패드 Safari',
      html: `<ol><li>화면 아래(아이패드는 위)의 <b>공유 버튼</b> ${K('□↑')} 을 누릅니다.</li>
        <li>목록을 위로 밀어 <b>홈 화면에 추가</b> 를 누릅니다.</li><li>오른쪽 위 <b>추가</b> 를 누르면 끝!</li></ol>
        <p style="font-size:13px;color:#888">아이폰은 설치 안내 창이 자동으로 뜨지 않아요. 위 방법이 유일한 설치 방법이에요.</p>`,
    };
    if (ios) return {
      who: iosChrome ? '아이폰 Chrome' : '아이폰의 다른 브라우저',
      html: `<p>아이폰은 <b>Safari</b> 에서 설치하는 것이 가장 확실해요.</p>
        <button class="go" data-a="copy">주소 복사하기 → Safari 주소창에 붙여 넣기</button>
        ${iosChrome ? `<p>Chrome 에서 바로 하려면: 주소창 오른쪽 <b>공유</b> ${K('□↑')} → <b>홈 화면에 추가</b> (iOS 16.4 이상)</p>` : ''}`,
    };
    if (samsung) return {
      who: '삼성 인터넷',
      html: `<ol><li>주소창 오른쪽에 <b>설치 아이콘</b> ${K('⤓')} 이 보이면 눌러서 <b>설치</b>.</li>
        <li>아이콘이 없으면 화면 아래 ${K('≡')} → <b>현재 페이지 추가</b> → <b>홈 화면</b> → <b>추가</b>.</li></ol>
        <p>잘 안 되면 <b>Chrome</b> 으로 열어 설치하는 것이 가장 확실해요.</p><button class="sub" data-a="out">Chrome 으로 열기</button>`,
    };
    if (android && chrome) return {
      who: '안드로이드 Chrome',
      html: `${deferred ? '<button class="go" data-a="prompt">지금 설치하기</button><p style="font-size:13px;color:#888">위 버튼이 안 되면 아래 방법으로 설치하세요.</p>' : ''}
        <ol><li>오른쪽 위 ${K('⋮')} 를 누릅니다.</li><li><b>앱 설치</b> 를 누릅니다. (없으면 <b>홈 화면에 추가</b> → <b>설치</b>)</li>
        <li>확인 창에서 <b>설치</b> 를 누르면 홈 화면·앱스 화면에 아이콘이 생겨요.</li></ol>`,
    };
    if (android) return {
      who: firefox ? '안드로이드 Firefox' : whale ? '네이버 웨일' : '안드로이드의 다른 브라우저',
      html: `<p>${firefox ? `${K('⋮')} → <b>설치</b> 또는 <b>홈 화면에 추가</b> 를 누르세요.` : whale ? `${K('≡')} → <b>홈 화면에 추가</b> 를 누르세요.` : '메뉴에서 <b>홈 화면에 추가</b> 를 찾아 보세요.'}</p>
        <p>가장 확실한 방법은 <b>Chrome</b> 으로 여는 거예요.</p><button class="go" data-a="out">Chrome 으로 열기</button>`,
    };
    return {
      who: edge ? 'PC Edge' : chrome ? 'PC Chrome' : 'PC 브라우저',
      html: `${deferred ? '<button class="go" data-a="prompt">지금 설치하기</button>' : ''}
        <ol>${edge ? `<li>${K('⋯')} → <b>앱</b> → <b>이 사이트를 앱으로 설치</b></li>` : `<li>주소창 오른쪽 끝의 <b>설치 아이콘</b> ${K('⤓')} 을 누르거나</li><li>${K('⋮')} → <b>전송, 저장, 공유</b> → <b>페이지를 앱으로 설치</b> (또는 <b>앱 설치</b>)</li>`}</ol>
        ${!chrome && !edge ? '<p>Chrome 이나 Edge 에서 열면 설치할 수 있어요.</p>' : ''}`,
    };
  }

  let dim, sheet;
  function close() { dim && dim.remove(); sheet && sheet.remove(); dim = sheet = null; }
  function open() {
    const g = guide();
    dim = document.createElement('div'); dim.className = 'ih-dim'; dim.onclick = close;
    sheet = document.createElement('div'); sheet.className = 'ih-sheet'; sheet.setAttribute('role', 'dialog');
    sheet.innerHTML = `<h2>📲 앱으로 설치하기</h2><div class="who">지금 브라우저: ${g.who}</div>${g.html}
      <details><summary>설치 메뉴가 안 보여요</summary><ul>
        <li><b>이미 설치되어 있으면</b> 설치 대신 "앱에서 열기"가 보여요. 앱스 화면에서 아이콘을 찾아보세요.</li>
        <li>예전에 설치 안내를 <b>취소·✕</b> 했다면 자동 안내가 한동안 안 떠요. 위의 <b>메뉴로 직접</b> 설치하세요.</li>
        <li><b>시크릿(비공개) 모드</b>에서는 설치할 수 없어요. 일반 탭에서 여세요.</li>
        <li>Chrome 이 <b>오래된 버전</b>이면 Play 스토어에서 업데이트하세요.</li>
        <li>처음 연 직후에는 몇 초 뒤에 메뉴가 생길 수 있어요. 화면을 한 번 누르고 다시 메뉴를 열어 보세요.</li>
        <li>그래도 안 되면 <b>홈 화면에 추가</b> 로 바로가기를 만들어도 똑같이 쓸 수 있어요.</li></ul></details>
      <div class="row"><button data-a="hide">이 버튼 숨기기</button><button data-a="close">닫기</button></div>`;
    sheet.onclick = async e => {
      const a = e.target.dataset && e.target.dataset.a; if (!a) return;
      if (a === 'close') close();
      else if (a === 'out') openOutside();
      else if (a === 'copy') copy();
      else if (a === 'hide') { try { localStorage.setItem(HIDE, '1'); } catch (er) {} btn.remove(); close(); }
      else if (a === 'prompt' && deferred) {
        try { deferred.prompt(); const r = await deferred.userChoice; deferred = null; if (r.outcome === 'accepted') close(); }
        catch (er) { deferred = null; alert('이 버튼으로는 설치할 수 없어요. 아래 메뉴 방법으로 설치해 주세요.'); }
      }
    };
    document.body.append(dim, sheet);
  }
  btn.onclick = open;
  window.openInstallHelper = open;                     // 앱의 사용법 화면 등에서도 부를 수 있게
})();
