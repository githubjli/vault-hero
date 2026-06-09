document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================================
  // STICKY NAVBAR
  // ==========================================================================
  const navbar = document.getElementById('navbar');
  const handleScroll = () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', handleScroll);
  handleScroll(); // Initial check on load

  // ==========================================================================
  // MOBILE MENU TOGGLE
  // ==========================================================================
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const navLinks = document.getElementById('nav-links');
  
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      
      // Animate hamburger button
      const spans = menuToggle.querySelectorAll('span');
      if (navLinks.classList.contains('active')) {
        spans[0].style.transform = 'rotate(45deg) translate(6px, 6px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
        navLinks.style.display = 'flex';
        navLinks.style.flexDirection = 'column';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '80px';
        navLinks.style.left = '0';
        navLinks.style.width = '100%';
        navLinks.style.background = 'rgba(6, 6, 8, 0.95)';
        navLinks.style.backdropFilter = 'blur(20px)';
        navLinks.style.padding = '2rem';
        navLinks.style.borderBottom = '1px solid var(--gold-border)';
      } else {
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
        navLinks.style.display = '';
      }
    });
  }

  // ==========================================================================
  // HERO 3D COIN — handled by hero.js (Three.js + GSAP + tsParticles).
  // The mouse-tilt that used to live here is superseded; see hero.js.
  // ==========================================================================

  // ==========================================================================
  // CALCULATOR CONVERSION LOGIC
  // ==========================================================================
  const fiatInput = document.getElementById('fiat-input');
  const goldInput = document.getElementById('gold-input');
  const resGrams = document.getElementById('res-grams');
  const resOz = document.getElementById('res-oz');
  const resBalance = document.getElementById('res-balance');

  // Gold price per gram in SGD (mock rate)
  const GOLD_PRICE_SGD_PER_GRAM = 105.50;
  // Grams to Troy Ounce constant
  const GRAMS_TO_TROY_OZ = 0.0321507466;

  const calculateConversion = () => {
    const fiatVal = parseFloat(fiatInput.value) || 0;
    
    // Calculate grams
    const grams = fiatVal / GOLD_PRICE_SGD_PER_GRAM;
    
    // Calculate troy oz
    const troyOz = grams * GRAMS_TO_TROY_OZ;

    // Update calculator outputs
    goldInput.value = grams.toFixed(4);
    resGrams.textContent = `${grams.toFixed(2)} g`;
    resOz.textContent = `${troyOz.toFixed(4)} oz`;
    resBalance.textContent = `${grams.toFixed(4)} GOLD-BGV`;
  };

  if (fiatInput) {
    fiatInput.addEventListener('input', calculateConversion);
    calculateConversion(); // Initial run on startup
  }
});
