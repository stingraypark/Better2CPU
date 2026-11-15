(() => {
    'use strict';

    const form = document.querySelector('#settings');
    const fieldsets = form.querySelectorAll('fieldset');
    const status = document.querySelector('#settings-status');
    let saved = {
        theme: 'light',
        fontFamily: 'default',
        imageMaxEdge: 1920,
        hideAdHighlights: false,
        hideBannerAds: false,
    };

    function displaySettings({ theme, fontFamily, imageMaxEdge, hideAdHighlights, hideBannerAds }) {
        saved = {
            theme: theme === 'dark' ? 'dark' : 'light',
            fontFamily: applyBetter2cpuFont(fontFamily),
            imageMaxEdge: imageMaxEdge === 0 || imageMaxEdge === 960 ? imageMaxEdge : 1920,
            hideAdHighlights: hideAdHighlights === true,
            hideBannerAds: hideBannerAds === true,
        };
        document.documentElement.dataset.theme = saved.theme;
        form.elements.theme.value = saved.theme;
        form.elements.fontFamily.value = saved.fontFamily;
        form.elements.imageMaxEdge.value = String(saved.imageMaxEdge);
        form.elements.hideAdHighlights.checked = saved.hideAdHighlights;
        form.elements.hideBannerAds.checked = saved.hideBannerAds;
    }

    function setDisabled(disabled) {
        for (const fieldset of fieldsets) fieldset.disabled = disabled;
    }

    form.addEventListener('change', async event => {
        const { name, value, type, checked } = event.target;
        const setting = type === 'checkbox' ? checked : name === 'imageMaxEdge' ? Number(value) : value;
        const update = { [name]: setting };
        setDisabled(true);
        status.hidden = true;
        try {
            await chrome.storage.local.set(update);
            displaySettings({ ...saved, ...update });
        } catch (error) {
            displaySettings(saved);
            status.textContent = '설정을 저장하지 못했습니다.';
            status.hidden = false;
            console.warn('[Better 2CPU]', error);
        } finally {
            setDisabled(false);
        }
    });

    chrome.storage.local.get(saved).then(settings => {
        displaySettings(settings);
    }).catch(error => {
        status.textContent = '저장된 설정을 읽지 못했습니다.';
        status.hidden = false;
        console.warn('[Better 2CPU]', error);
    }).finally(() => {
        setDisabled(false);
    });

    const bytesFormat = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 });
    function formatBytes(bytes) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        let unit = 0;
        while (bytes >= 1000 && unit < units.length - 1) {
            bytes /= 1000;
            unit++;
        }
        return `${bytesFormat.format(bytes)} ${units[unit]}`;
    }

    function displayResizeStats(stats) {
        const total = document.querySelector('#resize-stats-total');
        const detail = document.querySelector('#resize-stats-detail');
        if (!stats?.images) {
            total.textContent = '0 B';
            detail.textContent = '이 버전부터 업로드한 축소 이미지 크기를 집계합니다.';
            return;
        }
        const savedBytes = stats.originalBytes - stats.uploadedBytes;
        total.textContent = savedBytes < 0 ? `${formatBytes(-savedBytes)} 증가` : formatBytes(savedBytes);
        detail.textContent = `${bytesFormat.format(stats.images)}장 · ${formatBytes(stats.originalBytes)} → ${formatBytes(stats.uploadedBytes)}`;
    }

    let statsChanged = false;
    chrome.storage.local.onChanged.addListener(({ imageResizeStats }) => {
        if (!imageResizeStats) return;
        statsChanged = true;
        displayResizeStats(imageResizeStats.newValue);
    });
    chrome.storage.local.get('imageResizeStats').then(({ imageResizeStats }) => {
        if (!statsChanged) displayResizeStats(imageResizeStats);
    }).catch(error => console.warn('[Better 2CPU] 이미지 절감량을 읽지 못했습니다.', error));
})();
