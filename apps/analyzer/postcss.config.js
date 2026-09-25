// CommonJS (not ESM like the sibling apps) because this package has no
// "type": "module" - its prebuild scripts are CommonJS and must stay that way.
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
