/**
 * Global Time & Exchange Rate Widget
 * 适用环境：任意标准 HTML 页面
 * 特性：无依赖、浅色专业 UI、自动获取真实汇率、本地化时间处理、无 Emoji
 */
(function () {
    // 防止重复加载
    if (document.getElementById('global-info-widget')) return;

    class GlobalInfoWidget {
        constructor() {
            // 免费且无需 API Key 的汇率接口 (基础货币为 USD)
            this.exchangeApi = 'https://open.er-api.com/v6/latest/USD';
            this.rates = {};
            this.isCollapsed = false;

            // 配置国家数据 (时区、货币、flag-icons 的国家代码)
            this.countries = [
                { name: '中国', tz: 'Asia/Shanghai', currency: 'CNY', flag: 'cn' },
                { name: '美国', tz: 'America/New_York', currency: 'USD', flag: 'us' },
                { name: '欧元区', tz: 'Europe/Paris', currency: 'EUR', flag: 'eu' },
                { name: '英国', tz: 'Europe/London', currency: 'GBP', flag: 'gb' },
                { name: '日本', tz: 'Asia/Tokyo', currency: 'JPY', flag: 'jp' }
            ];

            this.init();
        }

        async init() {
            this.injectDependencies();
            this.injectCSS();
            this.renderHTML();
            await this.fetchRates();
            this.startClock();
            this.bindEvents();
        }

        // 注入国旗图标 CSS (基于外部 CDN 的无 Emoji 纯 SVG 方案)
        injectDependencies() {
            if (!document.getElementById('flag-icons-css')) {
                const link = document.createElement('link');
                link.id = 'flag-icons-css';
                link.rel = 'stylesheet';
                link.href = 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.0.0/css/flag-icons.min.css';
                document.head.appendChild(link);
            }
        }

        // 注入专业浅色系 UI 样式
        injectCSS() {
            const style = document.createElement('style');
            style.innerHTML = `
                :root {
                    --gw-bg: rgba(255, 255, 255, 0.85);
                    --gw-border: rgba(230, 235, 240, 0.8);
                    --gw-text-main: #2c3e50;
                    --gw-text-sub: #7f8c8d;
                    --gw-shadow: 0 10px 30px -10px rgba(0, 30, 60, 0.1);
                    --gw-radius: 16px;
                }
                
                #global-info-widget {
                    position: fixed;
                    left: 20px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 280px;
                    background: var(--gw-bg);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid var(--gw-border);
                    border-radius: var(--gw-radius);
                    box-shadow: var(--gw-shadow);
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    z-index: 999999;
                    transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
                    overflow: hidden;
                }

                #global-info-widget.collapsed {
                    transform: translateY(-50%) translateX(calc(-100% - 20px));
                }

                .gw-toggle-btn {
                    position: absolute;
                    right: -40px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: var(--gw-bg);
                    backdrop-filter: blur(12px);
                    border: 1px solid var(--gw-border);
                    border-left: none;
                    width: 40px;
                    height: 50px;
                    border-radius: 0 12px 12px 0;
                    box-shadow: 8px 0 15px -5px rgba(0, 30, 60, 0.05);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                    transition: right 0.4s ease;
                }

                .gw-toggle-btn svg {
                    width: 20px;
                    height: 20px;
                    fill: var(--gw-text-sub);
                    transition: transform 0.3s;
                }

                #global-info-widget.collapsed .gw-toggle-btn {
                    right: -40px;
                }
                #global-info-widget.collapsed .gw-toggle-btn svg {
                    transform: rotate(180deg);
                }

                .gw-header {
                    padding: 16px 20px;
                    border-bottom: 1px solid var(--gw-border);
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--gw-text-main);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .gw-header svg {
                    width: 18px;
                    height: 18px;
                    stroke: #3498db;
                }

                .gw-list {
                    list-style: none;
                    margin: 0;
                    padding: 10px 0;
                }

                .gw-item {
                    display: flex;
                    align-items: center;
                    padding: 12px 20px;
                    transition: background 0.2s ease;
                }

                .gw-item:hover {
                    background: rgba(240, 245, 250, 0.6);
                }

                .gw-flag-wrap {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid #eee;
                    margin-right: 14px;
                    background: #fdfdfd;
                    flex-shrink: 0;
                }

                .gw-flag-wrap .fi {
                    font-size: 32px;
                    line-height: 32px;
                }

                .gw-info {
                    flex-grow: 1;
                    min-width: 0;
                }

                .gw-country-name {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--gw-text-main);
                    margin-bottom: 2px;
                }

                .gw-time {
                    font-size: 12px;
                    color: var(--gw-text-sub);
                    font-variant-numeric: tabular-nums;
                }

                .gw-rate {
                    text-align: right;
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--gw-text-main);
                }
                
                .gw-rate-label {
                    font-size: 10px;
                    color: var(--gw-text-sub);
                    margin-top: 2px;
                }

                .gw-footer {
                    padding: 10px 20px;
                    font-size: 10px;
                    color: #bdc3c7;
                    text-align: center;
                    border-top: 1px solid var(--gw-border);
                    background: rgba(250, 252, 255, 0.5);
                }
            `;
            document.head.appendChild(style);
        }

        renderHTML() {
            const container = document.createElement('div');
            container.id = 'global-info-widget';

            // 侧边折叠按钮
            const toggleBtn = `
                <div class="gw-toggle-btn" id="gw-toggle">
                    <svg viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>
                </div>
            `;

            // 标题
            const header = `
                <div class="gw-header">
                    <svg fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    全球市场时间 & 汇率
                </div>
            `;

            // 列表生成
            const listItems = this.countries.map((c, index) => `
                <div class="gw-item">
                    <div class="gw-flag-wrap">
                        <span class="fi fi-${c.flag}"></span>
                    </div>
                    <div class="gw-info">
                        <div class="gw-country-name">${c.name}</div>
                        <div class="gw-time" id="gw-time-${index}">--:--:--</div>
                    </div>
                    <div class="gw-rate-wrap">
                        <div class="gw-rate" id="gw-rate-${index}">--</div>
                        <div class="gw-rate-label">1 USD = ${c.currency}</div>
                    </div>
                </div>
            `).join('');

            container.innerHTML = `
                ${toggleBtn}
                ${header}
                <div class="gw-list">${listItems}</div>
                <div class="gw-footer">基于实时的本地设备与外汇数据</div>
            `;

            document.body.appendChild(container);
        }

        // 获取汇率数据
        async fetchRates() {
            try {
                const response = await fetch(this.exchangeApi);
                const data = await response.json();
                if (data && data.rates) {
                    this.rates = data.rates;
                    this.updateRatesUI();
                }
            } catch (error) {
                console.error('汇率获取失败:', error);
                this.countries.forEach((_, i) => {
                    document.getElementById(`gw-rate-${i}`).innerText = '离线';
                });
            }
        }

        // 更新汇率显示
        updateRatesUI() {
            this.countries.forEach((c, index) => {
                const rateEl = document.getElementById(`gw-rate-${index}`);
                if (c.currency === 'USD') {
                    rateEl.innerText = '1.00';
                } else if (this.rates[c.currency]) {
                    // 保留两位小数
                    rateEl.innerText = this.rates[c.currency].toFixed(2);
                }
            });
        }

        // 启动时间时钟
        startClock() {
            const updateTime = () => {
                this.countries.forEach((c, index) => {
                    const timeEl = document.getElementById(`gw-time-${index}`);
                    if (timeEl) {
                        const timeString = new Intl.DateTimeFormat('zh-CN', {
                            timeZone: c.tz,
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                        }).format(new Date());
                        timeEl.innerText = timeString;
                    }
                });
            };
            updateTime(); // 立即执行一次
            setInterval(updateTime, 1000); // 每秒刷新
        }

        // 绑定交互事件
        bindEvents() {
            const toggleBtn = document.getElementById('gw-toggle');
            const widget = document.getElementById('global-info-widget');
            
            toggleBtn.addEventListener('click', () => {
                this.isCollapsed = !this.isCollapsed;
                if (this.isCollapsed) {
                    widget.classList.add('collapsed');
                } else {
                    widget.classList.remove('collapsed');
                }
            });
        }
    }

    // 等待 DOM 准备就绪后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new GlobalInfoWidget());
    } else {
        new GlobalInfoWidget();
    }
})();