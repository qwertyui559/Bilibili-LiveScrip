// ==UserScript==
// @name         Bilibili Dammu
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  自动发送弹幕+自动点赞双功能脚本
// @author       嘉慕彤冰
// @match        https://live.bilibili.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      api.live.bilibili.com
// ==/UserScript==

(function () {
    'use strict';

    let likeCount = 0;

    // ===== 自动点赞功能开始 =====
    const getRoomId = () => {
        const path = window.location.pathname.split("/");
        return path.find(item => /^\d+$/.test(item)) || 0;
    };

    const clickLike = () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", repeat: true }));
        likeCount++;
        document.getElementById('like-count').textContent = `点赞: ${likeCount}`;
    };

    let intervalId = null;
    let isRunning = false;

    const toggleAutoLike = () => {
        if (isRunning) {
            clearInterval(intervalId);
            isRunning = false;
            document.getElementById('autoLikeSwitch').textContent = '启动自动点赞';
            document.getElementById('autoLikeSwitch').style.background = '#4CAF50';
        } else {
            const config = { delay: 2000 };
            intervalId = setInterval(clickLike, config.delay);
            isRunning = true;
            document.getElementById('autoLikeSwitch').textContent = '停止自动点赞';
            document.getElementById('autoLikeSwitch').style.background = 'red';
        }
    };
    // ===== 自动点赞功能结束 =====

    function logDebug(message) {
        console.log(`[Bilibili Auto Danmu] ${message}`);
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function getInputBox() { return document.querySelector('.chat-input-ctnr textarea'); }
    function getSendButton() { return document.querySelector('.right-action button'); }

    let isAutoDanmuEnabled = false;
    let danmuCount = 0;
    let currentMessageIndex = 0;
    let isUIHidden = true;
    let sendInterval = 5000;

    const createUI = () => {
        const uiDiv = document.createElement('div');
        uiDiv.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            opacity: 0.95;
            background: white;
            padding: 10px;
            border: 1px solid red;
            border-radius: 10px;
            z-index: 9999;
            color: black;
            min-width: 250px;
            box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
            display: none;
        `;

        // 计数器容器
        const counterContainer = document.createElement('div');
        counterContainer.style.display = 'flex';
        counterContainer.style.justifyContent = 'space-around';
        counterContainer.style.marginBottom = '10px';

        // 弹幕计数器
        const countSpan = document.createElement('div');
        countSpan.id = 'danmu-count';
        countSpan.textContent = `弹幕: 0`;
        counterContainer.appendChild(countSpan);

        // 点赞计数器
        const likeSpan = document.createElement('div');
        likeSpan.id = 'like-count';
        likeSpan.textContent = `点赞: 0`;
        counterContainer.appendChild(likeSpan);

        uiDiv.appendChild(counterContainer);

        // 隐藏按钮
        const hideButton = document.createElement('button');
        hideButton.textContent = '隐藏';
        hideButton.style.cssText = `
            background: orange; 
            color: white;
            border: none;
            font-size: 14px;
            border-radius: 5px;
            padding: 5px 10px;
            cursor: pointer;
            width: 100%;
            margin-bottom: 10px;
        `;
        hideButton.onclick = () => {
            isUIHidden = !isUIHidden;
            if (isUIHidden) {
                uiDiv.style.display = 'none';
                showHideButton.style.display = 'block';
            } else {
                uiDiv.style.display = 'block';
                showHideButton.style.display = 'none';
            }
        };
        uiDiv.appendChild(hideButton);

        // 自动点赞按钮
        const likeButton = document.createElement('button');
        likeButton.id = 'autoLikeSwitch';
        likeButton.textContent = '启动自动点赞';
        likeButton.style.cssText = `
            background: #4CAF50; 
            color: white;
            border: none;
            font-size: 14px;
            border-radius: 5px;
            padding: 5px 10px;
            cursor: pointer;
            width: 100%;
            margin-bottom: 10px;
            transition: background 0.3s;
        `;
        likeButton.onclick = toggleAutoLike;
        uiDiv.appendChild(likeButton);

        // 自动发送弹幕开关按钮
        const toggleButton = document.createElement('button');
        toggleButton.textContent = '自动发送弹幕开启';
        toggleButton.style.cssText = `
            background: blue;
            color: white;
            border: none;
            font-size: 14px;
            border-radius: 5px;
            padding: 5px 10px;
            cursor: pointer;
            width: 100%;
            margin-bottom: 10px;
        `;
        toggleButton.addEventListener('click', () => {
            isAutoDanmuEnabled = !isAutoDanmuEnabled;
            if (isAutoDanmuEnabled) {
                toggleButton.textContent = '自动发送弹幕关闭';
                toggleButton.style.background = 'red';
                sendDanmuCycle();
            } else {
                toggleButton.textContent = '自动发送弹幕开启';
                toggleButton.style.background = 'blue';
            }
            logDebug(`自动弹幕发送${isAutoDanmuEnabled ? '开启' : '关闭'}`);
        });
        uiDiv.appendChild(toggleButton);

        // 动态输入列表容器
        const inputContainer = document.createElement('div');
        inputContainer.id = 'danmu-input-container';
        inputContainer.style.marginTop = '5px';

        const addNewRow = () => {
            const row = document.createElement('div');
            row.style.marginBottom = '5px';
            row.style.display = 'flex';
            row.style.alignItems = 'center';

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'danmu-input';
            input.style.flex = '1';
            input.style.marginRight = '5px';
            input.style.padding = '3px';
            input.style.textAlign = 'center';
            input.style.backgroundColor = '#f0f0f0';
            input.style.color = 'black';
            input.style.border = '1px solid #ccc';
            input.style.borderRadius = '3px';
            input.placeholder = '弹幕';
            input.value = '弹幕';

            const addBtn = document.createElement('button');
            addBtn.textContent = '添加';
            addBtn.style.cssText = `
                background: blue; 
                color: white;
                border: none;
                font-size: 12px;
                border-radius: 3px;
                padding: 2px 8px;
                cursor: pointer;
            `;
            addBtn.onclick = () => {
                const newRow = addNewRow();
                inputContainer.insertBefore(newRow, row.nextSibling);
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '删除';
            deleteBtn.style.cssText = `
                background: red;
                color: white;
                border: none;
                font-size: 12px;
                border-radius: 3px;
                padding: 2px 8px;
                cursor: pointer;
                margin-left: 5px;
            `;
            deleteBtn.onclick = () => {
                const inputCount = inputContainer.childNodes.length;
                if (inputCount > 1) {
                    inputContainer.removeChild(row);
                } else {
                    alert('至少需要保留一个弹幕输入项，不可以删除。');
                }
            };

            row.appendChild(input);
            row.appendChild(addBtn);
            row.appendChild(deleteBtn);
            inputContainer.appendChild(row);
            return row;
        };

        addNewRow();
        uiDiv.appendChild(inputContainer);

        // 发送间隔输入框
        const intervalRow = document.createElement('div');
        intervalRow.style.marginTop = '10px';
        intervalRow.style.display = 'flex';
        intervalRow.style.alignItems = 'center';

        const unitRow = document.createElement('div');
        unitRow.style.marginTop = '5px';
        unitRow.style.textAlign = 'center';
        unitRow.textContent = '发送间隔单位为秒（最短间隔应该是5秒）';
        uiDiv.appendChild(unitRow);

        const intervalInput = document.createElement('input');
        intervalInput.type = 'number';
        intervalInput.value = sendInterval / 1000;
        intervalInput.style.flex = '1';
        intervalInput.style.textAlign = 'center';
        intervalInput.style.marginRight = '5px';
        intervalInput.style.padding = '3px';
        intervalInput.style.backgroundColor = '#f0f0f0';
        intervalInput.style.color = 'black';
        intervalInput.style.border = '1px solid #ccc';
        intervalInput.style.borderRadius = '3px';

        intervalInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (!isNaN(value)) {
                sendInterval = value * 1000;
            }
        });

        intervalRow.appendChild(intervalInput);
        uiDiv.appendChild(intervalRow);

        // 显示隐藏的圆形球按钮
        const showHideButton = document.createElement('button');
        showHideButton.textContent = 'Ⓐ';
        showHideButton.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            width: 50px;
            height: 50px;
            background: orange; 
            color: black;
            border: none;
            border-radius: 50%;
            font-size: 14px;
            text-align: center;
            line-height: 50px;
            cursor: pointer;
            z-index: 9999;
            display: block;
        `;
        showHideButton.onclick = () => {
            isUIHidden = false;
            uiDiv.style.display = 'block';
            showHideButton.style.display = 'none';
        };
        document.body.appendChild(showHideButton);

        document.body.appendChild(uiDiv);
    };

    const getDanmuMessages = () => {
        const messages = Array.from(document.querySelectorAll('.danmu-input'))
           .map(input => input.value.trim())
           .filter(msg => msg);
        return messages.length > 0 ? messages : ['弹幕'];
    };

    async function sendDanmuCycle() {
        while (isAutoDanmuEnabled) {
            const inputBox = getInputBox();
            const sendButton = getSendButton();
            const messages = getDanmuMessages();

            if (inputBox && sendButton && messages.length > 0) {
                const message = messages[currentMessageIndex % messages.length];
                currentMessageIndex++;

                inputBox.value = message;
                inputBox.dispatchEvent(new Event('input'));
                sendButton.click();

                danmuCount++;
                document.getElementById('danmu-count').textContent =
                    `弹幕: ${danmuCount}`;
                logDebug(`已发送弹幕: ${message}`);
            }
            await sleep(sendInterval);
        }
    }

    const observer = new MutationObserver(() => {
        if (getInputBox() && getSendButton()) {
            observer.disconnect();
            createUI();
        }
    });
    observer.observe(document.body, { subtree: true, childList: true });
})();