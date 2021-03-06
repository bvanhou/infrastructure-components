


/**
 * the resolved assets path is the path ot the assets folder in the running environment
 */
export const resolveAssetsPath = (buildPath: string, serverName: string, assetsPath: string) => {
    const path = require('path');

    const resolvedPath = path.resolve(buildPath, serverName, assetsPath);

    return !resolvedPath.endsWith("/") ? resolvedPath+"/" : resolvedPath;
};


export const getStaticBucketName = (accountId: string, stackName: string, assetsPath: string | undefined, stage: string) => {
    return `infrcomp-${accountId}-${stackName}-${assetsPath !== undefined ? assetsPath+"-" : ""}${stage}`;
}


export const getBasename = () => {

    // first check whether we are a client
    if (typeof window != 'undefined' && window.__BASENAME__) {
        return window.__BASENAME__;

    }

    return process.env.STAGE_PATH && process.env.STAGE_PATH !== "undefined" ? "/"+process.env.STAGE_PATH : "/";
};