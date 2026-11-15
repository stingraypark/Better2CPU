# Better 2CPU 설치 방법

## 처음 설치하기

1. [Better 2CPU v0.6.0 ZIP](./better-2cpu-0.6.0.zip)을 원하는 폴더에 압축 해제합니다. 작업 폴더의 [better-2cpu-extension](./better-2cpu-extension/) 폴더를 바로 사용할 수도 있습니다.
2. Chrome 주소창에 `chrome://extensions`를 입력하고, 오른쪽 상단에서 **개발자 모드**를 켭니다.
3. **압축해제된 확장 프로그램을 로드합니다**를 클릭하고 `manifest.json`이 바로 들어 있는 폴더를 선택합니다.
4. 확장 프로그램 목록에서 **Better 2CPU**가 켜져 있는지 확인합니다. 이미 2CPU를 열어 두었다면 해당 탭을 새로고침합니다.
5. Chrome 툴바의 퍼즐 아이콘을 눌러 **Better 2CPU**를 엽니다. 자주 사용한다면 이름 옆의 핀 아이콘을 눌러 툴바에 고정할 수 있습니다.

Tampermonkey로 Better 2CPU를 사용 중이라면 해당 사용자 스크립트를 비활성화해 이미지 축소가 중복 적용되는 것을 방지합니다.

## 업데이트하기

1. 새 ZIP을 풀고, 그 안의 파일을 기존에 설치한 폴더에 덮어씁니다. 설치에 사용한 폴더 경로를 유지하면 기존 설정과 누적 절감량을 이어서 사용할 수 있습니다.
2. `chrome://extensions`에서 **Better 2CPU**의 새로고침 버튼을 클릭합니다.
3. 열려 있는 2CPU 탭을 새로고침합니다.

## 설치가 안 될 때

- `manifest.json`을 찾을 수 없다는 오류가 나오면 압축을 푼 뒤, 파일이 직접 들어 있는 폴더를 다시 선택합니다.
- 확장이 목록에 있는데 화면이 바뀌지 않으면 Better 2CPU가 켜져 있는지 확인하고 2CPU 탭을 새로고침합니다.

[Chrome 공식 설치 안내](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)
