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
`.trim();

document.addEventListener('DOMContentLoaded', function () {
    const cssSelectorInput = document.getElementById('css-selector-input');
    const codeEditorElement = document.getElementById('code-editor');

    // 개행 문자를 \n으로 통일
    const normalizedSampleHTML = sampleHTML.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    let codeEditor = new EditorView({
        extensions: [basicSetup, xml(), highlightField, oneDark], // 테마 추가
        parent: codeEditorElement
    });

    // 초기 코드 설정
    codeEditor.dispatch({
        changes: { from: 0, to: codeEditor.state.doc.length, insert: normalizedSampleHTML }
    });

    // 이벤트 리스너 등록
    cssSelectorInput.addEventListener('input', updateCodeHighlighting);
    codeEditor.dom.addEventListener('input', updateCodeHighlighting);

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
                cssSelectorInput.style.color = 'red';

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
            const saturation = Math.floor(Math.random() * 30) + 60; // 60-90% 사이의 채도
            const lightness = Math.floor(Math.random() * 10) + 85; // 85-95% 사이의 명도
            color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        } while (usedColors.has(color));
        usedColors.add(color);
        return color;
    }

    // 초기 하이라이트 업데이트
    updateCodeHighlighting();
});
