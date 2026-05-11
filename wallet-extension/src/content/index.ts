import './providerBridge';

const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected/provider.js');
script.type = 'module';
(document.head || document.documentElement).appendChild(script);
script.onload = () => script.remove();
