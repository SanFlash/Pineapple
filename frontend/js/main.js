// Main entry point for frontend logic

document.addEventListener('DOMContentLoaded', () => {
    console.log('Welcome to Pineapple 🍍');

    // Basic GSAP animation for hero
    if (typeof gsap !== 'undefined') {
        gsap.from("h1", { duration: 1, y: 50, opacity: 0, ease: "power3.out", delay: 0.2 });
        gsap.from("p", { duration: 1, y: 30, opacity: 0, ease: "power3.out", delay: 0.4 });
        gsap.from("button", { duration: 1, y: 30, opacity: 0, ease: "power3.out", delay: 0.6, stagger: 0.1 });
        gsap.from(".max-w-5xl", { duration: 1.5, y: 50, opacity: 0, ease: "power3.out", delay: 0.8 });
    }
});
