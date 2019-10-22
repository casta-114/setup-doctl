# Setup doctl

Install a specific version of doctl binary on the runner.

Acceptable values are latest or any semantic version string like 1.15.0.
Use this action in workflow to define which version of doctl will be used.

```yaml
- uses: musagen/setup-doctl@master
  with:
    version: '<version>' # default is 'latest'
    token: '<DigitalOceanToken>' # required
```

Refer to the action metadata file for details about all the inputs https://github.com/musagen/setup-doctl/blob/master/action.yml
