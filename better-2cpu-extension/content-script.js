(() => {
    'use strict';

    const JPEG_QUALITY = 0.88;
    const ATTACHMENT = 'input[type="file"][name="bf_file[]"]';
    const form = document.querySelector('form[name="fwrite"]');
    if (!form) return;

    const attachmentJobs = new Map();
    const attachmentOriginalSizes = new WeakMap();
    let resizingBody = false;
    let resumingUpload = false;
    let waitingForSubmit = false;
    let pendingSubmission;
    let status;

    function canResize(file) {
        return file?.type === 'image/jpeg' || file?.type === 'image/png';
    }

    function getImageMaxEdge() {
        const value = document.documentElement.dataset.better2cpuImageMaxEdge;
        if (value === '0') return 0;
        return value === '960' ? 960 : 1920;
    }

    async function isAnimatedPng(file) {
        // APNG의 acTL 청크는 첫 IDAT보다 앞에 있습니다.
        const chunks = new DataView(await file.arrayBuffer());
        for (let offset = 8; offset + 12 <= chunks.byteLength;) {
            const length = chunks.getUint32(offset);
            const type = chunks.getUint32(offset + 4);
            if (type === 0x6163544c) return true; // acTL
            if (type === 0x49444154 || type === 0x49454e44) return false; // IDAT, IEND
            offset += length + 12;
        }
        return false;
    }

    async function resizeImage(file, maxEdge) {
        if (!canResize(file)) return file;

        let bitmap;
        try {
            bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
            const longestEdge = Math.max(bitmap.width, bitmap.height);
            if (longestEdge <= maxEdge) return file;
            if (file.type === 'image/png' && await isAnimatedPng(file)) return file;

            const scale = maxEdge / longestEdge;
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(bitmap.width * scale));
            canvas.height = Math.max(1, Math.round(bitmap.height * scale));
            const context = canvas.getContext('2d');
            context.imageSmoothingQuality = 'high';
            context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

            const blob = await new Promise(resolve => canvas.toBlob(resolve, file.type, JPEG_QUALITY));
            if (!blob || blob.type !== file.type) return file;

            const extension = file.type === 'image/png' ? 'png' : 'jpg';
            const filename = file.name || `image-${Date.now()}.${extension}`;
            return new File([blob], filename, { type: blob.type, lastModified: file.lastModified });
        } catch (error) {
            console.warn('[Better 2CPU] 이미지 변환에 실패해 원본을 사용합니다.', error);
            return file;
        } finally {
            bitmap?.close();
        }
    }

    function updateStatus() {
        if (!status) {
            status = document.createElement('span');
            status.setAttribute('role', 'status');
            status.style.marginInlineStart = '0.75em';
            form.querySelector('#btn_submit')?.after(status);
        }
        status.textContent = resizingBody || attachmentJobs.size ? '이미지 크기를 줄이는 중…' : '';
    }

    function reportResize(images, originalBytes, uploadedBytes) {
        document.dispatchEvent(new CustomEvent('better2cpu:image-resized', {
            detail: { images, originalBytes, uploadedBytes },
        }));
    }

    function uploadBodyImage(editor, original, resized, target) {
        if (original === resized) {
            editor.image.upload([resized], target);
            return;
        }

        // Froala creates the request synchronously before preparing its image preview.
        const getXHR = editor.core.getXHR;
        editor.core.getXHR = function (...args) {
            const xhr = getXHR.apply(this, args);
            if (args[0] === editor.opts.imageUploadURL) {
                xhr.addEventListener?.('load', () => {
                    if (xhr.status < 200 || xhr.status >= 300) return;
                    let response;
                    try {
                        response = JSON.parse(xhr.responseText);
                    } catch {
                        return;
                    }
                    if (response?.link) reportResize(1, original.size, resized.size);
                }, { once: true });
            }
            return xhr;
        };
        try {
            editor.image.upload([resized], target);
        } finally {
            editor.core.getXHR = getXHR;
        }
    }

    function onBeforeImageUpload(event, editor, files, target) {
        // 이 버전의 Froala는 업로드 호출당 첫 파일을 사용합니다.
        if (resumingUpload) return;
        if (resizingBody) return false;
        const maxEdge = getImageMaxEdge();
        const file = files?.[0];
        if (!maxEdge || !canResize(file)) return;

        const replacementTarget = target || editor.image.get();
        const wasDisabled = editor.edit.isDisabled();
        resizingBody = true;
        editor.edit.off();
        updateStatus();

        void (async () => {
            try {
                const resized = await resizeImage(file, maxEdge);
                if (!editor.el.isConnected || (replacementTarget && !editor.el.contains(replacementTarget[0]))) return;
                if (!wasDisabled) editor.edit.on();
                resumingUpload = true;
                uploadBodyImage(editor, file, resized, replacementTarget);
            } finally {
                if (!resumingUpload && !wasDisabled && editor.el.isConnected) editor.edit.on();
                resumingUpload = false;
                resizingBody = false;
                updateStatus();
            }
        })().catch(error => console.warn('[Better 2CPU] 본문 이미지 업로드를 시작하지 못했습니다.', error));

        return false;
    }

    async function resizeAttachments(input, selection, maxEdge) {
        const files = Array.from(selection);
        const resized = [];
        for (const file of files) resized.push(await resizeImage(file, maxEdge));
        if (!input.isConnected || input.files !== selection) return;
        if (resized.every((file, index) => file === files[index])) return;

        const transfer = new DataTransfer();
        for (const file of resized) transfer.items.add(file);
        input.files = transfer.files;
        resized.forEach((file, index) => {
            if (file !== files[index]) attachmentOriginalSizes.set(input.files[index], files[index].size);
        });
    }

    function onAttachmentChange(event) {
        const input = event.target;
        if (!input.matches(ATTACHMENT)) return;
        attachmentJobs.delete(input);
        const maxEdge = getImageMaxEdge();
        if (maxEdge && Array.from(input.files).some(canResize)) {
            const job = resizeAttachments(input, input.files, maxEdge)
                .catch(error => console.warn('[Better 2CPU] 첨부파일 변환에 실패해 원본을 사용합니다.', error))
                .finally(() => {
                    if (attachmentJobs.get(input) === job) attachmentJobs.delete(input);
                    updateStatus();
                });
            attachmentJobs.set(input, job);
        }
        updateStatus();
    }

    async function onSubmit(event) {
        const jobs = () => Array.from(attachmentJobs)
            .filter(([input]) => form.contains(input))
            .map(([, job]) => job);
        let pending = jobs();
        if (!resizingBody && !waitingForSubmit && !pending.length) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        if (resizingBody || waitingForSubmit) return;

        waitingForSubmit = true;
        try {
            while (pending.length) {
                await Promise.all(pending);
                pending = jobs();
            }
        } finally {
            waitingForSubmit = false;
        }
        if (form.isConnected && !resizingBody) {
            form.requestSubmit(event.submitter?.form === form ? event.submitter : undefined);
        }
    }

    window.addEventListener('submit', event => {
        if (event.target !== form || event.defaultPrevented) return;
        pendingSubmission = event;
        window.setTimeout(() => {
            if (pendingSubmission === event) pendingSubmission = undefined;
        }, 0);
    });

    form.addEventListener('formdata', ({ formData }) => {
        if (!pendingSubmission || pendingSubmission.defaultPrevented) return;
        pendingSubmission = undefined;

        let images = 0;
        let originalBytes = 0;
        let uploadedBytes = 0;
        for (const file of formData.getAll('bf_file[]')) {
            const originalSize = attachmentOriginalSizes.get(file);
            if (originalSize === undefined) continue;
            images++;
            originalBytes += originalSize;
            uploadedBytes += file.size;
        }
        if (images) reportResize(images, originalBytes, uploadedBytes);
    });

    window.jQuery?.(form.querySelector('#wr_content')).on('froalaEditor.image.beforeUpload', onBeforeImageUpload);
    form.addEventListener('change', onAttachmentChange, true);
    form.addEventListener('submit', onSubmit, true);
})();
