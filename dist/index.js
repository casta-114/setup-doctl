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
const util = require("util");
const fs = require("fs");
const toolCache = require("@actions/tool-cache");
const core = require("@actions/core");
const toolName = 'doctl';
const latestStableVersion = '1.32.3';
const latestVersionUrl = 'https://api.github.com/repos/digitalocean/doctl/releases/latest';
function getExecutableExtension() {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }
    return '';
}
function getDownloadURL(version) {
    switch (os.type()) {
        case 'Linux':
            return util.format('https://github.com/digitalocean/doctl/releases/download/v%s/doctl-%s-linux-amd64.tar.gz', version);
        case 'Darwin':
            return util.format('https://github.com/digitalocean/doctl/releases/download/v%s/doctl-%s-darwin-amd64.tar.gz', version);
        case 'Windows_NT':
        default:
            return util.format('https://github.com/digitalocean/doctl/releases/download/v%s/doctl-%s-windows-amd64.zip', version);
    }
}
function download(version) {
    return __awaiter(this, void 0, void 0, function* () {
        let cachedToolpath = toolCache.find(toolName, version);
        let doctlDownloadPath = '';
        if (!cachedToolpath) {
            try {
                doctlDownloadPath = yield toolCache.downloadTool(getDownloadURL(version));
            }
            catch (exception) {
                throw new Error('DownloadDoctlFailed');
            }
            cachedToolpath = yield toolCache.cacheFile(doctlDownloadPath, toolName + getExecutableExtension(), toolName, version);
        }
        const doctlPath = path.join(cachedToolpath, toolName + getExecutableExtension());
        fs.chmodSync(doctlPath, '777');
        return doctlPath;
    });
}
function getLatestVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        return toolCache.downloadTool(latestVersionUrl)
            .then((data) => {
            console.log(`latest Version data: $data`);
            return data['tag_name'].slice(1);
        }, error => {
            core.debug(error);
            core.warning('getLatestVersionFailed');
            return latestStableVersion;
        });
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let version = core.getInput('version', { 'required': true });
        if (version.toLocaleLowerCase() === 'latest') {
            version = yield getLatestVersion();
        }
        const cachedPath = yield download(version);
        console.log(`doctl tool version: '${version}' has been cached at ${cachedPath}`);
        core.setOutput('doctl-path', cachedPath);
    });
}
run().catch(core.setFailed);
