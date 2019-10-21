"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const path = require("path");
const fs = require("fs");
const https = require("https");
const tc = require("@actions/tool-cache");
const core = require("@actions/core");
const toolName = 'doctl';
const latestStableVersion = '1.32.3';
function getExecutableExtension() {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }
    return '';
}
function getDownloadURL(version) {
    switch (os.type()) {
        case 'Linux':
            return `https://github.com/digitalocean/doctl/releases/download/v${version}/doctl-${version}-linux-amd64.tar.gz`;
        case 'Darwin':
            return `https://github.com/digitalocean/doctl/releases/download/v${version}/doctl-${version}-darwin-amd64.tar.gz`;
        case 'Windows_NT':
        default:
            return `https://github.com/digitalocean/doctl/releases/download/v${version}/doctl-${version}-windows-amd64.zip`;
    }
}
function getTool(version) {
    return __awaiter(this, void 0, void 0, function* () {
        let cachedToolPath = tc.find(toolName, version);
        if (!cachedToolPath) {
            const downloadPath = getDownloadURL(version);
            core.info(`### Downloading from: ${downloadPath}`);
            const doctlZippedPath = yield tc.downloadTool(downloadPath);
            let doctlExtractedPath = doctlZippedPath.substr(0, doctlZippedPath.lastIndexOf('/'));
            core.info('### Extracting ...');
            doctlExtractedPath = process.platform === 'win32'
                ? yield tc.extractZip(doctlZippedPath, doctlExtractedPath)
                : yield tc.extractTar(doctlZippedPath, doctlExtractedPath);
            core.info(`### Caching file: ${doctlExtractedPath}`);
            cachedToolPath = yield tc.cacheFile(doctlExtractedPath, toolName + getExecutableExtension(), toolName, version);
        }
        const doctlPath = path.join(cachedToolPath, toolName + getExecutableExtension());
        fs.chmodSync(doctlPath, '777');
        core.info(`doctl-path: ${doctlPath}`);
        return doctlPath;
    });
}
function getLatestVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            https.request({
                method: 'GET',
                port: 443,
                hostname: 'api.github.com',
                path: '/repos/digitalocean/doctl/releases/latest',
                headers: {
                    'User-Agent': 'musagen/setup-doctl'
                }
            }, (res) => {
                const body = [];
                res.on('data', (fragment) => body.push(fragment));
                res.on('end', () => resolve(JSON.parse(Buffer.concat(body).toString())));
                res.on('error', (error) => reject(error));
            }).end();
        })
            .then(json => json['tag_name'].slice(1))
            .catch(error => {
            core.debug(error);
            core.warning('getLatestVersionFailed');
            return latestStableVersion;
        });
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        core.info("### Getting Version ...");
        let version = core.getInput('version', { 'required': true });
        if (version.toLocaleLowerCase() === 'latest') {
            version = yield getLatestVersion();
        }
        core.info(`version: ${version}`);
        const cachedPath = yield getTool(version);
        core.info(`doctl tool version: '${version}' has been cached at ${cachedPath}`);
        core.setOutput('doctl-path', cachedPath);
    });
}
run().catch(core.setFailed);
