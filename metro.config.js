const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add WASM support for expo-sqlite on web
config.resolver.assetExts.push('wasm');

// Workaround for expo-sqlite web support
config.server = {
    ...config.server,
    enhanceMiddleware: (middleware) => {
        return (req, res, next) => {
            // Add proper headers for WASM files
            if (req.url.endsWith('.wasm')) {
                res.setHeader('Content-Type', 'application/wasm');
            }
            return middleware(req, res, next);
        };
    },
};

module.exports = config;
