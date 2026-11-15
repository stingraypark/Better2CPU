(() => {
    'use strict';

    const giveawayTag = /[\[(【]\s*(?:무분|무료\s*(?:나눔|분양))(?:\s*(?:완료|마감|종료|진행\s*중))?\s*[\])】]/u;
    const giveawayOffer = /^(?:무분|무료\s*(?:나눔|분양))\s*(?:$|[:–—-]|합니다|드립니다|드려요|할게요|완료|마감|종료)/u;

    function readApplications() {
        const title = document.querySelector('#view_header > .panel-heading > p:first-child')?.textContent
            .normalize('NFKC').trim();
        if (!title || !document.querySelector('#view_main') || (!giveawayTag.test(title) && !giveawayOffer.test(title))) {
            return null;
        }

        const names = [];
        for (const anchor of document.querySelectorAll('#commentContents a[id^="c_"]')) {
            const id = /^c_(\d+)$/.exec(anchor.id)?.[1];
            const table = anchor.nextElementSibling;
            if (!id || !table?.matches('table[id^="view_"]')) continue;

            const comment = table.querySelector(`#edit_${id}`)?.previousElementSibling;
            if (!comment?.matches('div') || !comment.textContent.includes('[신청]')) continue;

            const authorHeader = comment.parentElement.firstElementChild;
            if (authorHeader === comment) continue;
            const author = authorHeader?.querySelector('.sideview, strong');
            const name = (author?.querySelector('.sideview') || author)?.textContent.trim();
            if (name) names.push(name);
        }
        return names;
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message?.type === 'readGiveawayApplications') sendResponse(readApplications());
    });
})();
