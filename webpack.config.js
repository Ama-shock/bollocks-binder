const path = require('path');

module.exports = {
    entry: {
        bollocks: './src/Bollocks.ts'
    },
    output: {
        path: path.join(__dirname, 'docs'),
        filename: 'latest/[name].js'
    },
    resolve: {
        extensions: [
            '.ts', '.js'
        ]
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                loader: 'ts-loader'
            }
        ]
    },
    optimization: {
        minimize: true
    },
    devServer: {
        contentBase: path.resolve(__dirname, "docs"),
        host: 'localhost',
        disableHostCheck: true
    }
};