import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';

import * as tc from '@actions/tool-cache';
import * as core from '@actions/core';

const toolName = 'doctl';
const latestStableVersion = '1.32.3';

function getExecutableExtension(): string {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }
    return '';
}

function getDownloadURL(version: string): string {
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

async function getTool(version: string): Promise<string> {

    let cachedToolPath = tc.find(toolName, version);
    if (!cachedToolPath) {
        const downloadPath = getDownloadURL(version);
        core.info(`### Downloading from: ${downloadPath}`);
        const doctlZippedPath = await tc.downloadTool(downloadPath);
        let doctlExtractedPath = doctlZippedPath.substr(0, doctlZippedPath.lastIndexOf('/'));

        core.info('### Extracting ...');
        doctlExtractedPath = process.platform === 'win32'
            ? await tc.extractZip(doctlZippedPath, doctlExtractedPath)
            : await tc.extractTar(doctlZippedPath, doctlExtractedPath);

        core.info(`### Caching file: ${doctlExtractedPath}`);
        cachedToolPath = await tc.cacheFile(doctlExtractedPath, toolName + getExecutableExtension(), toolName, version);
    }

    const doctlPath = path.join(cachedToolPath, toolName + getExecutableExtension());

    fs.chmodSync(doctlPath, '777');

    core.info(`doctl-path: ${doctlPath}`);
    return doctlPath;
}

async function getLatestVersion(): Promise<string> {
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
}

async function run() {
    core.info("### Getting Version ...");
    let version = core.getInput('version', {'required': true});
    if (version.toLocaleLowerCase() === 'latest') {
        version = await getLatestVersion();
    }

    core.info(`version: ${version}`);
    const cachedPath = await getTool(version);

    core.info(`doctl tool version: '${version}' has been cached at ${cachedPath}`);

    core.setOutput('doctl-path', cachedPath);
}

run().catch(core.setFailed);
