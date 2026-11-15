'use strict';

const emptyStats = { images: 0, originalBytes: 0, uploadedBytes: 0 };
let pendingUpdate = Promise.resolve();

chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type !== 'recordImageResize' || sender.frameId !== 0 ||
        !/^https?:\/\/(?:www\.)?2cpu\.co\.kr(?::\d+)?\/bbs\/write\.php(?:[?#]|$)/.test(sender.url ?? '')) return;

    const { images, originalBytes, uploadedBytes } = message;
    if (![images, originalBytes, uploadedBytes].every(value => Number.isSafeInteger(value) && value > 0)) return;

    const update = pendingUpdate.then(async () => {
        const { imageResizeStats } = await chrome.storage.local.get({ imageResizeStats: emptyStats });
        await chrome.storage.local.set({
            imageResizeStats: {
                images: imageResizeStats.images + images,
                originalBytes: imageResizeStats.originalBytes + originalBytes,
                uploadedBytes: imageResizeStats.uploadedBytes + uploadedBytes,
            },
        });
    });
    pendingUpdate = update.catch(error => console.warn('[Better 2CPU] 이미지 절감량을 저장하지 못했습니다.', error));
    update.then(() => respond(true), () => respond(false));
    return true;
});
