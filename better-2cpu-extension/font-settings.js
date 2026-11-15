'use strict';

const applyBetter2cpuFont = (() => {
    const cdnStyles = {
        pretendard: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css',
        paperlogy: 'https://cdn.jsdelivr.net/gh/fonts-archive/Paperlogy/subsets/Paperlogy-dynamic-subset.css',
    };
    let stylesheet;

    return value => {
        const font = Object.hasOwn(cdnStyles, value) ? value : 'default';
        document.documentElement.dataset.better2cpuFont = font;
        if (stylesheet?.href === cdnStyles[font]) return font;

        stylesheet?.remove();
        stylesheet = undefined;
        if (font !== 'default') {
            stylesheet = document.createElement('link');
            stylesheet.rel = 'stylesheet';
            stylesheet.crossOrigin = 'anonymous';
            stylesheet.referrerPolicy = 'no-referrer';
            stylesheet.href = cdnStyles[font];
            (document.head || document.documentElement).append(stylesheet);
        }
        return font;
    };
})();
