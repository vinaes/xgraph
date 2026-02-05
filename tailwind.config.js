/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'node-inbound': '#22c55e',
        'node-routing': '#3b82f6',
        'node-balancer': '#a855f7',
        'node-terminal': '#ef4444',
        'node-proxy': '#f97316',
      },
    },
  },
  plugins: [],
}
