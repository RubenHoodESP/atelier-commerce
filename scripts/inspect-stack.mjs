// Registry evidence only. No credentials, private registries or environment dumps.
const packages = {
  '@alokai/connect': '2.5.2',
  next: '16.4.6', react: '19.3.1', 'react-dom': '19.3.1',
  typescript: '7.0.2', tailwindcss: '4.3.5',
  '@tailwindcss/postcss': '4.3.5',
  express: '4.22.3', 'body-parser': '1.20.9',
  vitest: '5.1.0', '@playwright/test': '1.65.1',
};
const results = await Promise.all(Object.entries(packages).map(async ([name, version]) => {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/${version}`, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) return { name, requested: version, status: response.status };
  const data = await response.json();
  return {
    name, version: data.version, status: response.status, license: data.license,
    engines: data.engines, exports: name === '@alokai/connect' ? data.exports : undefined,
    dependencies: name === '@alokai/connect' ? data.dependencies : undefined,
    peerDependencies: data.peerDependencies,
  };
}));
console.log('STACK_REPORT_START');
console.log(JSON.stringify({ node: process.version, checkedAt: new Date().toISOString(), packages: results }));
console.log('STACK_REPORT_END');
if (results.some(result => result.status !== 200)) process.exitCode = 1;
