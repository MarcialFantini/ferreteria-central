// ScrollTrigger lives in its own chunk: it loads after first paint, with the lazy scenes.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export { ScrollTrigger };
