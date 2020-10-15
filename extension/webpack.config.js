const path = require('path');

const { EnvironmentPlugin } = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const package = require('./package.json');

function tagManifestVersion(buffer) {
   const manifest = JSON.parse(buffer.toString());

   manifest.version = package.version.replace(/-.*$/, ''); // removes -beta...

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
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader' },
        ],
      },
    ],
  },
  entry: {
    content_script: './src/content_script/index.js',
    background: './src/background/index.js',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  watchOptions: {
    ignored: ['node_modules/**'],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new EnvironmentPlugin({
      WIKIGAME_SERVER_URL: ''
    }),
    new CopyPlugin({
      patterns: [
        'static',
        {
          from: './manifest.json',
          transform(content, path) {
            return tagManifestVersion(content);
          },
        },
      ],
    }),
  ],
  devtool: process.env.GENERATE_SOURCE_MAP === 'true' ? 'inline-source-map' : false,
};
