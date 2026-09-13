import './site.css';

const copyrightYear = document.getElementById('copyright-year');

if (copyrightYear) {
  copyrightYear.textContent = new Date().getFullYear().toString();
}
