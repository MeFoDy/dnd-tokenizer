module.exports = {
    globDirectory: 'dist/',
    globPatterns: ['**/*.{png,html,css,js}'],
    swDest: 'dist/sw.js',
    ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
    cleanupOutdatedCaches: true,
	sourcemap: false,
};
