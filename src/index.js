import { EditorView, basicSetup } from "codemirror";
import { xml } from "@codemirror/lang-xml";
import { StateField, StateEffect } from "@codemirror/state";
import { Decoration } from "@codemirror/view";

// CodeMirror 6 스타일 가져오기
import { oneDark } from "@codemirror/theme-one-dark";

// CSS 선택자 라이브러리 가져오기
import { selectAll } from 'css-select';
import { parseDocument } from 'htmlparser2';

// 하이라이트를 설정하기 위한 StateEffect 정의
const setHighlights = StateEffect.define();

// 데코레이션을 위한 StateField 정의
const highlightField = StateField.define({
    create() {
        return Decoration.none;
    },
    update(decorations, tr) {
        decorations = decorations.map(tr.changes);
        for (let e of tr.effects) {
            if (e.is(setHighlights)) {
                decorations = e.value;
            }
        }
        return decorations;
    },
    provide: f => EditorView.decorations.from(f)
});

// 개행 문자를 \n으로 통일한 sampleHTML
const sampleHTML = `
<!DOCTYPE html>
<html lang="ko">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CSS 셀렉터 연습</title>
</head>

<body>
    <header id="main-header">
        <h1>CSS 셀렉터 연습</h1>
        <nav>
            <ul>
                <li><a href="#section1">섹션 1</a></li>
                <li><a href="#section2">섹션 2</a></li>
                <li><a href="#section3">섹션 3</a></li>
            </ul>
        </nav>
    </header>

    <main>
        <section id="section1" class="content-section">
            <h2>섹션 1</h2>
            <p class="highlight">이것은 <span class="special">특별한</span> 단락입니다.</p>
            <p>일반 단락입니다.</p>
            <ul class="list-items">
                <li>항목 1</li>
                <li>항목 2</li>
                <li>항목 3</li>
            </ul>
        </section>

        <section id="section2" class="content-section">
            <h2>섹션 2</h2>
            <div class="box">
                <p>상자 안의 텍스트입니다.</p>
            </div>
            <div class="box highlight">
                <p>강조된 상자 안의 텍스트입니다.</p>
            </div>
        </section>

        <section id="section3" class="content-section">
            <h2>섹션 3</h2>
            <form id="contact-form">
                <label for="name">이름:</label>
                <input type="text" id="name" name="name" required="required" />

                <label for="email">이메일:</label>
                <input type="email" id="email" name="email" required="required" />

                <label for="message">메시지:</label>
                <textarea id="message" name="message" required="required"></textarea>

                <button type="submit">보내기</button>
            </form>
        </section>
    </main>

    <footer>
        <p>2024 CSS 셀렉터 연습</p>
    </footer>
</body>

</html>
`.trim() + '\n'.repeat(30);

document.addEventListener('DOMContentLoaded', function () {
    const promptInput = document.getElementById('prompt-input');
    const cssSelectorInput = document.getElementById('css-selector-input');
    const codeEditorElement = document.getElementById('code-editor');

    // 개행 문자를 \n으로 통일
    const normalizedSampleHTML = sampleHTML.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    let codeEditor = new EditorView({
        extensions: [
            basicSetup,
            xml(),
            highlightField,
            oneDark,
            EditorView.updateListener.of(update => {
                if (update.docChanged) {
                    updateCodeHighlighting();
                }
            })
        ],
        parent: codeEditorElement
    });

    // 초기 코드 설정
    codeEditor.dispatch({
        changes: { from: 0, to: codeEditor.state.doc.length, insert: normalizedSampleHTML }
    });

    // 이벤트 리스너 등록
    cssSelectorInput.addEventListener('input', updateCodeHighlighting);
    codeEditor.dom.addEventListener('input', updateCodeHighlighting); // 작동안함.. 이벤트 발생 안함.
    console.log(codeEditor);

    function updateCodeHighlighting() {
        const selector = cssSelectorInput.value.trim();
        const code = codeEditor.state.doc.toString();

        if (selector) {
            try {
                // 개행 문자를 \n으로 통일한 코드 사용
                const normalizedCode = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

                // 문자열을 파싱하여 DOM으로 변환 (위치 정보 포함)
                const doc = parseDocument(normalizedCode, {
                    withStartIndices: true,
                    withEndIndices: true
                });

                // 선택자를 적용하여 해당 요소를 찾음
                const selectedElements = selectAll(selector, doc);

                // 이미 사용된 색상을 추적하기 위한 세트
                const usedColors = new Set();

                const decorations = [];

                // 선택된 요소들에 대해 데코레이션 적용
                selectedElements.forEach(el => {
                    applyDecoration(el, decorations, usedColors);
                });

                // 하이라이트 업데이트
                codeEditor.dispatch({
                    effects: setHighlights.of(Decoration.set(decorations, true))
                });

                // 인풋박스 색상 초기화
                cssSelectorInput.style.color = '';
            } catch (e) {
                console.error('선택자 파싱 중 오류 발생:', e);
                // 인풋박스 텍스트를 빨갛게 만듦
                cssSelectorInput.style.color = '#FF6666';

                // 하이라이트 제거
                codeEditor.dispatch({
                    effects: setHighlights.of(Decoration.none)
                });
            }
        } else {
            // 선택자가 비어있을 때 모든 하이라이트 제거
            codeEditor.dispatch({
                effects: setHighlights.of(Decoration.none)
            });
        }
    }

    function applyDecoration(node, decorations, usedColors) {
        if (typeof node.startIndex === 'number' && typeof node.endIndex === 'number') {
            const from = node.startIndex;
            const to = node.endIndex + 1; // 마지막 문자 포함

            // 문서 길이 확인
            const docLength = codeEditor.state.doc.length;
            if (from < 0 || to > docLength || from >= to) {
                console.warn(`잘못된 데코레이션 범위 from ${from} to ${to}`);
                return;
            }

            // 랜덤 파스텔 색상 생성 (이미 사용된 색상은 제외)
            const color = getRandomPastelColor(usedColors);

            // 하이라이팅 적용
            decorations.push(
                Decoration.mark({
                    attributes: { style: `background-color: ${color};` }
                }).range(from, to)
            );
        }

        // 자식 노드를 재귀적으로 처리하지 않음
        // 따라서 선택된 요소만 하이라이팅됨
    }

    function getRandomPastelColor(usedColors) {
        let color;
        do {
            const hue = Math.floor(Math.random() * 360);
            const saturation = Math.floor(Math.random() * 20) + 30; // 30-50% 사이의 채도
            const lightness = Math.floor(Math.random() * 15) + 35; // 35-50% 사이의 명도
            color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        } while (usedColors.has(color));
        usedColors.add(color);
        return color;
    }

    // 초기 하이라이트 업데이트
    updateCodeHighlighting();
    {

        const selectorExample = {
            "selectors": [
                {
                    "selector": "body",
                    "description": "문서의 body 요소를 선택합니다.",
                    "example": "body { font-family: Arial, sans-serif; }"
                },
                {
                    "selector": "#main-header",
                    "description": "id가 'main-header'인 요소를 선택합니다.",
                    "example": "#main-header { background-color: #f0f0f0; }"
                },
                {
                    "selector": ".content-section",
                    "description": "class가 'content-section'인 모든 요소를 선택합니다.",
                    "example": ".content-section { margin-bottom: 20px; }"
                },
                {
                    "selector": "h1",
                    "description": "모든 h1 요소를 선택합니다.",
                    "example": "h1 { font-size: 24px; }"
                },
                {
                    "selector": "nav ul",
                    "description": "nav 요소 내부의 모든 ul 요소를 선택합니다.",
                    "example": "nav ul { list-style-type: none; }"
                },
                {
                    "selector": "nav > ul",
                    "description": "nav의 직접적인 자식인 ul 요소만 선택합니다.",
                    "example": "nav > ul { display: flex; }"
                },
                {
                    "selector": "a[href^='#']",
                    "description": "href 속성이 '#'으로 시작하는 모든 a 요소를 선택합니다.",
                    "example": "a[href^='#'] { color: #333; }"
                },
                {
                    "selector": ".highlight",
                    "description": "class가 'highlight'인 모든 요소를 선택합니다.",
                    "example": ".highlight { background-color: yellow; }"
                },
                {
                    "selector": "p.highlight",
                    "description": "class가 'highlight'인 p 요소만 선택합니다.",
                    "example": "p.highlight { font-weight: bold; }"
                },
                {
                    "selector": ".special",
                    "description": "class가 'special'인 모든 요소를 선택합니다.",
                    "example": ".special { color: red; }"
                },
                {
                    "selector": "ul.list-items li",
                    "description": "class가 'list-items'인 ul 내부의 모든 li 요소를 선택합니다.",
                    "example": "ul.list-items li { padding: 5px; }"
                },
                {
                    "selector": ".box",
                    "description": "class가 'box'인 모든 요소를 선택합니다.",
                    "example": ".box { border: 1px solid #ccc; }"
                },
                {
                    "selector": ".box.highlight",
                    "description": "class가 'box'와 'highlight' 둘 다인 요소를 선택합니다.",
                    "example": ".box.highlight { background-color: #ffff00; }"
                },
                {
                    "selector": "#contact-form input",
                    "description": "id가 'contact-form'인 요소 내부의 모든 input 요소를 선택합니다.",
                    "example": "#contact-form input { width: 100%; }"
                },
                {
                    "selector": "input[type='text']",
                    "description": "type 속성이 'text'인 모든 input 요소를 선택합니다.",
                    "example": "input[type='text'] { padding: 5px; }"
                },
                {
                    "selector": "input[required]",
                    "description": "required 속성을 가진 모든 input 요소를 선택합니다.",
                    "example": "input[required] { border-color: red; }"
                },
                {
                    "selector": "textarea",
                    "description": "모든 textarea 요소를 선택합니다.",
                    "example": "textarea { resize: vertical; }"
                },
                {
                    "selector": "button[type='submit']",
                    "description": "type 속성이 'submit'인 모든 button 요소를 선택합니다.",
                    "example": "button[type='submit'] { background-color: green; }"
                },
                {
                    "selector": "footer p",
                    "description": "footer 요소 내부의 모든 p 요소를 선택합니다.",
                    "example": "footer p { font-size: 12px; }"
                },
                {
                    "selector": "section > *",
                    "description": "section의 모든 직접적인 자식 요소를 선택합니다.",
                    "example": "section > * { margin-bottom: 10px; }"
                },
                {
                    "selector": "li:nth-child(odd)",
                    "description": "부모 요소의 홀수 번째 자식인 li 요소를 선택합니다.",
                    "example": "li:nth-child(odd) { background-color: #f0f0f0; }"
                },
                {
                    "selector": ":not(.highlight)",
                    "description": "class가 'highlight'가 아닌 모든 요소를 선택합니다.",
                    "example": ":not(.highlight) { opacity: 0.8; }"
                },
                {
                    "selector": "li:not(:first-of-type)",
                    "description": "첫 번째를 제외한 모든 li 요소를 선택합니다.",
                    "example": "li:not(:first-of-type) { margin-top: 30px; }"
                },
                {
                    "selector": "*",
                    "description": "모든 요소를 선택합니다.",
                    "example": "* { box-sizing: border-box; }"
                },
                {
                    "selector": "h2 ~ p",
                    "description": "h2 요소 뒤에 오는 모든 p 요소를 선택합니다.",
                    "example": "h2 ~ p { color: #666; }"
                },
                {
                    "selector": "[class^='high']",
                    "description": "class 속성이 'high'로 시작하는 모든 요소를 선택합니다.",
                    "example": "[class^='high'] { padding: 10px; }"
                },
                {
                    "selector": "[class$='highlight']",
                    "description": "class 속성이 'highlight'로 끝나는 모든 요소를 선택합니다.",
                    "example": "[class$='highlight'] { border: 2px solid yellow; }"
                },
                {
                    "selector": "[class*='conten']",
                    "description": "class 속성에 'conten'가 포함된 모든 요소를 선택합니다.",
                    "example": "[class*='conten'] { max-width: 1200px; }"
                },
                {
                    "selector": "input[type='email']",
                    "description": "type 속성이 'email'인 모든 input 요소를 선택합니다.",
                    "example": "input[type='email'] { border: 1px solid blue; }"
                },
                {
                    "selector": "section[id='section2']",
                    "description": "id가 'section2'인 section 요소를 선택합니다.",
                    "example": "section[id='section2'] { background-color: #eee; }"
                },
                {
                    "selector": "p[class='highlight']",
                    "description": "class가 'highlight'인 p 요소를 선택합니다.",
                    "example": "p[class='highlight'] { color: green; }"
                },
                {
                    "selector": "header + main",
                    "description": "header 요소 바로 다음에 오는 main 요소를 선택합니다.",
                    "example": "header + main { margin-top: 20px; }"
                },
                {
                    "selector": "main ~ footer",
                    "description": "main 요소 뒤에 오는 모든 footer 요소를 선택합니다.",
                    "example": "main ~ footer { border-top: 1px solid #ccc; }"
                },
                {
                    "selector": "li:nth-child(3)",
                    "description": "부모 요소의 세 번째 자식인 li 요소를 선택합니다.",
                    "example": "li:nth-child(3) { font-weight: bold; }"
                },
                {
                    "selector": "section[id]",
                    "description": "id 속성을 가진 모든 section 요소를 선택합니다.",
                    "example": "section[id] { padding: 10px; }"
                },
                {
                    "selector": "nav ul li a[href$='section3']",
                    "description": "href 속성이 'section3'으로 끝나는 모든 a 요소를 선택합니다.",
                    "example": "a[href$='section3'] { color: orange; }"
                }
            ]
        };

        function adjustEditorMargin() {
            const header = document.querySelector('.fixed-header');
            const editorContainer = document.querySelector('.editor-container');
            const headerHeight = header.offsetHeight;
            editorContainer.style.marginTop = `${headerHeight}px`;
        }

        // 페이지 로드 시 실행
        window.addEventListener('load', adjustEditorMargin);

        // 창 크기 변경 시 실행
        window.addEventListener('resize', adjustEditorMargin);

        document.addEventListener('touchstart', function (event) {
            if (event.touches.length > 1) {
                event.preventDefault();
            }
        }, { passive: false });

        let resizeTimer;
        window.addEventListener('resize', function () {
            document.body.classList.add('resize-animation-stopper');
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                document.body.classList.remove('resize-animation-stopper');
            }, 400);
        });

        document.querySelector('.menu-icon').addEventListener('click', function () {
            const sidePanel = document.querySelector('.side-panel');
            const mainContent = document.querySelector('.main-content');

            sidePanel.classList.toggle('open');
            mainContent.classList.toggle('shrink');

            // 사이드 패널에 셀렉터 예제 추가
            const sidePanelContent = selectorExample.selectors.map(item => `
                <div class="selector-item" data-selector="${item.selector}">
                    <h3>${item.selector}</h3>
                    <p>${item.description}</p>
                </div>
            `).join('');

            sidePanel.innerHTML = `
                <h2>CSS 셀렉터 예제</h2>
                ${sidePanelContent}
            `;

            // 셀렉터 항목에 클릭 이벤트 리스너 추가
            sidePanel.querySelectorAll('.selector-item').forEach(item => {
                item.addEventListener('click', function () {
                    const selector = this.getAttribute('data-selector');
                    const description = this.querySelector('p').textContent;
                    cssSelectorInput.value = selector;
                    promptInput.value = description;
                    cssSelectorInput.dispatchEvent(new Event('input'));
                });
            });

            // 에디터 크기 조정
            // if (editor) {
            //     setTimeout(() => {
            //         editor.layout();
            //     }, 300);
            // }
        });

        let currentRequestId = 0;

        promptInput.addEventListener('keypress', function (event) {
            if (event.key === 'Enter') {
                const prompt = promptInput.value.trim();
                if (prompt) {
                    const requestId = ++currentRequestId;

                    const clockEmojis = ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'];
                    let emojiIndex = 0;

                    function updateLoadingAnimation() {
                        if (requestId !== currentRequestId) return;
                        cssSelectorInput.value = `${clockEmojis[emojiIndex]} 🤖 셀렉터 생성중${'.'.repeat((emojiIndex % 3) + 1)}`;
                        emojiIndex = (emojiIndex + 1) % clockEmojis.length;
                    }

                    let loadingAnimationId = setInterval(updateLoadingAnimation, 100);

                    // 처리 중 글씨색 투명도 설정
                    cssSelectorInput.style.color = 'rgba(255, 255, 255, 0.5)';

                    fetch('https://cokac.com/aiselector', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ prompt: prompt })
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (requestId === currentRequestId) {
                                cssSelectorInput.value = data.selector_string;
                                cssSelectorInput.dispatchEvent(new Event('input'));
                            }
                        })
                        .catch(error => {
                            if (requestId === currentRequestId) {
                                cssSelectorInput.value = '';
                                console.error('요청 처리 중 오류 발생:', error);
                            }
                        })
                        .finally(() => {
                            if (requestId === currentRequestId) {
                                clearInterval(loadingAnimationId);
                                cssSelectorInput.style.color = ''; // 글씨색 원래대로 복원
                            }
                        });
                }
            }
        });
    }
});
