const path = require('path');
const pkg = require('./package.json');

const cwd = process.cwd();

module.exports = {
    apps: [
        {
            cwd,
            name: pkg.name,
            script: path.join(cwd, pkg.main),
        }
    ]
}
