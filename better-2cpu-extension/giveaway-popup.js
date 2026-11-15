(() => {
    'use strict';

    const section = document.querySelector('#giveaway');
    const form = section.querySelector('form');
    const count = form.elements.winnerCount;
    const button = form.querySelector('button');
    const status = section.querySelector('[role="status"]');
    const winners = section.querySelector('ol');
    let tabId;

    async function readApplications() {
        try {
            if (tabId !== undefined) {
                return await chrome.tabs.sendMessage(tabId, { type: 'readGiveawayApplications' }, { frameId: 0 });
            }
        } catch {
            // The active tab may have closed, navigated or not loaded the reader yet.
        }
        return null;
    }

    function displayCount(total) {
        count.max = String(total);
        if (total && count.valueAsNumber > total) count.value = String(total);
        count.disabled = button.disabled = !total;
        status.textContent = total ? `[신청] 댓글 ${total}개` : '[신청] 댓글이 없습니다.';
    }

    function randomIndex(length) {
        const sample = new Uint32Array(1);
        const range = 2 ** 32;
        const limit = range - (range % length);
        do {
            crypto.getRandomValues(sample);
        } while (sample[0] >= limit);
        return sample[0] % length;
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (button.disabled || !count.reportValidity()) return;

        const requested = count.valueAsNumber;
        button.disabled = count.disabled = true;
        winners.replaceChildren();
        const names = await readApplications();
        if (!Array.isArray(names)) {
            status.textContent = '현재 글의 댓글을 읽을 수 없습니다.';
            return;
        }

        displayCount(names.length);
        if (requested > names.length) {
            status.textContent = `현재 신청 댓글은 ${names.length}개입니다. 추첨 수를 다시 확인하세요.`;
            return;
        }

        // Partial Fisher–Yates shuffle samples distinct comments without replacement.
        for (let i = 0; i < requested; i++) {
            const j = i + randomIndex(names.length - i);
            [names[i], names[j]] = [names[j], names[i]];
            const item = document.createElement('li');
            item.textContent = names[i];
            winners.append(item);
        }
        status.textContent = `[신청] 댓글 ${names.length}개 중 ${requested}개 추첨 완료`;
    });

    chrome.tabs.query({ active: true, currentWindow: true }).then(async ([tab]) => {
        tabId = tab?.id;
        const names = await readApplications();
        if (!Array.isArray(names)) return;
        displayCount(names.length);
        section.hidden = false;
    }).catch(error => console.warn('[Better 2CPU] 현재 탭을 확인하지 못했습니다.', error));
})();
