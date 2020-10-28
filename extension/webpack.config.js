const path = require('path');

const { EnvironmentPlugin } = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const package = require('./package.json');

function processManifest(buffer) {
  const manifest = JSON.parse(buffer.toString());

  manifest.version = package.version.replace(/-.*$/, ''); // removes -beta...

  if (process.env.FIREFOX) {
    if (manifest.permissions.includes('declarativeContent')) {
      manifest.permissions = manifest.permissions.filter(
        (p) => p !== 'declarativeContent'
      );
      manifest.permissions.push('tabs');
    }
  }

  return JSON.stringify(manifest, null, 2);
}

module.exports = {
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: { loader: 'babel-loader' },
      },
      {
        test: /\.css$/,
        use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
      },
    ],
  },
  entry: {
    content_script: './src/content_script/index.js',
    background: './src/background/index.js',
    popup: './src/popup/popup.js',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, process.env.FIREFOX ? 'dist-ff' : 'dist'),
  },
  watchOptions: {
    ignored: ['node_modules/**'],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new EnvironmentPlugin({
      WIKIGAME_SERVER_URL: 'https://wikigame-multiplayer.herokuapp.com',
      FIREFOX: '',
    }),
    new CopyPlugin({
      patterns: [
        {
          from: 'src/images',
          to: 'images',
        },
        {
          from: 'src/popup/popup.html',
          to: 'popup.html',
        },
        {
          from: 'src/popup/popup.css',
          to: 'popup.css',
        },
        {
          from: 'src/ctrlf.js',
          to: '.',
        },
        {
          from: './src/manifest.json',
          transform(content, path) {
            return processManifest(content);
          },
        },
      ],
    }),
  ],
  devtool:
    process.env.GENERATE_SOURCE_MAP === 'true' ? 'inline-source-map' : false,
};
