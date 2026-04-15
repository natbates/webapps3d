const isPage = window.location.pathname.includes('/pages/');
const rootPath = isPage ? '../' : './';

const navLinks = [
  { href: `${rootPath}index.html`, label: 'Home' },
  { href: isPage ? 'products.html' : 'pages/products.html', label: 'Products' },
  { href: isPage ? 'about.html' : 'pages/about.html', label: 'About' },
  { href: isPage ? 'statement.html' : 'pages/statement.html', label: 'Statement' },
  { href: isPage ? 'references.html' : 'pages/references.html', label: 'References' },
];

function createNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const isProductDetailPage = currentPage.startsWith('product-') || currentPage === 'product.html';
  const navItems = navLinks
    .map((link) => {
      const linkPage = link.href.split('/').pop();
      const isActive = linkPage === currentPage || (isProductDetailPage && linkPage === 'products.html');
      return `<a href="${link.href}" class="${isActive ? 'active' : ''}">${link.label}</a>`;
    })
    .join('');

  return `
    <header class="site-header">
      <div class="brand">
          <img src="${rootPath}assets/icon.svg" alt="Generic Furniture Company" class="brand-mark-icon" />
        <span class="brand-text">
          <span class="logo">Generic Furniture Company</span>
        </span>
      </div>
      <nav>
        ${navItems}
        <a href="https://github.com/" target="_blank" rel="noreferrer" class="icon-link" aria-label="GitHub">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.16 6.84 9.49.5.09.66-.22.66-.48 0-.24-.01-.87-.01-1.7-2.78.6-3.37-1.34-3.37-1.34-.45-1.14-1.1-1.45-1.1-1.45-.9-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.95 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02A9.58 9.58 0 0112 6.8c.85.004 1.71.11 2.51.32 1.9-1.29 2.74-1.02 2.74-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.86 0 1.34-.01 2.42-.01 2.74 0 .27.16.58.67.48A10 10 0 0022 12c0-5.52-4.48-10-10-10z"/>
          </svg>
        </a>
      </nav>
    </header>
  `;
}

function createFooter() {
  return `
    <footer class="site-footer footer-full">
      <div class="footer-simple">
        <span>&copy; ${new Date().getFullYear()} Generic Furniture Company</span>
      </div>
    </footer>
  `;
}

function injectSharedLayout() {
  const navContainer = document.getElementById('shared-nav');
  const footerContainer = document.getElementById('shared-footer');

  if (navContainer) {
    navContainer.innerHTML = createNav();
  }
  if (footerContainer) {
    footerContainer.innerHTML = createFooter();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectSharedLayout);
} else {
  injectSharedLayout();
}
