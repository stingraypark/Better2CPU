(() => {
    'use strict';

    const root = document.documentElement;
    const annotationSkipClass = 'google-anno-skip';
    let markedBody;
    const bodyObserver = new MutationObserver(markBodyForAdIntents);

    function markBodyForAdIntents() {
        const body = document.body;
        if (!body || body.classList.contains(annotationSkipClass)) return;
        markedBody?.classList.remove(annotationSkipClass);
        body.classList.add(annotationSkipClass);
        markedBody = body;
    }

    function applyAdHighlights(value) {
        const hidden = value === true;
        root.toggleAttribute('data-better2cpu-hide-ad-highlights', hidden);
        if (hidden) {
            bodyObserver.observe(root, { childList: true });
            markBodyForAdIntents();
        } else {
            bodyObserver.disconnect();
            markedBody?.classList.remove(annotationSkipClass);
            markedBody = undefined;
        }
    }

    const applySettings = {
        theme: value => { root.dataset.better2cpuTheme = value === 'dark' ? 'dark' : 'light'; },
        fontFamily: applyBetter2cpuFont,
        hideAdHighlights: applyAdHighlights,
        hideBannerAds: value => root.toggleAttribute('data-better2cpu-hide-banner-ads', value === true),
    };
    if (location.pathname === '/bbs/write.php') {
        applySettings.imageMaxEdge = value => { root.dataset.better2cpuImageMaxEdge = value ?? 1920; };
        document.addEventListener('better2cpu:image-resized', event => {
            const { images, originalBytes, uploadedBytes } = event.detail ?? {};
            chrome.runtime.sendMessage({ type: 'recordImageResize', images, originalBytes, uploadedBytes })
                .catch(error => console.warn('[Better 2CPU] 이미지 절감량을 전달하지 못했습니다.', error));
        });
    }

    const changedKeys = new Set();
    chrome.storage.local.onChanged.addListener(changes => {
        for (const [key, apply] of Object.entries(applySettings)) {
            if (!changes[key]) continue;
            changedKeys.add(key);
            apply(changes[key].newValue);
        }
    });

    chrome.storage.local.get(Object.keys(applySettings)).then(settings => {
        for (const [key, apply] of Object.entries(applySettings)) {
            if (!changedKeys.has(key)) apply(settings[key]);
        }
    }).catch(error => console.warn('[Better 2CPU] 설정을 읽지 못했습니다.', error));
})();
