/**
 * Global Time & Exchange Rate Widget (CNY Base & Compact Version)
 * 特性：增加澳/加、人民币基准、移动端隐藏、紧凑型排版、突出数据弱化标题
 */
(function () {
    if (document.getElementById('global-info-widget')) return;

    class GlobalInfoWidget {
        constructor() {
            // 汇率接口改为以人民币(CNY)为基准
            this.exchangeApi = 'https://open.er-api.com/v6/latest/CNY';
            this.rates = {};
            this.isCollapsed = false;

            // 配置国家数据：增加 unit 属性(用于解决日元等小面值货币的显示习惯)
            this.countries = [
                { name: '中国', tz: 'Asia/Shanghai', currency: 'CNY', flag: 'cn', unit: 1 },
                { name: '美国', tz: 'America/New_York', currency: 'USD', flag: 'us', unit: 1 },
                { name: '加拿大', tz: 'America/Toronto', currency: 'CAD', flag: 'ca', unit: 1 },
                { name: '澳大利亚', tz: 'Australia/Sydney', currency: 'AUD', flag: 'au', unit: 1 },
                { name: '欧元区', tz: 'Europe/Paris', currency: 'EUR', flag: 'eu', unit: 1 },
                { name: '英国', tz: 'Europe/London', currency: 'GBP', flag: 'gb', unit: 1 },
                { name: '日本', tz: 'Asia/Tokyo', currency: 'JPY', flag: 'jp', unit: 100 }
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

        injectDependencies() {
            if (!document.getElementById('flag-icons-css')) {
                const link = document.createElement('link');
                link.id = 'flag-icons-css';
                link.rel = 'stylesheet';
                link.href = 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.0.0/css/flag-icons.min.css';
                document.head.appendChild(link);
            }
        }

        injectCSS() {
            const style = document.createElement('style');
            style.innerHTML = `
                :root {
                    --gw-bg: rgba(255, 255, 255, 0.9);
                    --gw-border: rgba(230, 235, 240, 0.8);
                    --gw-text-main: #1a252f;
                    --gw-text-sub: #95a5a6;
                    --gw-shadow: 0 8px 25px -8px rgba(0, 20, 40, 0.12);
                    --gw-radius: 12px;
                }
                
                #global-info-widget {
                    position: fixed;
                    left: 15px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 220px; /* 减小整体宽度 */
                    background: var(--gw-bg);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid var(--gw-border);
                    border-radius: var(--gw-radius);
                    box-shadow: var(--gw-shadow);
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    z-index: 999999;
                    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                    overflow: hidden;
                }

                /* 移动端自动隐藏 */
                @media (max-width: 768px) {
                    #global-info-widget {
                        display: none !important;
                    }
                }

                #global-info-widget.collapsed {
                    transform: translateY(-50%) translateX(calc(-100% - 15px));
                }

                .gw-toggle-btn {
                    position: absolute;
                    right: -30px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: var(--gw-bg);
                    backdrop-filter: blur(12px);
                    border: 1px solid var(--gw-border);
                    border-left: none;
                    width: 30px;
                    height: 44px;
                    border-radius: 0 10px 10px 0;
                    box-shadow: 6px 0 10px -5px rgba(0,0,0,0.05);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                    transition: right 0.3s ease;
                }

                .gw-toggle-btn svg {
                    width: 16px;
                    height: 16px;
                    fill: var(--gw-text-sub);
                    transition: transform 0.3s;
                }

                #global-info-widget.collapsed .gw-toggle-btn { right: -30px; }
                #global-info-widget.collapsed .gw-toggle-btn svg { transform: rotate(180deg); }

                .gw-header {
                    padding: 12px 14px;
                    border-bottom: 1px solid var(--gw-border);
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--gw-text-main);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(250, 252, 255, 0.6);
                }

                .gw-header svg {
                    width: 16px;
                    height: 16px;
                    stroke: #3498db;
                }

                .gw-list {
                    list-style: none;
                    margin: 0;
                    padding: 6px 0;
                }

                .gw-item {
                    display: flex;
                    align-items: center;
                    padding: 8px 14px; /* 紧凑边距 */
                    transition: background 0.2s ease;
                }

                .gw-item:hover {
                    background: rgba(240, 245, 250, 0.7);
                }

                .gw-flag-wrap {
                    width: 26px; /* 缩小国旗 */
                    height: 26px;
                    border-radius: 50%;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid rgba(0,0,0,0.05);
                    margin-right: 10px;
                    background: #fdfdfd;
                    flex-shrink: 0;
                }

                .gw-flag-wrap .fi {
                    font-size: 26px;
                    line-height: 26px;
                }

                .gw-info {
                    flex-grow: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                }

                /* 弱化国家名称 */
                .gw-country-name {
                    font-size: 11px;
                    color: var(--gw-text-sub);
                    margin-bottom: 1px;
                }

                /* 强化时间 */
                .gw-time {
                    font-size: 15px;
                    font-weight: 700;
                    color: var(--gw-text-main);
                    font-variant-numeric: tabular-nums;
                    letter-spacing: -0.3px;
                }
                
                .gw-rate-wrap {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                }

                /* 强化汇率数字 */
                .gw-rate {
                    font-size: 15px;
                    font-weight: 700;
                    color: var(--gw-text-main);
                    letter-spacing: -0.3px;
                }
                
                /* 弱化汇率标签 */
                .gw-rate-label {
                    font-size: 10px;
                    color: var(--gw-text-sub);
                    margin-top: 1px;
                }
            `;
            document.head.appendChild(style);
        }

        renderHTML() {
            const container = document.createElement('div');
            container.id = 'global-info-widget';

            const toggleBtn = `
                <div class="gw-toggle-btn" id="gw-toggle">
                    <svg viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>
                </div>
            `;

            const header = `
                <div class="gw-header">
                    <svg fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    实时时间与汇率
                </div>
            `;

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
                        <div class="gw-rate-label" id="gw-label-${index}">
                            ${c.currency === 'CNY' ? '人民币基准' : `${c.unit} ${c.currency} = CNY`}
                        </div>
                    </div>
                </div>
            `).join('');

            container.innerHTML = `
                ${toggleBtn}
                ${header}
                <div class="gw-list">${listItems}</div>
            `;

            document.body.appendChild(container);
        }

        async fetchRates() {
            try {
                // 获取以 CNY 为 Base 的汇率字典
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

        updateRatesUI() {
            this.countries.forEach((c, index) => {
                const rateEl = document.getElementById(`gw-rate-${index}`);
                
                if (c.currency === 'CNY') {
                    // 中国本身不显示汇率换算数字
                    rateEl.innerText = '-';
                } else if (this.rates[c.currency]) {
                    // API 返回的是 "1 人民币 = 多少外币"
                    // 所以外币兑换人民币的公式为：(面值 / 外币汇率)
                    const foreignRate = this.rates[c.currency];
                    const valueInCny = (c.unit / foreignRate).toFixed(2);
                    rateEl.innerText = valueInCny;
                }
            });
        }

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
            updateTime();
            setInterval(updateTime, 1000);
        }

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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new GlobalInfoWidget());
    } else {
        new GlobalInfoWidget();
    }
})();
