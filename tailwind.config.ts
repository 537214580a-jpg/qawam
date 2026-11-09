import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: { colors: { qawam: { 950: '#0B2E1F', 700: '#136640', 500: '#1FA971', 100: '#DDF5E9', 50: '#F6FAF8' } }, fontFamily: { tajawal: ['var(--font-tajawal)', 'sans-serif'] }, boxShadow: { soft: '0 12px 32px rgba(11,46,31,.08)' } } },
  plugins: []
};
export default config;
