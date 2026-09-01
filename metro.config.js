const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add WASM support for expo-sqlite on web
config.resolver.assetExts.push('wasm');

// Ensure Zustand resolves to CommonJS to avoid 'import.meta' syntax errors on web / Metro
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
        return {
            filePath: require.resolve(moduleName),
            type: 'sourceFile',
        };
    }
    if (defaultResolveRequest) {
        return defaultResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

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

