(() => {
  const nav = document.querySelector('.main-nav');
  const menuButton = document.querySelector('.menu-button');
  const searchButton = document.querySelector('.search-button');
  const searchDialog = document.querySelector('.search-dialog');
  const closeButton = document.querySelector('.dialog-close');
  const searchInput = document.querySelector('#site-search');
  const searchResults = document.querySelector('.search-results');
  let entriesPromise;

  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    });

    nav.addEventListener('click', () => {
      nav.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', '打开菜单');
    });
  }

  if (!searchDialog || !searchButton || !searchInput || !searchResults) return;

  const setStatus = (message) => {
    searchResults.replaceChildren();
    const status = document.createElement('p');
    status.className = 'search-status';
    status.textContent = message;
    searchResults.append(status);
  };

  const loadEntries = async () => {
    if (!entriesPromise) {
      const url = searchDialog.dataset.searchUrl;
      entriesPromise = fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error('Search index unavailable');
          return response.text();
        })
        .then((xml) => {
          const documentNode = new DOMParser().parseFromString(xml, 'application/xml');
          return [...documentNode.querySelectorAll('entry')].map((entry) => ({
            title: entry.querySelector('title')?.textContent?.trim() || '未命名文章',
            url: entry.querySelector('url')?.textContent?.trim() || '#',
            content: entry.querySelector('content')?.textContent?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || ''
          }));
        });
    }
    return entriesPromise;
  };

  const renderResults = async () => {
    const query = searchInput.value.trim().toLocaleLowerCase();
    if (!query) {
      setStatus('输入关键词后开始搜索。');
      return;
    }

    setStatus('正在搜索…');
    try {
      const entries = await loadEntries();
      const matches = entries.filter((entry) => `${entry.title} ${entry.content}`.toLocaleLowerCase().includes(query)).slice(0, 8);
      searchResults.replaceChildren();
      if (!matches.length) {
        setStatus('没有找到匹配的笔记。');
        return;
      }

      matches.forEach((entry) => {
        const link = document.createElement('a');
        const title = document.createElement('strong');
        const summary = document.createElement('span');
        link.className = 'search-result';
        link.href = entry.url;
        title.textContent = entry.title;
        summary.textContent = entry.content.slice(0, 120);
        link.append(title, summary);
        searchResults.append(link);
      });
    } catch {
      setStatus('搜索索引暂时不可用。');
    }
  };

  searchButton.addEventListener('click', () => {
    searchDialog.showModal();
    searchInput.value = '';
    setStatus('输入关键词后开始搜索。');
    searchInput.focus();
  });

  closeButton?.addEventListener('click', () => searchDialog.close());
  searchInput.addEventListener('input', renderResults);
})();
