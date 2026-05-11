window.addEventListener('message', async (event) => {
  if (event.source !== window || event.data?.target !== 'catshit-wallet-content') return;

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CATSHIT_PROVIDER_REQUEST',
      id: event.data.id,
      method: event.data.method,
      params: event.data.params,
    });

    window.postMessage({ target: 'catshit-wallet-injected', id: event.data.id, ...response }, '*');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    window.postMessage({
      target: 'catshit-wallet-injected',
      id: event.data.id,
      ok: false,
      error: {
        message,
        code: 4001,
      },
    }, '*');
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'CATSHIT_PROVIDER_EVENT') return;
  window.postMessage({ target: 'catshit-wallet-notify', ...message }, '*');
});
