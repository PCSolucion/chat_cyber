/**
 * Holo Effect Module
 * Replicates the Pokemon Card Holo Effect for achievement cards.
 * Inspired by: https://codepen.io/simeydotme/pen/PrQKgo
 */
const HoloEffect = (function () {

    let x; // Timeout variable

    /**
     * Initialize Holo Effect on all cards
     */
    function init() {
        const cards = document.querySelectorAll('.achievement-card');

        cards.forEach(card => {
            // Remove existing listeners to avoid duplicates if re-initialized
            card.removeEventListener('mousemove', handleMouseMove);
            card.removeEventListener('touchmove', handleTouchMove);
            card.removeEventListener('mouseout', handleMouseOut);
            card.removeEventListener('touchend', handleMouseOut);
            card.removeEventListener('touchcancel', handleMouseOut);

            // Add new listeners
            card.addEventListener('mousemove', handleMouseMove);
            card.addEventListener('touchmove', handleTouchMove, { passive: false });
            card.addEventListener('mouseout', handleMouseOut);
            card.addEventListener('touchend', handleMouseOut);
            card.addEventListener('touchcancel', handleMouseOut);
        });
    }

    /**
     * Handle mouse move
     */
    function handleMouseMove(e) {
        processMove(this, e.offsetX, e.offsetY);
    }

    /**
     * Handle touch move
     */
    function handleTouchMove(e) {
        if (e.preventDefault) e.preventDefault();

        const rect = this.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        processMove(this, x, y);
    }

    /**
     * Process movement calculations
     */
    function processMove(card, mouseX, mouseY) {
        // Dimensions
        const h = card.offsetHeight;
        const w = card.offsetWidth;

        // Normalized position (0-100)
        // px = % position X from center (0-100 range roughly, transformed to -50 to 50)
        // The original logic:
        // var px = Math.abs(Math.floor(100 / w * l)-100);

        const px = Math.abs(Math.floor(100 / w * mouseX) - 100);
        const py = Math.abs(Math.floor(100 / h * mouseY) - 100);

        const pa = (50 - px) + (50 - py);

        // Gradient & Background positions
        const lp = (50 + (px - 50) / 1.5);
        const tp = (50 + (py - 50) / 1.5);

        const px_spark = (50 + (px - 50) / 7);
        const py_spark = (50 + (py - 50) / 7);

        const p_opc = 20 + (Math.abs(pa) * 1.5);

        // REMOVED 3D ROTATION CALCULATIONS
        // const ty = ((tp - 50) / 2) * -1;
        // const tx = ((lp - 50) / 1.5) * 0.5;

        // Apply styles via CSS Variables
        card.style.setProperty('--grad-pos', `${lp}% ${tp}%`);
        card.style.setProperty('--sprk-pos', `${px_spark}% ${py_spark}%`);
        card.style.setProperty('--holo-opacity', p_opc / 100);

        // Transform REMOVED
        // card.style.transform = `rotateX(${ty}deg) rotateY(${tx}deg)`;

        // Classes
        card.classList.remove('animated');
        card.classList.add('active');

        // Clear timeout
        if (x) clearTimeout(x);
    }

    /**
     * Handle mouse/touch end
     */
    function handleMouseOut() {
        const card = this;

        // Reset styles properly
        card.style.removeProperty('--grad-pos');
        card.style.removeProperty('--sprk-pos');
        card.style.removeProperty('--holo-opacity');
        // card.style.transform = ''; // Clear transform to let CSS reset it

        card.classList.remove('active');

        // Optional: Re-add animated class after a delay if you want an idle animation
        // x = setTimeout(() => {
        //    card.classList.add('animated');
        // }, 2500);
    }

    return {
        init
    };

})();
