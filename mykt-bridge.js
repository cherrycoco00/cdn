/**
 * userAgent에서 appver 값을 추출하여 버전을 반환
 * @param userAgent User-Agent 문자열
 * @returns AppVersion
 */
function getMyKTAppVersion(userAgent){
  const match = userAgent.match(/appver=([^;]+);/);
  const version = (match?.[1] || '0.0.0').split('.').map(Number);

  return {
    major: version[0],
    minor: version[1],
    patch: version[2],
  };
};

/**
 * 웹뷰 브릿지로 새 창을 연다.
 * @param targetUrl 이동할 URL 문자열
 */
function myKTopenNewWindow(targetUrl){
  if (typeof targetUrl !== 'string' || targetUrl.trim() === '') {
    console.warn('[mykt-bridge] myKTopenNewWindow: 유효한 targetUrl 문자열이 필요합니다.');
    return;
  }

  const payload = { url: encodeURIComponent(targetUrl) };
  const iosHandler = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.openNewWindow;
  const androidBridge = window.ktcsNative;

  if (iosHandler?.postMessage) {
    iosHandler.postMessage(payload);
    return;
  }

  if (androidBridge?.openNewWindow) {
    androidBridge.openNewWindow(JSON.stringify(payload));
    return;
  }

  console.warn('[mykt-bridge] openNewWindow: 사용 가능한 네이티브 브릿지를 찾을 수 없습니다.');
};

/**
 * a 태그이며 href가 있는지 확인
 * @param dom 클릭된 DOM
 * @returns {boolean}
 */
function isAnchorElementWithHref(dom){
  if (!dom || typeof dom.tagName !== 'string' || typeof dom.getAttribute !== 'function') {
    return false;
  }

  const href = dom.getAttribute('href');
  return dom.tagName.toUpperCase() === 'A' && typeof href === 'string' && href.trim() !== '' && (href.trim().startsWith('http') || href.trim().startsWith('/') || href.trim().startsWith('https'));
};

/**
 * 현재 앱 버전이 최소 버전 이상인지 확인
 * @param currentVersion 현재 버전
 * @param minimumVersion 최소 버전
 * @returns {boolean}
 */
function isVersionAtLeast(currentVersion, minimumVersion){
  if (!currentVersion || !minimumVersion) {
    return false;
  }

  if (currentVersion.major !== minimumVersion.major) {
    return currentVersion.major > minimumVersion.major;
  }

  if (currentVersion.minor !== minimumVersion.minor) {
    return currentVersion.minor > minimumVersion.minor;
  }

  return currentVersion.patch >= minimumVersion.patch;
};

/**
 * a 태그 onclick 핸들러
 * - a 태그 + href 존재
 * - 앱 버전 9.0.4 이상
 * 조건을 만족하면 a 기본 이동을 막고 openNewWindow 브릿지를 호출
 * @param event 클릭 이벤트
 * @returns {boolean}
 */
function callToOpenNewWindowBridgeByDom(event){
  const dom = event && event.target;

  if (!isAnchorElementWithHref(dom)) {
    console.log('callToOpenNewWindowBridgeByDom : 클릭된 요소가 a 태그가 아니거나 href가 없습니다. 브릿지 호출을 건너뜁니다.');
    return true;
  }

  const appVersion = getMyKTAppVersion(window.navigator.userAgent || '');
  const isSupportedVersion = isVersionAtLeast(appVersion, { major: 9, minor: 0, patch: 4 });

  if (!isSupportedVersion) {
    console.log('callToOpenNewWindowBridgeByDom : 앱 버전이 9.0.4 이상이 아닙니다. 브릿지 호출을 건너뜁니다.');
    return true;
  }

  console.log('callToOpenNewWindowBridgeByDom : 앱 버전이 9.0.4 이상입니다. 브릿지 호출을 진행합니다.');
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }

  let url = dom.getAttribute('href');
  if(url.startsWith('/')) {
    url = window.location.origin + url;
  }
  myKTopenNewWindow(url);
  return false;
};

/**
 * callToOpenNewWindowBridge 는 fnGoProductView와 같은 함수에서 브릿지 호출 위해 사용되는 함수
 * 삽입되어야 하는 함수명들: chatBotTalk (window.open), talkChatAction, fnGoProductView, startKakaoTalkClick, submitLink
 * @param {string} url
 * @param {function} callback, 9.0.4 미만에서 브릿지 호출 안 할 때 callback 있으면 callback 호출하고 없으면 href 이동
 * @returns {boolean}
 */
function callToOpenNewWindowBridge(url, callback){
   const appVersion = getMyKTAppVersion(window.navigator.userAgent || '');
  const isSupportedVersion = isVersionAtLeast(appVersion, { major: 9, minor: 0, patch: 4 });
  if (!isSupportedVersion) {
    console.log('callToOpenNewWindowBridge : 앱 버전이 9.0.4 이상이 아닙니다. 브릿지 호출을 건너뜁니다.');
    if(typeof callback === 'function') {
      callback();
    } else {
      document.location.href = url;
    }
    return true;
  }

  console.log('callToOpenNewWindowBridge : 앱 버전이 9.0.4 이상입니다. 브릿지 호출을 진행합니다.');
  myKTopenNewWindow(url.startsWith('/') ? window.location.origin + url : url);
  return false;
}
