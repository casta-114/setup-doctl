import * as os from 'os';
import * as https from 'https';

import * as tc from '@actions/tool-cache';
import * as core from '@actions/core';

const toolName = 'doctl';
const latestKnownStableVersion = '1.32.3';

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

async function downloadTool(path: string): Promise<string> {

    core.info(`### Downloading from: ${path}`);

    const downloadPath = await tc.downloadTool(path);

    core.info('### Extracting ...');

    const extractedPath = downloadPath.substr(0, downloadPath.lastIndexOf('/'));
    return process.platform === 'win32'
        ? await tc.extractZip(downloadPath, extractedPath)
        : await tc.extractTar(downloadPath, extractedPath);
}

async function getToolPath(version: string): Promise<string> {

    let toolPath = tc.find(toolName, version);

    if (!toolPath) {
        const downloadPath = await downloadTool(getDownloadURL(version));
        toolPath = await tc.cacheDir(downloadPath, toolName, version);
    }

    return toolPath;
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
            core.warning(`get latest version failed, returning: ${latestKnownStableVersion}`);
            return latestKnownStableVersion;
        });
}

async function run() {

    core.info("### Getting Version ...");

    let version = core.getInput('version', {'required': true});
    if (version.toLocaleLowerCase() === 'latest') {
        version = await getLatestVersion();
    }

    core.info(`version: ${version}`);

    const doctlPath = await getToolPath(version);

    core.addPath(doctlPath);

    core.info(`doctl tool version: '${version}' has been cached at ${doctlPath}`);

    core.setOutput('doctl-path', doctlPath);
}

run().catch(core.setFailed);
