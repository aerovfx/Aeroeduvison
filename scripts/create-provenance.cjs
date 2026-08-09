'use strict';

const fs = require('fs');
for (const name of ['GITHUB_REPOSITORY', 'GITHUB_SHA', 'GITHUB_REF', 'GITHUB_WORKFLOW_REF', 'IMAGE', 'DIGEST', 'NODE_IMAGE']) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}
const now = new Date().toISOString();
const predicate = {
  buildType: 'https://mobyproject.org/buildkit@v1',
  builder: { id: 'https://github.com/actions/runner' },
  invocation: {
    configSource: {
      uri: `git+https://github.com/${process.env.GITHUB_REPOSITORY}.git`,
      digest: { sha1: process.env.GITHUB_SHA },
      entryPoint: 'Dockerfile.onprem',
    },
    parameters: {
      platforms: ['linux/amd64', 'linux/arm64'],
      ref: process.env.GITHUB_REF,
      workflow: process.env.GITHUB_WORKFLOW_REF,
      nodeImage: process.env.NODE_IMAGE,
    },
  },
  metadata: { buildStartedOn: now, buildFinishedOn: now, completeness: { parameters: false, environment: false, materials: false }, reproducible: false },
  materials: [
    { uri: `git+https://github.com/${process.env.GITHUB_REPOSITORY}.git`, digest: { sha1: process.env.GITHUB_SHA } },
    { uri: process.env.NODE_IMAGE.split('@')[0], digest: { sha256: process.env.NODE_IMAGE.split('@sha256:')[1] } },
  ],
};
fs.writeFileSync(process.argv[2] || 'provenance.json', `${JSON.stringify(predicate, null, 2)}\n`);
