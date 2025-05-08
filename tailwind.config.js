module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx}',
        './src/components/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            textShadow: {
                'lg': '0 2px 10px rgba(0, 0, 0, 0.5)', // Customize as needed
            },
        },
    },
    plugins: [
        require('tailwindcss-textshadow') // If using a plugin
    ],
}