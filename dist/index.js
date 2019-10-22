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
const https = require("https");
const tc = require("@actions/tool-cache");
const core = require("@actions/core");
const toolName = 'doctl';
const latestKnownStableVersion = '1.32.3';
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
function downloadTool(path) {
    return __awaiter(this, void 0, void 0, function* () {
        core.info(`### Downloading from: ${path}`);
        const downloadPath = yield tc.downloadTool(path);
        core.info('### Extracting ...');
        const extractedPath = downloadPath.substr(0, downloadPath.lastIndexOf('/'));
        return process.platform === 'win32'
            ? yield tc.extractZip(downloadPath, extractedPath)
            : yield tc.extractTar(downloadPath, extractedPath);
    });
}
function getToolPath(version) {
    return __awaiter(this, void 0, void 0, function* () {
        let toolPath = tc.find(toolName, version);
        if (!toolPath) {
            const downloadPath = yield downloadTool(getDownloadURL(version));
            toolPath = yield tc.cacheDir(downloadPath, toolName, version);
        }
        return toolPath;
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
            core.warning(`get latest version failed, returning: ${latestKnownStableVersion}`);
            return latestKnownStableVersion;
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
        const doctlPath = yield getToolPath(version);
        core.addPath(doctlPath);
        core.info(`doctl tool version: '${version}' has been cached at ${doctlPath}`);
        core.setOutput('doctl-path', doctlPath);
    });
}
run().catch(core.setFailed);
