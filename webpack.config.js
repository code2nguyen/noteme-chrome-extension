const path = require('path');

module.exports = function (env, argv) {
  return {
    mode: env.production ? 'production' : 'development',
    entry: './src/background.ts',
    devtool: env.production ? false : 'inline-source-map',
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.background.json',
            },
          },
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
      filename: 'background.js',
      path: path.resolve(__dirname, 'dist', 'noteme-chrome-extension'),
    },
  };
};
