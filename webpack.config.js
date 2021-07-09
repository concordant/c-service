const path = require("path"); // eslint-disable-line

module.exports = {
  entry: "./src/c-service-worker.js",
  mode: "production",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "c-service-worker.js",
    path: path.resolve(__dirname, "dist"),
  },
};
