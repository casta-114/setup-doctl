import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import * as fs from 'fs';

import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';

const toolName = 'doctl';
const latestStableVersion = '1.32.3';
const latestVersionUrl = 'https://api.github.com/repos/digitalocean/doctl/releases/latest';

function getExecutableExtension(): string {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }
    return '';
}

function getDownloadURL(version: string): string {
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

async function download(version: string): Promise<string> {

    let cachedToolpath = toolCache.find(toolName, version);
    let doctlDownloadPath = '';

    if (!cachedToolpath) {

        try {
            doctlDownloadPath = await toolCache.downloadTool(getDownloadURL(version));
        } catch (exception) {
            throw new Error('DownloadDoctlFailed');
        }

        cachedToolpath = await toolCache.cacheFile(doctlDownloadPath, toolName + getExecutableExtension(), toolName, version);
    }

    const doctlPath = path.join(cachedToolpath, toolName + getExecutableExtension());

    fs.chmodSync(doctlPath, '777');

    return doctlPath;
}

async function getLatestVersion(): Promise<string> {
    return toolCache.downloadTool(latestVersionUrl)
        .then((data) => {
            console.log(`console: latest Version data: $data`);
            core.error(`core error: latest Version data: $data`);
            core.info(`core info: latest Version data: $data`);
            core.info(`core debug: latest Version data: $data`);
            return data['tag_name'].slice(1);
        }, error => {
            core.debug(error);
            core.warning('getLatestVersionFailed');
            return latestStableVersion;
        });
}

async function run() {
    let version = core.getInput('version', {'required': true});
    if (version.toLocaleLowerCase() === 'latest') {
        version = await getLatestVersion();
    }

    const cachedPath = await download(version);

    console.log(`doctl tool version: '${version}' has been cached at ${cachedPath}`);

    core.setOutput('doctl-path', cachedPath);
}

run().catch(core.setFailed);
